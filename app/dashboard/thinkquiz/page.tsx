import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Brain, Lock, CheckCircle, XCircle, ChevronRight, Zap, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Challenge {
  id: string;
  title: string;
  title_en: string | null;
  description: string;
  description_en: string | null;
  type: string;
  energy_cost: number;
  min_level: number;
  attempted: boolean;
  bestScore: number;
  accessible: boolean;
}

async function getThinkquizData() {
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

  const { data: challenges } = await supabase
    .from("challenges")
    .select(`
      id, title, title_en, description, description_en, 
      type, energy_cost, min_level
    `)
    .eq("feature", "thinkquiz")
    .eq("is_active", true)
    .order("min_level")
    .order("created_at");

  // Get best scores
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

  const challengesWithStatus = challenges?.map(c => ({
    ...c,
    attempted: c.id in scores,
    bestScore: scores[c.id] || 0,
    accessible: userLevel >= c.min_level
  })) || [];

  const practice = challengesWithStatus.filter(c => c.type === "practice");
  const challenge = challengesWithStatus.filter(c => c.type === "challenge");

  return { practice, challenge, userLevel, currentEnergy };
}

export default async function ThinkquizPage() {
  const { practice, challenge, userLevel, currentEnergy } = await getThinkquizData();

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Brain className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Thinkquiz</h1>
              <p className="text-muted-foreground">Asah berpikir kritis</p>
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
            Tingkatkan kemampuan berpikir logis dan kritis Anda melalui puzzle, 
            silogisme, dan analisis argumen. Jawab dengan cepat untuk bonus poin!
          </p>
          <div className="flex gap-2 mt-4 text-sm">
            <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-600">Berpikir Kritis</span>
            <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-600">Logika</span>
          </div>
        </CardContent>
      </Card>

      {/* Practice */}
      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 text-xs font-medium">Latihan</span>
          Puzzle Dasar
        </h2>
        
        {practice.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Belum ada soal. Jalankan seed_thinkquiz.sql di Supabase.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {practice.map((item: Challenge) => (
              <Card 
                key={item.id}
                className={`${!item.accessible ? "opacity-60" : ""} ${
                  item.attempted ? "border-green-500/50" : ""
                } hover:shadow-md transition-shadow`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      {item.attempted && (
                        item.bestScore >= 100 
                          ? <CheckCircle className="h-4 w-4 text-green-500" />
                          : <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      {!item.accessible && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs line-clamp-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {item.energy_cost}
                      </span>
                      {item.attempted && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" /> {item.bestScore}
                          </span>
                        </>
                      )}
                    </div>
                    {item.accessible ? (
                      <Link href={`/dashboard/thinkquiz/${item.id}`}>
                        <Button size="sm" variant={item.bestScore >= 100 ? "outline" : "default"}>
                          {item.attempted ? "Coba Lagi" : "Mulai"}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Perlu Level {item.min_level}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Challenge */}
      {challenge.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 text-xs font-medium">Tantangan</span>
            Puzzle Lanjutan
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {challenge.map((item: Challenge) => (
              <Card 
                key={item.id}
                className={`${!item.accessible ? "opacity-60" : ""} hover:shadow-md transition-shadow border-orange-500/20`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      {item.attempted && (
                        item.bestScore >= 100 
                          ? <CheckCircle className="h-4 w-4 text-green-500" />
                          : <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      {!item.accessible && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs line-clamp-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {item.energy_cost}
                      </span>
                      {item.attempted && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" /> {item.bestScore}
                          </span>
                        </>
                      )}
                    </div>
                    {item.accessible ? (
                      <Link href={`/dashboard/thinkquiz/${item.id}`}>
                        <Button size="sm" variant={item.bestScore >= 100 ? "outline" : "default"}>
                          {item.attempted ? "Coba Lagi" : "Mulai"}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Perlu Level {item.min_level}
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
