import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Mic, Lock, ChevronRight, Zap, Clock, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Challenge {
  id: string;
  title: string;
  title_en: string | null;
  description: string;
  type: string;
  energy_cost: number;
  min_level: number;
  duration: number;
  attemptCount: number;
  bestScore: number;
  accessible: boolean;
}

async function getSpeaktrainData() {
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
      type, energy_cost, min_level, content
    `)
    .eq("feature", "speaktrain")
    .eq("is_active", true)
    .order("min_level")
    .order("created_at");

  // Get stats
  let stats: Record<string, { count: number; best: number }> = {};
  if (user) {
    const { data: attempts } = await supabase
      .from("challenge_attempts")
      .select("challenge_id, score")
      .eq("user_id", user.id);
    
    if (attempts) {
      attempts.forEach(a => {
        if (!stats[a.challenge_id]) {
          stats[a.challenge_id] = { count: 0, best: 0 };
        }
        stats[a.challenge_id].count++;
        if (a.score > stats[a.challenge_id].best) {
          stats[a.challenge_id].best = a.score;
        }
      });
    }
  }

  let currentEnergy = 5;
  if (user) {
    const { data: energy } = await supabase
      .from("user_energies")
      .select("current_energy")
      .eq("user_id", user.id)
      .single();
    currentEnergy = energy?.current_energy || 5;
  }

  const challengesWithStatus = challenges?.map(c => {
    const content = c.content as { duration_seconds: number };
    return {
      ...c,
      duration: content.duration_seconds,
      attemptCount: stats[c.id]?.count || 0,
      bestScore: stats[c.id]?.best || 0,
      accessible: userLevel >= c.min_level
    };
  }) || [];

  const practice = challengesWithStatus.filter(c => c.type === "practice");
  const challenge = challengesWithStatus.filter(c => c.type === "challenge");

  return { practice, challenge, userLevel, currentEnergy };
}

export default async function SpeaktrainPage() {
  const { practice, challenge, userLevel, currentEnergy } = await getSpeaktrainData();

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Mic className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Speaktrain</h1>
              <p className="text-muted-foreground">Latihan public speaking</p>
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
            Latih kemampuan berbicara Anda di depan umum. Rekam suara, dapatkan feedback 
            tentang durasi, kecepatan, dan konten pidato Anda.
          </p>
          <div className="flex gap-2 mt-4 text-sm">
            <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-600">Public Speaking</span>
            <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-600">Komunikasi</span>
          </div>
          
          {/* Browser Support Notice */}
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 text-yellow-700 text-sm">
            ⚠️ Fitur ini memerlukan akses mikrofon dan browser yang mendukung Web Speech API 
            (Chrome, Edge, Safari terbaru).
          </div>
        </CardContent>
      </Card>

      {/* Practice */}
      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 text-xs font-medium">Latihan</span>
          Topik Dasar
        </h2>
        
        {practice.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Belum ada topik. Jalankan seed_speaktrain.sql di Supabase.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {practice.map((item: Challenge) => (
              <Card 
                key={item.id}
                className={`${!item.accessible ? "opacity-60" : ""} ${
                  item.bestScore >= 80 ? "border-green-500/50" : ""
                } hover:shadow-md transition-shadow`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    {!item.accessible && (
                      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <CardDescription className="text-xs line-clamp-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {item.duration}s
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" /> {item.energy_cost}
                    </span>
                    {item.attemptCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> Best: {item.bestScore}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {item.attemptCount > 0 ? `${item.attemptCount}x latihan` : "Belum pernah"}
                    </span>
                    {item.accessible ? (
                      <Link href={`/dashboard/speaktrain/${item.id}`}>
                        <Button size="sm">
                          {item.attemptCount > 0 ? "Latih Lagi" : "Mulai"}
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
            Topik Lanjutan
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {challenge.map((item: Challenge) => (
              <Card 
                key={item.id}
                className={`${!item.accessible ? "opacity-60" : ""} hover:shadow-md transition-shadow border-orange-500/20`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    {!item.accessible && (
                      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <CardDescription className="text-xs line-clamp-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {item.duration}s
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" /> {item.energy_cost}
                    </span>
                    {item.attemptCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> Best: {item.bestScore}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {item.attemptCount > 0 ? `${item.attemptCount}x latihan` : "Belum pernah"}
                    </span>
                    {item.accessible ? (
                      <Link href={`/dashboard/speaktrain/${item.id}`}>
                        <Button size="sm">
                          {item.attemptCount > 0 ? "Latih Lagi" : "Mulai"}
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
