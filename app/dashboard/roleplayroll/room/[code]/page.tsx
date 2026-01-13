"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Users, ArrowLeft, Copy, Check, Loader2, Play, 
  User, Crown, Clock, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface Room {
  id: string;
  room_code: string;
  status: string;
  host_role: string;
  guest_role: string;
  host_id: string;
  guest_id: string | null;
  scenario: {
    id: string;
    title: string;
    content: {
      scenario: {
        title: string;
        your_role: string;
        ai_role: string;
      };
    };
  };
  host: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  guest: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export default function RoomLobbyPage({ 
  params 
}: { 
  params: Promise<{ code: string }> 
}) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get params
  useEffect(() => {
    params.then(p => setRoomCode(p.code.toUpperCase()));
  }, [params]);

  // Get current user
  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    }
    getUser();
  }, []);

  // Fetch room data
  const fetchRoom = useCallback(async () => {
    if (!roomCode) return;
    
    try {
      const res = await fetch(`/api/roleplayroll/room?code=${roomCode}`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setRoom(data.room);
        if (userId) {
          setIsHost(data.room.host_id === userId);
        }
        
        // If room started, redirect to session
        if (data.room.status === "active") {
          router.push(`/dashboard/roleplayroll/session/${roomCode}`);
        }
      }
    } catch {
      setError("Gagal memuat room");
    } finally {
      setLoading(false);
    }
  }, [roomCode, userId, router]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!roomCode) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`room-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "roleplay_rooms",
          filter: `room_code=eq.${roomCode}`
        },
        (payload) => {
          console.log("Room update:", payload);
          fetchRoom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, fetchRoom]);

  const copyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startSession = async () => {
    if (!roomCode) return;
    setStarting(true);
    
    try {
      const res = await fetch("/api/roleplayroll/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", roomCode })
      });
      
      const data = await res.json();
      if (data.success) {
        router.push(`/dashboard/roleplayroll/session/${roomCode}`);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Gagal memulai sesi");
    } finally {
      setStarting(false);
    }
  };

  const leaveRoom = async () => {
    if (!roomCode) return;
    setLeaving(true);
    
    try {
      await fetch("/api/roleplayroll/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", roomCode })
      });
      
      router.push("/dashboard/roleplayroll");
    } catch {
      setError("Gagal keluar room");
    } finally {
      setLeaving(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error
  if (error && !room) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Room Tidak Ditemukan</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/dashboard/roleplayroll">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  if (!room) return null;

  const myRole = isHost ? room.host_role : room.guest_role;
  const partnerRole = isHost ? room.guest_role : room.host_role;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/roleplayroll">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Waiting Room</h1>
          <p className="text-sm text-muted-foreground">{room.scenario?.title}</p>
        </div>
      </div>

      {/* Room Code */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">Kode Room</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-mono font-bold tracking-widest">
              {roomCode}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={copyCode}
              className="h-10 w-10"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Bagikan kode ini ke partner Anda
          </p>
        </CardContent>
      </Card>

      {/* Participants */}
      <div className="grid grid-cols-2 gap-4">
        {/* Host */}
        <Card className={isHost ? "border-primary" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Host
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{room.host?.display_name || "Host"}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  Sebagai {room.host_role}
                </p>
              </div>
            </div>
            {isHost && (
              <div className="mt-2 text-xs text-primary">Anda</div>
            )}
          </CardContent>
        </Card>

        {/* Guest */}
        <Card className={!isHost && room.guest_id ? "border-primary" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Partner
            </CardTitle>
          </CardHeader>
          <CardContent>
            {room.guest ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <p className="font-medium">{room.guest.display_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    Sebagai {room.guest_role}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"
                >
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </motion.div>
                <div>
                  <p className="text-muted-foreground">Menunggu...</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    Sebagai {room.guest_role}
                  </p>
                </div>
              </div>
            )}
            {!isHost && room.guest_id === userId && (
              <div className="mt-2 text-xs text-primary">Anda</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Your Role Info */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-1">Peran Anda</p>
          <p className="font-medium capitalize text-lg">{myRole}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Partner Anda sebagai <span className="capitalize">{partnerRole}</span>
          </p>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {isHost ? (
          <Button
            onClick={startSession}
            disabled={!room.guest_id || starting}
            className="w-full h-12"
          >
            {starting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                {room.guest_id ? "Mulai Sesi" : "Menunggu Partner..."}
              </>
            )}
          </Button>
        ) : (
          <div className="p-4 rounded-lg bg-muted text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Menunggu host memulai sesi...
            </p>
          </div>
        )}

        <Button
          variant="outline"
          onClick={leaveRoom}
          disabled={leaving}
          className="w-full"
        >
          {leaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Keluar Room
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
