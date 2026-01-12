"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, ArrowLeft, Zap, Loader2, AlertTriangle, 
  Trophy, Send, CheckCircle, User, Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface Scenario {
  id: string;
  title: string;
  energy_cost: number;
  content: {
    scenario: {
      title: string;
      setting: string;
      context: string;
      your_role: string;
      ai_role: string;
    };
    ai_persona: {
      name: string;
      title: string;
      personality: string;
    };
    conversation_flow: string[];
    evaluation_points: string[];
    min_exchanges: number;
    max_exchanges: number;
    skill_focus: string[];
  };
}

interface FeedbackItem {
  point: string;
  score: string;
}

interface Result {
  score: number;
  maxScore: number;
  pointsEarned: number;
  feedback: FeedbackItem[];
  summary: {
    exchanges: number;
    avgMessageLength: number;
    skillsFocus: string[];
  };
}

type Phase = "intro" | "chat" | "result";

export default function RoleplayrollDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exchangeCount, setExchangeCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then(p => setScenarioId(p.id));
  }, [params]);

  useEffect(() => {
    if (!scenarioId) return;
    
    async function fetchScenario() {
      try {
        const res = await fetch(`/api/roleplayroll?id=${scenarioId}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
        } else if (!data.accessible) {
          setError(`Perlu Level ${data.scenario.min_level} untuk mengakses`);
        } else {
          setScenario(data.scenario);
        }
      } catch {
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchScenario();
  }, [scenarioId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = async () => {
    if (!scenarioId) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/roleplayroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId,
          action: "start"
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessages([{ role: "ai", content: data.aiMessage }]);
        setPhase("chat");
      } else {
        setError(data.error || "Gagal memulai percakapan");
      }
    } catch {
      setError("Gagal memulai percakapan");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !scenarioId || sending) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setSending(true);

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setExchangeCount(prev => prev + 1);

    try {
      const res = await fetch("/api/roleplayroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId,
          action: "chat",
          userMessage,
          conversationHistory: messages,
          exchangeCount: exchangeCount + 1
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: "ai", content: data.aiMessage }]);
      } else {
        setError(data.error || "Gagal mendapat respons");
      }
    } catch {
      setError("Gagal mendapat respons AI");
    } finally {
      setSending(false);
    }
  };

  const completeSession = async () => {
    if (!scenarioId) return;
    
    setCompleting(true);
    try {
      const res = await fetch("/api/roleplayroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId,
          action: "complete",
          conversationHistory: messages,
          exchangeCount
        })
      });

      const data = await res.json();
      if (data.success) {
        setResult(data);
        setPhase("result");
      } else {
        setError(data.error || "Gagal menyelesaikan sesi");
      }
    } catch {
      setError("Gagal menyelesaikan sesi");
    } finally {
      setCompleting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading && !scenario) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if ((error && !scenario) || !scenario) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Tidak Dapat Diakses</h2>
        <p className="text-muted-foreground mb-4">{error || "Skenario tidak ditemukan"}</p>
        <Link href="/dashboard/roleplayroll">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  const content = scenario.content;

  // Result Phase
  if (phase === "result" && result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Score */}
          <Card className="mb-6">
            <CardContent className="pt-6 text-center">
              <div className={`text-5xl font-bold mb-2 ${
                result.score >= 80 ? "text-green-500" : 
                result.score >= 50 ? "text-yellow-500" : "text-red-500"
              }`}>
                {result.score}
              </div>
              <p className="text-muted-foreground">Skor dari {result.maxScore}</p>
              {result.pointsEarned > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-primary">
                  <Trophy className="h-5 w-5" />
                  <span className="font-medium">+{result.pointsEarned} Poin</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jumlah Pertukaran</span>
                <span>{result.summary.exchanges}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rata-rata Panjang Pesan</span>
                <span>{result.summary.avgMessageLength} karakter</span>
              </div>
              <div className="pt-2">
                <span className="text-sm text-muted-foreground">Skill yang Dilatih:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {result.summary.skillsFocus.map((skill, i) => (
                    <span key={i} className="px-2 py-1 text-xs rounded-full bg-indigo-500/10 text-indigo-600">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evaluasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.feedback.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded bg-muted text-sm">
                  <span>{item.point}</span>
                  <span className={
                    item.score === "Baik" ? "text-green-600" :
                    item.score === "Cukup" ? "text-yellow-600" : "text-red-600"
                  }>
                    {item.score}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/dashboard/roleplayroll" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <Link href="/dashboard/rankings" className="flex-1">
              <Button className="w-full">
                <Trophy className="h-4 w-4 mr-2" />
                Lihat Ranking
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Chat Phase
  if (phase === "chat") {
    const minExchanges = content.min_exchanges;
    const maxExchanges = content.max_exchanges;
    const canComplete = exchangeCount >= minExchanges;
    const mustComplete = exchangeCount >= maxExchanges;

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
            <h1 className="text-lg font-bold">{content.scenario.title}</h1>
            <p className="text-xs text-muted-foreground">
              Berbicara dengan {content.ai_persona.name}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{exchangeCount}/{minExchanges} minimum</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "user" ? "bg-primary" : "bg-indigo-500"
                }`}>
                  {msg.role === "user" ? (
                    <User className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                }`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Input */}
        {!mustComplete ? (
          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ketik respons Anda..."
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
        ) : null}

        {/* Complete button */}
        {(canComplete || mustComplete) && (
          <Button 
            onClick={completeSession}
            disabled={completing}
            className="mt-3 w-full"
            variant={mustComplete ? "default" : "outline"}
          >
            {completing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                {mustComplete ? "Selesaikan Sesi" : "Selesaikan & Lihat Hasil"}
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // Intro Phase
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/roleplayroll">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{scenario.title}</h1>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{scenario.energy_cost}</span>
        </div>
      </div>

      {/* Scenario Info */}
      <Card className="border-indigo-500/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-lg">{content.scenario.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-muted text-sm">
            <strong>Setting:</strong> {content.scenario.setting}
          </div>
          <p className="text-muted-foreground text-sm">{content.scenario.context}</p>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Anda berperan sebagai:</p>
              <p className="text-sm font-medium">{content.scenario.your_role}</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
              <p className="text-xs text-muted-foreground mb-1">AI berperan sebagai:</p>
              <p className="text-sm font-medium">{content.ai_persona.name}</p>
              <p className="text-xs text-muted-foreground">{content.scenario.ai_role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alur Percakapan</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            {content.conversation_flow.map((flow, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <span>{flow}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Skills */}
      <div className="flex flex-wrap gap-2">
        {content.skill_focus.map((skill, idx) => (
          <span key={idx} className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 text-sm">
            {skill}
          </span>
        ))}
      </div>

      {/* Start button */}
      <Button 
        onClick={startConversation} 
        className="w-full" 
        size="lg"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Users className="h-5 w-5 mr-2" />
            Mulai Percakapan
          </>
        )}
      </Button>
    </div>
  );
}
