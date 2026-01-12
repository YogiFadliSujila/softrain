"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Loader2, Plus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  messages_count: number;
}

export default function SoftrAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load sessions on mount
  const loadSessions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Load sessions error:", error);
      return;
    }

    if (data) {
      setSessions(data);
      // Auto-load most recent session if no current session
      if (data.length > 0 && !currentSessionId) {
        loadSession(data[0].id);
      }
    }
  }, [supabase, currentSessionId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSession = async (sessionId: string) => {
    setLoadingSession(true);
    setCurrentSessionId(sessionId);
    
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Load messages error:", error);
      setLoadingSession(false);
      return;
    }

    if (data) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      })));
    }
    setLoadingSession(false);
  };

  const createNewSession = () => {
    // Clear current state - session will be created on first message
    setCurrentSessionId(null);
    setMessages([]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message to UI immediately
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: "user",
      content: userMessage,
    }]);

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          sessionId: currentSessionId, // Can be null - API will create session
        }),
      });

      const data = await response.json();
      
      // Update session ID if returned (for new sessions)
      if (data.sessionId && data.sessionId !== currentSessionId) {
        setCurrentSessionId(data.sessionId);
        // Reload sessions list to show new session
        loadSessions();
      }
      
      // Add AI response to UI
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response || "Maaf, terjadi kesalahan.",
      }]);

    } catch (err) {
      console.error("Send message error:", err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "Maaf, terjadi kesalahan koneksi. Silakan coba lagi.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex flex-col md:flex-row gap-4">
      {/* Sessions Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col border rounded-lg bg-card">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">Riwayat Chat</h3>
          <Button size="icon" variant="ghost" onClick={createNewSession}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => loadSession(session.id)}
              className={`w-full text-left p-2 rounded-lg text-sm hover:bg-accent transition-colors ${
                currentSessionId === session.id ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-3 w-3 flex-shrink-0" />
                <span className="truncate flex-1">{session.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {session.messages_count || 0} pesan
              </span>
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">Belum ada riwayat chat</p>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">SoftrAI</CardTitle>
              <p className="text-xs text-muted-foreground">Powered by Groq • Asisten Pengembangan Diri</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingSession ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Halo! Saya SoftrAI</h3>
              <p className="text-muted-foreground text-sm max-w-md mt-2">
                Saya di sini untuk membantu pengembangan soft skills Anda. 
                Ceritakan apa yang ingin Anda tingkatkan atau curhat tentang progres Anda!
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {[
                  "Tips komunikasi efektif",
                  "Cara meningkatkan percaya diri",
                  "Mengelola emosi di tempat kerja",
                ].map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-muted rounded-2xl px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Area */}
        <div className="p-4 border-t">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik pesan Anda..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
