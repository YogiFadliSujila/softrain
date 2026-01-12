"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, ArrowLeft, Zap, CheckCircle, XCircle, 
  Loader2, AlertTriangle, Trophy, Clock, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Question {
  id: number;
  question: string;
  options: Array<{ id: string; text: string; is_correct: boolean }>;
}

interface Article {
  id: string;
  title: string;
  description: string;
  energy_cost: number;
  content: {
    article: {
      title: string;
      author: string;
      read_time: number;
      content: string;
      key_points: string[];
    };
    questions: Question[];
    discussion_points: string[];
    skill_focus: string[];
  };
}

interface Result {
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  results: Array<{
    questionId: number;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
  questions: Question[];
}

type Phase = "reading" | "quiz" | "result";

export default function JournAllistDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const [articleId, setArticleId] = useState<string | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>("reading");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Reading timer
  const [readingTime, setReadingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    params.then(p => setArticleId(p.id));
  }, [params]);

  useEffect(() => {
    if (!articleId) return;
    
    async function fetchArticle() {
      try {
        const res = await fetch(`/api/journallist?id=${articleId}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
        } else if (!data.accessible) {
          setError(`Perlu Level ${data.article.min_level} untuk mengakses`);
        } else {
          setArticle(data.article);
          timerRef.current = setInterval(() => {
            setReadingTime(t => t + 1);
          }, 1000);
        }
      } catch {
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchArticle();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [articleId]);

  const handleStartQuiz = () => {
    setPhase("quiz");
  };

  const handleSelectAnswer = (questionId: number, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!article || !articleId) return;
    
    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);
    
    const answerArray = Object.entries(answers).map(([qId, optId]) => ({
      questionId: parseInt(qId),
      selectedOptionId: optId
    }));

    if (answerArray.length < article.content.questions.length) {
      setError("Harap jawab semua pertanyaan");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/journallist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          answers: answerArray,
          readingTimeSeconds: readingTime
        })
      });

      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setPhase("result");
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

  if (error && !article) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Tidak Dapat Diakses</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/dashboard/journallist">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  if (!article) return null;

  // Result Phase
  if (phase === "result" && result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Score Card */}
          <Card className="mb-6">
            <CardContent className="pt-6 text-center">
              <div className={`text-5xl font-bold mb-2 ${
                result.score >= 80 ? "text-green-500" : 
                result.score >= 50 ? "text-yellow-500" : "text-red-500"
              }`}>
                {result.score}%
              </div>
              <p className="text-muted-foreground">
                {result.correctCount} dari {result.totalQuestions} pertanyaan benar
              </p>
              
              {result.pointsEarned > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-primary">
                  <Trophy className="h-5 w-5" />
                  <span className="font-medium">+{result.pointsEarned} Poin Komunikasi</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Answer Review */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Jawaban</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.questions.map((q, idx) => {
                const userResult = result.results.find(r => r.questionId === q.id);
                const isCorrect = userResult?.isCorrect;

                return (
                  <div 
                    key={q.id}
                    className={`p-4 rounded-lg border ${
                      isCorrect ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="font-medium text-sm">{idx + 1}. {q.question}</p>
                    </div>
                    
                    <div className="ml-7 text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">Jawaban Anda:</span>{" "}
                        <span className={isCorrect ? "text-green-600" : "text-red-600"}>
                          {userResult?.userAnswer}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p>
                          <span className="text-muted-foreground">Jawaban Benar:</span>{" "}
                          <span className="text-green-600">{userResult?.correctAnswer}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/dashboard/journallist" className="flex-1">
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

  // Quiz Phase
  if (phase === "quiz") {
    const allAnswered = Object.keys(answers).length === article.content.questions.length;

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setPhase("reading")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Pertanyaan Pemahaman</h1>
            <p className="text-sm text-muted-foreground">
              {Object.keys(answers).length}/{article.content.questions.length} terjawab
            </p>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {article.content.questions.map((q, idx) => (
            <Card key={q.id}>
              <CardContent className="pt-6">
                <p className="font-medium mb-4">{idx + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectAnswer(q.id, opt.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                        answers[q.id] === opt.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="font-medium mr-2">{opt.id}.</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button 
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
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

  // Reading Phase
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/journallist">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">
            {article.content.article.author} · {article.content.article.read_time} menit baca
          </p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">{formatTime(readingTime)}</span>
        </div>
      </div>

      {/* Article */}
      <article>
        <h1 className="text-2xl font-bold mb-6">{article.content.article.title}</h1>
        
        <div className="prose prose-sm max-w-none">
          {article.content.article.content.split("\n\n").map((paragraph, idx) => (
            <p key={idx} className="mb-4 text-muted-foreground leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </article>

      {/* Key Points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Poin Penting</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {article.content.article.key_points.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Start Quiz */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <BookOpen className="h-8 w-8 text-primary flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Sudah selesai membaca?</p>
          <p className="text-sm text-muted-foreground">
            Jawab {article.content.questions.length} pertanyaan pemahaman
          </p>
        </div>
        <Button onClick={handleStartQuiz}>
          Mulai Quiz
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
