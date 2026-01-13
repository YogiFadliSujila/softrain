"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, ArrowLeft, Loader2, AlertTriangle, 
  Send, User, Clock, CheckCircle, Mic, MicOff, Video, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { VideoCall } from "@/components/video-call";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
}

interface Room {
  id: string;
  room_code: string;
  status: string;
  host_id: string;
  guest_id: string;
  host_role: string;
  guest_role: string;
  scenario: {
    title: string;
    content: {
      scenario: {
        title: string;
        your_role: string;
        ai_role: string;
        context: string;
      };
      min_exchanges: number;
    };
  };
  host: { display_name: string };
  guest: { display_name: string };
}

export default function SessionPage({ 
  params 
}: { 
  params: Promise<{ code: string }> 
}) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  // Get params and user
  useEffect(() => {
    params.then(p => setRoomCode(p.code.toUpperCase()));
    
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        setUserName(profile?.display_name || "User");
      }
    }
    getUser();
  }, [params]);

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
        
        // Redirect if room not active
        if (data.room.status !== "active") {
          router.push(`/dashboard/roleplayroll/room/${roomCode}`);
          return;
        }
      }
    } catch {
      setError("Gagal memuat room");
    } finally {
      setLoading(false);
    }
  }, [roomCode, router]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Determine turn
  useEffect(() => {
    if (!room || !userId) return;

    const isHost = room.host_id === userId;
    const messageCount = messages.length;
    
    // Host goes first (even messages = host turn, odd = guest turn)
    if (isHost) {
      setIsMyTurn(messageCount % 2 === 0);
    } else {
      setIsMyTurn(messageCount % 2 === 1);
    }
  }, [room, userId, messages.length]);

  // Setup Supabase Realtime channel
  useEffect(() => {
    if (!roomCode || !userId) return;

    const supabase = createClient();
    
    // Create realtime channel
    const channel = supabase.channel(`session-${roomCode}`, {
      config: {
        broadcast: { self: false }
      }
    });

    // Listen for new messages
    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      const newMessage = payload as Message;
      setMessages(prev => [...prev, newMessage]);
      setPartnerTyping(false);
    });

    // Listen for typing indicator
    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.userId !== userId) {
        setPartnerTyping(true);
        setTimeout(() => setPartnerTyping(false), 3000);
      }
    });

    // Listen for session end
    channel.on("broadcast", { event: "end" }, () => {
      router.push(`/dashboard/roleplayroll/result/${roomCode}`);
    });

    channel.subscribe((status) => {
      console.log("Realtime channel status:", status);
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, userId, router]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save messages to localStorage for AI evaluation
  useEffect(() => {
    if (roomCode && messages.length > 0) {
      localStorage.setItem(`roleplay-messages-${roomCode}`, JSON.stringify(messages));
    }
  }, [roomCode, messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || !roomCode || !userId || sending || !isMyTurn) return;

    const content = inputValue.trim();
    setInputValue("");
    setSending(true);

    const newMessage: Message = {
      id: `${Date.now()}-${userId}`,
      sender_id: userId,
      sender_name: userName,
      content,
      timestamp: new Date().toISOString()
    };

    // Add to local messages
    setMessages(prev => [...prev, newMessage]);

    // Broadcast to partner
    if (channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "message",
        payload: newMessage
      });
    }

    setSending(false);
  };

  const handleTyping = () => {
    if (channelRef.current && userId) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId }
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
  if (error || !room) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sesi Tidak Ditemukan</h2>
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

  const isHost = room.host_id === userId;
  const myRole = isHost ? room.host_role : room.guest_role;
  const partnerName = isHost ? room.guest?.display_name : room.host?.display_name;
  const minExchanges = room.scenario?.content?.min_exchanges || 5;
  const canComplete = messages.length >= minExchanges * 2;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/dashboard/roleplayroll">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{room.scenario?.content?.scenario?.title || "Roleplay"}</h1>
          <p className="text-xs text-muted-foreground">
            Anda: <span className="capitalize font-medium">{myRole}</span> • 
            Partner: {partnerName}
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="text-muted-foreground">{Math.floor(messages.length / 2)}/{minExchanges} min</p>
        </div>
      </div>

      {/* Turn Indicator */}
      <Card className={`mb-4 ${isMyTurn ? "border-green-500 bg-green-500/5" : "border-muted"}`}>
        <CardContent className="py-3 flex items-center justify-center gap-2">
          {isMyTurn ? (
            <>
              <Mic className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Giliran Anda</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Menunggu {partnerName}...</span>
            </>
          )}
        </CardContent>
      </Card>

      {/* Video Call Section - Collapsible */}
      <details className="mb-4 group">
        <summary className="flex items-center justify-between p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg cursor-pointer hover:bg-purple-500/10 transition-colors">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Video Call</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2">
          {userId && roomCode && (
            <VideoCall
              roomCode={roomCode}
              userId={userId}
              isHost={isHost}
              partnerName={partnerName || "Partner"}
            />
          )}
        </div>
      </details>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Session dimulai!</p>
            <p className="text-xs">{isHost ? "Anda yang memulai percakapan" : "Tunggu host memulai"}</p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => {
            const isMe = msg.sender_id === userId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isMe ? "bg-primary" : "bg-indigo-500"
                }`}>
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  isMe 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                }`}>
                  <p className="text-xs text-opacity-70 mb-1">
                    {isMe ? "Anda" : msg.sender_name}
                  </p>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {partnerTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isMyTurn ? (
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyPress}
            placeholder="Ketik pesan Anda..."
            className="flex-1 p-3 rounded-lg border resize-none h-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={sending}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!inputValue.trim() || sending}
            size="icon"
            className="h-12 w-12"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <MicOff className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Menunggu giliran...</p>
        </div>
      )}

      {/* Complete button */}
      {canComplete && (
        <Button 
          onClick={() => router.push(`/dashboard/roleplayroll/result/${roomCode}`)}
          className="mt-3 w-full"
          variant="outline"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Selesaikan Sesi
        </Button>
      )}
    </div>
  );
}
