"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Scale, ArrowLeft, Zap, CheckCircle, XCircle, 
  Loader2, AlertTriangle, Trophy, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Option {
  id: string;
  text: string;
  ethics_score: number;
  feedback: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  energy_cost: number;
  min_level: number;
  content: {
    scenario: string;
    scenario_en?: string;
    options: Option[];
    explanation: string;
    related_values: string[];
  };
}

interface Result {
  score: number;
  maxScore: number;
  pointsEarned: number;
  feedback: string;
  explanation: string;
  relatedValues: string[];
  allOptions: Option[];
}

export default function EthicquizDetailPage({ 
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

  // Resolve params
  useEffect(() => {
    params.then(p => setChallengeId(p.id));
  }, [params]);

  // Fetch challenge
  useEffect(() => {
    if (!challengeId) return;
    
    async function fetchChallenge() {
      try {
        const res = await fetch(`/api/ethicquiz?id=${challengeId}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
        } else if (!data.accessible) {
          setError(`Perlu Level ${data.challenge.min_level} untuk mengakses`);
        } else {
          setChallenge(data.challenge);
        }
      } catch {
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchChallenge();
  }, [challengeId]);

  const handleSubmit = async () => {
    if (!selectedOption || !challengeId) return;
    
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/ethicquiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          selectedOptionId: selectedOption
        })
      });

      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Gagal mengirim jawaban");
    } finally {
      setSubmitting(false);
    }
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
        <Link href="/dashboard/ethicquiz">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  if (!challenge) return null;

  // Show result
  if (result) {
    const scorePercentage = (result.score / result.maxScore) * 100;
    const scoreColor = scorePercentage >= 80 ? "text-green-500" : 
                       scorePercentage >= 50 ? "text-yellow-500" : "text-red-500";

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Score Card */}
          <Card className="mb-6">
            <CardContent className="pt-6 text-center">
              <div className={`text-6xl font-bold ${scoreColor} mb-2`}>
                {result.score}
              </div>
              <p className="text-muted-foreground">Skor Etika dari {result.maxScore}</p>
              
              {result.pointsEarned > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-primary">
                  <Trophy className="h-5 w-5" />
                  <span className="font-medium">+{result.pointsEarned} Poin Nilai Etika</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p>{result.feedback}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Penjelasan
                </h4>
                <p className="text-muted-foreground text-sm">{result.explanation}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Nilai Terkait</h4>
                <div className="flex flex-wrap gap-2">
                  {result.relatedValues.map((value, i) => (
                    <span 
                      key={i}
                      className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-sm"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Options Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Perbandingan Semua Pilihan</CardTitle>
              <CardDescription>Lihat skor etika setiap pilihan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.allOptions
                .sort((a, b) => b.ethics_score - a.ethics_score)
                .map((opt) => (
                  <div 
                    key={opt.id}
                    className={`p-3 rounded-lg border ${
                      opt.id === selectedOption 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{opt.id}.</span>
                          {opt.id === selectedOption && (
                            <span className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground">
                              Pilihan Anda
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{opt.text}</p>
                      </div>
                      <div className={`text-lg font-bold flex-shrink-0 ${
                        opt.ethics_score >= 80 ? "text-green-500" :
                        opt.ethics_score >= 50 ? "text-yellow-500" : "text-red-500"
                      }`}>
                        {opt.ethics_score}
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/dashboard/ethicquiz" className="flex-1">
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

  // Quiz form
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/ethicquiz">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{challenge.title}</h1>
          <p className="text-sm text-muted-foreground">{challenge.description}</p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{challenge.energy_cost}</span>
        </div>
      </div>

      {/* Scenario */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">Skenario</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed">{challenge.content.scenario}</p>
        </CardContent>
      </Card>

      {/* Options */}
      <div>
        <h3 className="font-medium mb-3">Apa yang akan Anda lakukan?</h3>
        <div className="space-y-3">
          <AnimatePresence>
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
          </AnimatePresence>
        </div>
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
    </div>
  );
}
