"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface WebRTCConfig {
  roomCode: string;
  userId: string;
  isHost: boolean;
}

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useWebRTC({ roomCode, userId, isHost }: WebRTCConfig) {
  const [state, setState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Initialize media
  const startMedia = useCallback(async () => {
    // Check if secure context (HTTPS or localhost)
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setState(prev => ({ 
        ...prev, 
        error: "Kamera memerlukan HTTPS. Gunakan localhost atau deploy ke server dengan HTTPS." 
      }));
      return null;
    }

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState(prev => ({ 
        ...prev, 
        error: "Browser tidak mendukung akses kamera/mikrofon" 
      }));
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }, // Front camera on mobile
        audio: true,
      });
      localStreamRef.current = stream;
      setState(prev => ({ ...prev, localStream: stream, error: null }));
      return stream;
    } catch (err) {
      console.error("Failed to get media:", err);
      
      let errorMessage = "Gagal mengakses kamera/mikrofon";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage = "Akses kamera/mikrofon ditolak. Izinkan di pengaturan browser.";
        } else if (err.name === "NotFoundError") {
          errorMessage = "Kamera atau mikrofon tidak ditemukan";
        } else if (err.name === "NotReadableError") {
          errorMessage = "Kamera sedang digunakan aplikasi lain";
        } else if (err.name === "OverconstrainedError") {
          errorMessage = "Kamera tidak mendukung pengaturan yang diminta";
        }
      }
      
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  // Stop media
  const stopMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setState(prev => ({ ...prev, localStream: null }));
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("Received remote track");
      setState(prev => ({ ...prev, remoteStream: event.streams[0] }));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            candidate: event.candidate,
            senderId: userId,
          },
        });
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setState(prev => ({ ...prev, isConnected: false, error: "Koneksi terputus" }));
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [userId]);

  // Start connection (host creates offer)
  const startConnection = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    // Get media first
    await startMedia();

    // Create peer connection
    const pc = createPeerConnection();

    // Setup signaling channel
    const supabase = createClient();
    const channel = supabase.channel(`webrtc-${roomCode}`, {
      config: { broadcast: { self: false } }
    });

    // Handle incoming signaling messages
    channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
      if (payload.senderId !== userId && peerConnectionRef.current) {
        console.log("Received offer");
        await peerConnectionRef.current.setRemoteDescription(payload.offer);
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        
        channel.send({
          type: "broadcast",
          event: "answer",
          payload: { answer, senderId: userId }
        });
      }
    });

    channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
      if (payload.senderId !== userId && peerConnectionRef.current) {
        console.log("Received answer");
        await peerConnectionRef.current.setRemoteDescription(payload.answer);
      }
    });

    channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
      if (payload.senderId !== userId && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(payload.candidate);
        } catch (e) {
          console.error("Error adding ICE candidate:", e);
        }
      }
    });

    await channel.subscribe();
    channelRef.current = channel;

    // If host, create and send offer
    if (isHost) {
      // Wait a bit for guest to subscribe
      setTimeout(async () => {
        if (peerConnectionRef.current) {
          console.log("Creating offer...");
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          
          channel.send({
            type: "broadcast",
            event: "offer",
            payload: { offer, senderId: userId }
          });
        }
      }, 2000);
    }
  }, [roomCode, userId, isHost, startMedia, createPeerConnection]);

  // Stop connection
  const stopConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    stopMedia();

    setState({
      localStream: null,
      remoteStream: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  }, [stopMedia]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopConnection();
    };
  }, [stopConnection]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }, []);

  return {
    ...state,
    startConnection,
    stopConnection,
    toggleAudio,
    toggleVideo,
  };
}
