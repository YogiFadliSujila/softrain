import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, Lock, ChevronRight, Zap, MessageSquare, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Scenario {
  id: string;
  title: string;
  title_en: string | null;
  description: string;
  type: string;
  energy_cost: number;
  min_level: number;
  attemptCount: number;
  bestScore: number;
  accessible: boolean;
  content: {
    scenario: { title: string; your_role: string; ai_role: string };
    ai_persona: { name: string };
  };
}

async function getRoleplayrollData() {
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

  const { data: scenarios } = await supabase
    .from("challenges")
    .select(`
      id, title, title_en, description, description_en, 
      type, energy_cost, min_level, content
    `)
    .eq("feature", "roleplayroll")
    .eq("is_active", true)
    .order("min_level")
    .order("created_at");

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

  const scenariosWithStatus = scenarios?.map(s => ({
    ...s,
    attemptCount: stats[s.id]?.count || 0,
    bestScore: stats[s.id]?.best || 0,
    accessible: userLevel >= s.min_level
  })) || [];

  const practice = scenariosWithStatus.filter(s => s.type === "practice");
  const challenge = scenariosWithStatus.filter(s => s.type === "challenge");

  return { practice, challenge, userLevel, currentEnergy };
}

export default async function RoleplayrollPage() {
  const { practice, challenge, userLevel, currentEnergy } = await getRoleplayrollData();

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Roleplayroll</h1>
              <p className="text-muted-foreground">Simulasi percakapan</p>
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
            Latih kemampuan komunikasi Anda dalam berbagai situasi nyata. 
            Berinteraksi dengan AI yang memerankan berbagai karakter profesional.
          </p>
          <div className="flex gap-2 mt-4 text-sm">
            <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-600">Role Playing</span>
            <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-600">Komunikasi</span>
          </div>
        </CardContent>
      </Card>

      {/* Practice */}
      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 text-xs font-medium">Latihan</span>
          Skenario Dasar
        </h2>
        
        {practice.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Belum ada skenario. Jalankan seed_roleplayroll.sql di Supabase.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {practice.map((scenario: Scenario) => {
              const content = scenario.content as Scenario["content"];
              return (
                <Card 
                  key={scenario.id}
                  className={`${!scenario.accessible ? "opacity-60" : ""} ${
                    scenario.bestScore >= 80 ? "border-green-500/50" : ""
                  } hover:shadow-md transition-shadow`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{scenario.title}</CardTitle>
                      {!scenario.accessible && (
                        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <CardDescription className="text-xs line-clamp-2">
                      {scenario.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground mb-3">
                      <p><strong>Anda:</strong> {content.scenario.your_role}</p>
                      <p><strong>AI:</strong> {content.ai_persona.name} ({content.scenario.ai_role})</p>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Chat
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {scenario.energy_cost}
                      </span>
                      {scenario.attemptCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> Best: {scenario.bestScore}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {scenario.attemptCount > 0 ? `${scenario.attemptCount}x latihan` : "Belum pernah"}
                      </span>
                      {scenario.accessible ? (
                        <Link href={`/dashboard/roleplayroll/${scenario.id}`}>
                          <Button size="sm">
                            {scenario.attemptCount > 0 ? "Main Lagi" : "Mulai"}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Perlu Level {scenario.min_level}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Challenge */}
      {challenge.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 text-xs font-medium">Tantangan</span>
            Skenario Lanjutan
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {challenge.map((scenario: Scenario) => {
              const content = scenario.content as Scenario["content"];
              return (
                <Card 
                  key={scenario.id}
                  className={`${!scenario.accessible ? "opacity-60" : ""} hover:shadow-md transition-shadow border-orange-500/20`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{scenario.title}</CardTitle>
                      {!scenario.accessible && (
                        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <CardDescription className="text-xs line-clamp-2">
                      {scenario.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground mb-3">
                      <p><strong>Anda:</strong> {content.scenario.your_role}</p>
                      <p><strong>AI:</strong> {content.ai_persona.name}</p>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Chat
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {scenario.energy_cost}
                      </span>
                      {scenario.attemptCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> Best: {scenario.bestScore}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {scenario.attemptCount > 0 ? `${scenario.attemptCount}x latihan` : "Belum pernah"}
                      </span>
                      {scenario.accessible ? (
                        <Link href={`/dashboard/roleplayroll/${scenario.id}`}>
                          <Button size="sm">
                            {scenario.attemptCount > 0 ? "Main Lagi" : "Mulai"}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Perlu Level {scenario.min_level}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
