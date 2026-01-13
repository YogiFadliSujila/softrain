"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { 
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, 
  Loader2, User, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebRTC } from "@/hooks/use-webrtc";

interface VideoCallProps {
  roomCode: string;
  userId: string;
  isHost: boolean;
  partnerName: string;
}

export function VideoCall({ roomCode, userId, isHost, partnerName }: VideoCallProps) {
  const {
    localStream,
    remoteStream,
    isConnected,
    isConnecting,
    error,
    startConnection,
    stopConnection,
    toggleAudio,
    toggleVideo,
  } = useWebRTC({ roomCode, userId, isHost });

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callStarted, setCallStarted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleStartCall = async () => {
    setCallStarted(true);
    await startConnection();
  };

  const handleEndCall = () => {
    stopConnection();
    setCallStarted(false);
  };

  const handleToggleAudio = () => {
    const enabled = toggleAudio();
    setAudioEnabled(enabled);
  };

  const handleToggleVideo = () => {
    const enabled = toggleVideo();
    setVideoEnabled(enabled);
  };

  // Not started yet
  if (!callStarted) {
    return (
      <div className="p-6 bg-muted/50 rounded-lg text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center">
          <Video className="h-8 w-8 text-purple-500" />
        </div>
        <div>
          <h3 className="font-semibold">Video Call</h3>
          <p className="text-sm text-muted-foreground">
            Mulai video call dengan {partnerName}
          </p>
        </div>
        <Button onClick={handleStartCall} className="w-full">
          <Phone className="h-4 w-4 mr-2" />
          Mulai Video Call
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-2 gap-2 aspect-video">
        {/* Local Video */}
        <div className="relative bg-muted rounded-lg overflow-hidden">
          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
            Anda
          </div>
          {!videoEnabled && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Remote Video */}
        <div className="relative bg-muted rounded-lg overflow-hidden">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
              {isConnecting ? (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </motion.div>
                  <span className="text-xs text-muted-foreground">Menghubungkan...</span>
                </>
              ) : (
                <>
                  <User className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Menunggu {partnerName}</span>
                </>
              )}
            </div>
          )}
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
            {partnerName}
          </div>
          {isConnected && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <Button
          variant={audioEnabled ? "outline" : "destructive"}
          size="icon"
          onClick={handleToggleAudio}
          className="rounded-full h-12 w-12"
        >
          {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>

        <Button
          variant={videoEnabled ? "outline" : "destructive"}
          size="icon"
          onClick={handleToggleVideo}
          className="rounded-full h-12 w-12"
        >
          {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>

        <Button
          variant="destructive"
          size="icon"
          onClick={handleEndCall}
          className="rounded-full h-12 w-12"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      {/* Status */}
      <div className="text-center text-xs text-muted-foreground">
        {isConnected ? (
          <span className="text-green-600">● Terhubung</span>
        ) : isConnecting ? (
          <span>Menghubungkan...</span>
        ) : (
          <span>Tidak terhubung</span>
        )}
      </div>
    </div>
  );
}
