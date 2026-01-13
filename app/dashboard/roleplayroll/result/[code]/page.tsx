"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Trophy, Loader2, AlertTriangle, 
  User, Star, MessageSquare, Briefcase, Lightbulb, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeedbackDetail {
  komunikasi: string;
  profesionalisme: string;
  kualitasArgumen: string;
  saran: string;
}

interface RoomData {
  hostName: string;
  guestName: string;
  hostRole: string;
  guestRole: string;
  hostScore: number | null;
  guestScore: number | null;
  hostFeedback: FeedbackDetail | null;
  guestFeedback: FeedbackDetail | null;
  scenarioTitle: string;
  status: string;
  isHost: boolean;
}

export default function ResultPage({ 
  params 
}: { 
  params: Promise<{ code: string }> 
}) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setRoomCode(p.code.toUpperCase()));
  }, [params]);

  const fetchResult = useCallback(async () => {
    if (!roomCode) return;

    try {
      const res = await fetch(`/api/roleplayroll/evaluate?code=${roomCode}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setRoom(data.room);
      }
    } catch {
      setError("Gagal memuat hasil");
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  const runEvaluation = async () => {
    if (!roomCode) return;

    setEvaluating(true);
    setError(null);

    // Get messages from localStorage (stored during session)
    const storedMessages = localStorage.getItem(`roleplay-messages-${roomCode}`);
    const messages = storedMessages ? JSON.parse(storedMessages) : [];

    if (messages.length === 0) {
      setError("Tidak ada percakapan untuk dievaluasi");
      setEvaluating(false);
      return;
    }

    try {
      const res = await fetch("/api/roleplayroll/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, messages })
      });

      const data = await res.json();

      if (data.success) {
        // Refresh room data
        await fetchResult();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Gagal melakukan evaluasi");
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error</h2>
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

  const hasEvaluation = room.hostScore !== null && room.guestScore !== null;
  const myScore = room.isHost ? room.hostScore : room.guestScore;
  const myFeedback = room.isHost ? room.hostFeedback : room.guestFeedback;
  const myRole = room.isHost ? room.hostRole : room.guestRole;
  const partnerScore = room.isHost ? room.guestScore : room.hostScore;
  const partnerFeedback = room.isHost ? room.guestFeedback : room.hostFeedback;
  const partnerName = room.isHost ? room.guestName : room.hostName;
  const partnerRole = room.isHost ? room.guestRole : room.hostRole;

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
          <h1 className="text-xl font-bold">Hasil Roleplay</h1>
          <p className="text-sm text-muted-foreground">{room.scenarioTitle}</p>
        </div>
      </div>

      {/* Not evaluated yet */}
      {!hasEvaluation && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="pt-6 text-center space-y-4">
            <Lightbulb className="h-12 w-12 mx-auto text-yellow-500" />
            <div>
              <h3 className="font-semibold">Belum Ada Evaluasi</h3>
              <p className="text-sm text-muted-foreground">
                Klik tombol di bawah untuk mendapatkan evaluasi AI
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button onClick={runEvaluation} disabled={evaluating}>
              {evaluating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Star className="h-4 w-4 mr-2" />
              )}
              {evaluating ? "Mengevaluasi..." : "Jalankan Evaluasi AI"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scores */}
      {hasEvaluation && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            {/* My Score */}
            <Card className="border-primary/30">
              <CardContent className="pt-6 text-center">
                <User className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground capitalize">Anda ({myRole})</p>
                <div className={`text-4xl font-bold mt-2 ${
                  (myScore || 0) >= 80 ? "text-green-500" :
                  (myScore || 0) >= 60 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {myScore}
                </div>
                <p className="text-xs text-muted-foreground mt-1">dari 100</p>
              </CardContent>
            </Card>

            {/* Partner Score */}
            <Card>
              <CardContent className="pt-6 text-center">
                <User className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
                <p className="text-sm text-muted-foreground capitalize">{partnerName} ({partnerRole})</p>
                <div className={`text-4xl font-bold mt-2 ${
                  (partnerScore || 0) >= 80 ? "text-green-500" :
                  (partnerScore || 0) >= 60 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {partnerScore}
                </div>
                <p className="text-xs text-muted-foreground mt-1">dari 100</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* My Feedback */}
          {myFeedback && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Feedback untuk Anda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">💬 Komunikasi</p>
                    <p className="text-sm">{myFeedback.komunikasi}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">💼 Profesionalisme</p>
                    <p className="text-sm">{myFeedback.profesionalisme}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">💡 Kualitas Argumen</p>
                    <p className="text-sm">{myFeedback.kualitasArgumen}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-primary mb-1">✨ Saran Perbaikan</p>
                    <p className="text-sm">{myFeedback.saran}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Partner Feedback (Collapsed) */}
          {partnerFeedback && (
            <details className="group">
              <summary className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium">Feedback untuk {partnerName}</span>
                </div>
              </summary>
              <Card className="mt-2">
                <CardContent className="pt-4 space-y-3">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">💬 Komunikasi</p>
                    <p className="text-sm">{partnerFeedback.komunikasi}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">💼 Profesionalisme</p>
                    <p className="text-sm">{partnerFeedback.profesionalisme}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">💡 Kualitas Argumen</p>
                    <p className="text-sm">{partnerFeedback.kualitasArgumen}</p>
                  </div>
                </CardContent>
              </Card>
            </details>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/dashboard/roleplayroll" className="flex-1">
          <Button variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Main Lagi
          </Button>
        </Link>
        <Link href="/dashboard/rankings" className="flex-1">
          <Button className="w-full">
            <Trophy className="h-4 w-4 mr-2" />
            Lihat Ranking
          </Button>
        </Link>
      </div>
    </div>
  );
}
