"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowLeft, BookOpen, Loader2, AlertTriangle, 
  CheckCircle, ChevronRight, Clock, Award, Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface Section {
  title: string;
  type: "text" | "exercise" | "summary";
  content: string;
  key_takeaways?: string[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface ModuleContent {
  sections: Section[];
  estimated_duration: number;
  xp_reward: number;
  quiz?: {
    questions: QuizQuestion[];
  };
}

interface Module {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  content: ModuleContent;
  min_level: number;
  max_level: number;
  soft_skill_categories: {
    name: string;
    color: string;
  } | null;
}

export default function ModuleDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    params.then(p => setModuleId(p.id));
  }, [params]);

  useEffect(() => {
    if (!moduleId) return;
    
    async function fetchModule() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get module
        const { data, error: fetchError } = await supabase
          .from("modules")
          .select(`
            *,
            soft_skill_categories (name, color)
          `)
          .eq("id", moduleId)
          .eq("is_active", true)
          .single();
        
        if (fetchError || !data) {
          setError("Modul tidak ditemukan");
          setLoading(false);
          return;
        }

        // Check level access
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("level")
            .eq("id", user.id)
            .single();
          
          const userLevel = profile?.level || 1;
          if (userLevel < data.min_level || userLevel > data.max_level) {
            setError(`Modul ini untuk Level ${data.min_level}-${data.max_level}. Level Anda: ${userLevel}`);
            setLoading(false);
            return;
          }

          // Check if already completed
          const { data: progress } = await supabase
            .from("module_progress")
            .select("completed")
            .eq("user_id", user.id)
            .eq("module_id", moduleId)
            .single();
          
          if (progress?.completed) {
            setCompleted(true);
          }
        }

        setModule(data);
        // Initialize quiz answers if quiz exists
        if (data.content.quiz) {
          setQuizAnswers(new Array(data.content.quiz.questions.length).fill(null));
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Gagal memuat modul");
      } finally {
        setLoading(false);
      }
    }
    
    fetchModule();
  }, [moduleId, supabase]);

  const completeModule = async () => {
    if (!moduleId) return;
    
    setCompleting(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId })
      });

      const data = await res.json();
      if (data.progress) {
        setCompleted(true);
      }
    } catch (err) {
      console.error("Complete error:", err);
    } finally {
      setCompleting(false);
    }
  };

  const handleQuizAnswer = (questionIdx: number, answerIdx: number) => {
    if (quizSubmitted) return;
    const newAnswers = [...quizAnswers];
    newAnswers[questionIdx] = answerIdx;
    setQuizAnswers(newAnswers);
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
    // Calculate score
    const quiz = module?.content.quiz;
    if (!quiz) return;
    
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) correct++;
    });
    
    // If all correct, mark as complete
    if (correct === quiz.questions.length) {
      completeModule();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Tidak Dapat Diakses</h2>
        <p className="text-muted-foreground mb-4">{error || "Modul tidak ditemukan"}</p>
        <Link href="/dashboard/modules">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  const content = module.content;
  const sections = content.sections;
  const currentSectionData = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;
  const hasQuiz = !!content.quiz;

  // Quiz View
  if (showQuiz && content.quiz) {
    const quiz = content.quiz;
    let correctCount = 0;
    if (quizSubmitted) {
      quiz.questions.forEach((q, i) => {
        if (quizAnswers[i] === q.correct) correctCount++;
      });
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowQuiz(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Quiz: {module.title}</h1>
            <p className="text-sm text-muted-foreground">
              {quizSubmitted ? `Skor: ${correctCount}/${quiz.questions.length}` : "Jawab semua pertanyaan"}
            </p>
          </div>
        </div>

        {quiz.questions.map((q, qIdx) => (
          <Card key={qIdx} className={quizSubmitted && quizAnswers[qIdx] !== q.correct ? "border-red-500/50" : ""}>
            <CardHeader>
              <CardTitle className="text-base">{qIdx + 1}. {q.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.options.map((opt, optIdx) => {
                let bgClass = "hover:bg-accent";
                if (quizSubmitted) {
                  if (optIdx === q.correct) bgClass = "bg-green-500/20 border-green-500";
                  else if (quizAnswers[qIdx] === optIdx) bgClass = "bg-red-500/20 border-red-500";
                } else if (quizAnswers[qIdx] === optIdx) {
                  bgClass = "bg-primary/20 border-primary";
                }
                
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleQuizAnswer(qIdx, optIdx)}
                    disabled={quizSubmitted}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${bgClass}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {!quizSubmitted ? (
          <Button 
            onClick={submitQuiz} 
            className="w-full"
            disabled={quizAnswers.some(a => a === null)}
          >
            Kirim Jawaban
          </Button>
        ) : (
          <div className="space-y-3">
            {correctCount === quiz.questions.length ? (
              <Card className="border-green-500 bg-green-500/10">
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-green-700">Sempurna! Modul selesai.</p>
                  <p className="text-sm text-muted-foreground">+{content.xp_reward} XP</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-yellow-500 bg-yellow-500/10">
                <CardContent className="pt-6 text-center">
                  <p className="font-semibold text-yellow-700">
                    {correctCount}/{quiz.questions.length} benar. Pelajari lagi!
                  </p>
                </CardContent>
              </Card>
            )}
            <Link href="/dashboard/modules">
              <Button className="w-full">Kembali ke Daftar Modul</Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Section View
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/modules">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{module.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {module.soft_skill_categories && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                {module.soft_skill_categories.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {content.estimated_duration} menit
            </span>
            <span className="flex items-center gap-1">
              <Award className="h-3 w-3" />
              {content.xp_reward} XP
            </span>
          </div>
        </div>
        {completed && (
          <CheckCircle className="h-6 w-6 text-green-500" />
        )}
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {sections.map((_, idx) => (
          <div 
            key={idx}
            className={`h-1 flex-1 rounded-full transition-colors ${
              idx <= currentSection ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Section Content */}
      <motion.div
        key={currentSection}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {currentSectionData.type === "exercise" ? (
                <Lightbulb className="h-5 w-5 text-yellow-500" />
              ) : currentSectionData.type === "summary" ? (
                <BookOpen className="h-5 w-5 text-green-500" />
              ) : (
                <BookOpen className="h-5 w-5 text-primary" />
              )}
              <CardTitle className="text-lg">{currentSectionData.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {currentSectionData.content.split('\n\n').map((paragraph, pIdx) => (
                <p key={pIdx} className="mb-4 whitespace-pre-wrap">
                  {paragraph.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                  )}
                </p>
              ))}
            </div>
            
            {currentSectionData.key_takeaways && (
              <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-semibold mb-2">Poin Penting:</h4>
                <ul className="space-y-1">
                  {currentSectionData.key_takeaways.map((takeaway, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentSection > 0 && (
          <Button 
            variant="outline" 
            onClick={() => setCurrentSection(prev => prev - 1)}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sebelumnya
          </Button>
        )}
        
        {isLastSection ? (
          hasQuiz ? (
            <Button 
              onClick={() => setShowQuiz(true)}
              className="flex-1"
            >
              Mulai Quiz
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={completeModule}
              disabled={completing || completed}
              className="flex-1"
            >
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : completed ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Selesai
                </>
              ) : (
                "Selesaikan Modul"
              )}
            </Button>
          )
        ) : (
          <Button 
            onClick={() => setCurrentSection(prev => prev + 1)}
            className="flex-1"
          >
            Selanjutnya
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
