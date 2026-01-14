"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, ArrowLeft, Zap, CheckCircle, XCircle, 
  Loader2, AlertTriangle, Trophy, Lightbulb, Clock, Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEnergyGuard } from "@/components/energy-guard";

interface Option {
  id: string;
  text: string;
  is_correct: boolean;
  explanation: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  energy_cost: number;
  min_level: number;
  content: {
    puzzle_type: string;
    question: string;
    sequence?: string;
    premises?: string[];
    analogy?: string;
    context?: string;
    argument?: string;
    options: Option[];
    hint: string;
    explanation: string;
    skill_focus: string[];
  };
}

interface Result {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  timeBonus: number;
  pointsEarned: number;
  feedback: string;
  explanation: string;
  correctAnswer: string;
  skillFocus: string[];
  allOptions: Option[];
}

export default function ThinkquizDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const router = useRouter();
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  
  // Timer
  const [timeSpent, setTimeSpent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    params.then(p => setChallengeId(p.id));
  }, [params]);

  useEffect(() => {
    if (!challengeId) return;
    
    async function fetchChallenge() {
      try {
        const res = await fetch(`/api/thinkquiz?id=${challengeId}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
        } else if (!data.accessible) {
          setError(`Perlu Level ${data.challenge.min_level} untuk mengakses`);
        } else {
          setChallenge(data.challenge);
          // Start timer
          timerRef.current = setInterval(() => {
            setTimeSpent(t => t + 1);
          }, 1000);
        }
      } catch {
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchChallenge();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [challengeId]);

  // Energy Guard
  const { checkEnergy, EnergyModal } = useEnergyGuard();

  const handleSubmit = async () => {
    if (!selectedOption || !challengeId || !challenge) return;
    
    // Check energy before submitting (cost is deducted on server)
    const canProceed = await checkEnergy(challenge.energy_cost);
    if (!canProceed) return;

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);
    
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/thinkquiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          selectedOptionId: selectedOption,
          timeSpentSeconds: timeSpent
        })
      });

      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        // Update energy balance (deducted on server)
        window.dispatchEvent(new Event("energy-updated"));
      }
    } catch {
      setError("Gagal mengirim jawaban");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Tidak Dapat Diakses</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/dashboard/thinkquiz">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  if (!challenge) return null;

  // Result view
  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Result Header */}
          <Card className={`mb-6 ${result.isCorrect ? "border-green-500" : "border-red-500"}`}>
            <CardContent className="pt-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                result.isCorrect ? "bg-green-500/10" : "bg-red-500/10"
              }`}>
                {result.isCorrect ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${
                result.isCorrect ? "text-green-500" : "text-red-500"
              }`}>
                {result.isCorrect ? "Benar!" : "Salah"}
              </h2>
              
              <div className="flex items-center justify-center gap-6 mt-4">
                <div>
                  <p className="text-3xl font-bold">{result.score}</p>
                  <p className="text-xs text-muted-foreground">Skor</p>
                </div>
                {result.timeBonus > 0 && (
                  <div>
                    <p className="text-lg font-bold text-blue-500">+{result.timeBonus}</p>
                    <p className="text-xs text-muted-foreground">Bonus Kecepatan</p>
                  </div>
                )}
                {result.pointsEarned > 0 && (
                  <div>
                    <p className="text-lg font-bold text-primary">+{result.pointsEarned}</p>
                    <p className="text-xs text-muted-foreground">Poin</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Penjelasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p>{result.feedback}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Jawaban Benar: {result.correctAnswer}</h4>
                <p className="text-muted-foreground text-sm">{result.explanation}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Skill yang Dilatih</h4>
                <div className="flex flex-wrap gap-2">
                  {result.skillFocus.map((skill: string, i: number) => (
                    <span 
                      key={i}
                      className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/dashboard/thinkquiz" className="flex-1">
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

  // Quiz view
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/thinkquiz">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{challenge.title}</h1>
          <p className="text-sm text-muted-foreground">{challenge.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
            timeSpent < 30 ? "bg-green-500/10 text-green-600" : "bg-muted"
          }`}>
            <Timer className="h-4 w-4" />
            <span className="text-sm font-medium">{formatTime(timeSpent)}</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{challenge.energy_cost}</span>
          </div>
        </div>
      </div>

      {/* Bonus Info */}
      {timeSpent < 30 && (
        <div className="text-center text-sm text-green-600 bg-green-500/10 rounded-lg py-2">
          🚀 Jawab dalam {30 - timeSpent} detik untuk bonus poin!
        </div>
      )}

      {/* Question */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">Pertanyaan</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-relaxed">{challenge.content.question}</p>
          
          {/* Display special content based on puzzle type */}
          {challenge.content.sequence && (
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-xl font-mono font-bold tracking-wider">
                {challenge.content.sequence}
              </p>
            </div>
          )}
          
          {challenge.content.premises && (
            <div className="space-y-2">
              {challenge.content.premises.map((p, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted">
                  <span className="font-medium text-primary mr-2">P{i + 1}:</span>
                  {p}
                </div>
              ))}
            </div>
          )}
          
          {challenge.content.analogy && (
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-lg font-medium">{challenge.content.analogy}</p>
            </div>
          )}
          
          {challenge.content.argument && (
            <div className="p-4 rounded-lg bg-muted italic">
              &ldquo;{challenge.content.argument}&rdquo;
            </div>
          )}
          
          {challenge.content.context && (
            <p className="text-sm text-muted-foreground">{challenge.content.context}</p>
          )}
        </CardContent>
      </Card>

      {/* Hint */}
      <button
        onClick={() => setShowHint(!showHint)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Lightbulb className={`h-4 w-4 ${showHint ? "text-yellow-500" : ""}`} />
        {showHint ? "Sembunyikan Petunjuk" : "Tampilkan Petunjuk"}
      </button>
      
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm"
          >
            <strong>💡 Petunjuk:</strong> {challenge.content.hint}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options */}
      <div className="space-y-3">
        {challenge.content.options.map((option, index) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <button
              onClick={() => setSelectedOption(option.id)}
              disabled={submitting}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                selectedOption === option.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedOption === option.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}>
                  {option.id}
                </div>
                <p className="text-sm">{option.text}</p>
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Submit */}
      <Button 
        onClick={handleSubmit}
        disabled={!selectedOption || submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <CheckCircle className="h-5 w-5 mr-2" />
            Kirim Jawaban
          </>
        )}
      </Button>
      <EnergyModal />
    </div>
  );
}
