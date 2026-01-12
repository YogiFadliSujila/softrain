import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BookOpen, Lock, CheckCircle, ChevronRight, Zap, Clock, CircleHelp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Article {
  id: string;
  title: string;
  title_en: string | null;
  description: string;
  type: string;
  energy_cost: number;
  min_level: number;
  readTime: number;
  questionCount: number;
  attempted: boolean;
  bestScore: number;
  accessible: boolean;
}

async function getArticlesData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userLevel = 1;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("level")
      .eq("id", user.id)
      .single();
    userLevel = profile?.level || 1;
  }

  const { data: articles } = await supabase
    .from("challenges")
    .select(`
      id, title, title_en, description, description_en, 
      type, energy_cost, min_level, content
    `)
    .eq("feature", "journallist")
    .eq("is_active", true)
    .order("min_level")
    .order("created_at");

  // Get scores
  let scores: Record<string, number> = {};
  if (user) {
    const { data: attempts } = await supabase
      .from("challenge_attempts")
      .select("challenge_id, score")
      .eq("user_id", user.id);
    
    if (attempts) {
      attempts.forEach(a => {
        if (!scores[a.challenge_id] || a.score > scores[a.challenge_id]) {
          scores[a.challenge_id] = a.score;
        }
      });
    }
  }

  // Get energy
  let currentEnergy = 5;
  if (user) {
    const { data: energy } = await supabase
      .from("user_energies")
      .select("current_energy")
      .eq("user_id", user.id)
      .single();
    currentEnergy = energy?.current_energy || 5;
  }

  const articlesWithStatus = articles?.map(a => {
    const content = a.content as { article: { read_time: number }; questions: Array<{ id: number }> };
    return {
      ...a,
      readTime: content.article?.read_time || 5,
      questionCount: content.questions?.length || 0,
      attempted: a.id in scores,
      bestScore: scores[a.id] || 0,
      accessible: userLevel >= a.min_level
    };
  }) || [];

  const practice = articlesWithStatus.filter(a => a.type === "practice");
  const challenge = articlesWithStatus.filter(a => a.type === "challenge");

  return { practice, challenge, userLevel, currentEnergy };
}

export default async function JournAllistPage() {
  const { practice, challenge, userLevel, currentEnergy } = await getArticlesData();

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">JournAllist</h1>
              <p className="text-muted-foreground">Baca, pahami, analisis</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-lg font-bold">
            <Zap className="h-5 w-5 text-primary" />
            {currentEnergy}
          </div>
          <p className="text-xs text-muted-foreground">Energi</p>
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            Baca artikel tentang pengembangan diri dan jawab pertanyaan pemahaman. 
            Latih kemampuan membaca kritis dan retensi informasi Anda.
          </p>
          <div className="flex gap-2 mt-4 text-sm">
            <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-600">Komunikasi</span>
            <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-600">Pemahaman Bacaan</span>
          </div>
        </CardContent>
      </Card>

      {/* Practice Articles */}
      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 text-xs font-medium">Latihan</span>
          Artikel Dasar
        </h2>
        
        {practice.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Belum ada artikel. Jalankan seed_journallist.sql di Supabase.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {practice.map((article: Article) => (
              <Card 
                key={article.id}
                className={`${!article.accessible ? "opacity-60" : ""} ${
                  article.attempted && article.bestScore >= 80 ? "border-green-500/50" : ""
                } hover:shadow-md transition-shadow`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base leading-tight">{article.title}</CardTitle>
                    {article.attempted && article.bestScore >= 80 && (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                    {!article.accessible && (
                      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <CardDescription className="text-xs line-clamp-2">
                    {article.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {article.readTime} menit
                    </span>
                    <span className="flex items-center gap-1">
                      <CircleHelp className="h-3 w-3" /> {article.questionCount} soal
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" /> {article.energy_cost}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {article.attempted ? (
                      <span className={`text-sm font-medium ${
                        article.bestScore >= 80 ? "text-green-600" : "text-yellow-600"
                      }`}>
                        Skor: {article.bestScore}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum dikerjakan</span>
                    )}
                    {article.accessible ? (
                      <Link href={`/dashboard/journallist/${article.id}`}>
                        <Button size="sm" variant={article.bestScore >= 80 ? "outline" : "default"}>
                          {article.attempted ? "Baca Lagi" : "Baca"}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Perlu Level {article.min_level}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Challenge Articles */}
      {challenge.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 text-xs font-medium">Tantangan</span>
            Artikel Lanjutan
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {challenge.map((article: Article) => (
              <Card 
                key={article.id}
                className={`${!article.accessible ? "opacity-60" : ""} hover:shadow-md transition-shadow border-orange-500/20`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base leading-tight">{article.title}</CardTitle>
                    {article.attempted && article.bestScore >= 80 && (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                    {!article.accessible && (
                      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <CardDescription className="text-xs line-clamp-2">
                    {article.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {article.readTime} menit
                    </span>
                    <span className="flex items-center gap-1">
                      <CircleHelp className="h-3 w-3" /> {article.questionCount} soal
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" /> {article.energy_cost}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {article.attempted ? (
                      <span className={`text-sm font-medium ${
                        article.bestScore >= 80 ? "text-green-600" : "text-yellow-600"
                      }`}>
                        Skor: {article.bestScore}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum dikerjakan</span>
                    )}
                    {article.accessible ? (
                      <Link href={`/dashboard/journallist/${article.id}`}>
                        <Button size="sm" variant={article.bestScore >= 80 ? "outline" : "default"}>
                          {article.attempted ? "Baca Lagi" : "Baca"}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Perlu Level {article.min_level}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
