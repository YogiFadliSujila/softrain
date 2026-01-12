import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { GraduationCap, Lock, CheckCircle, BookOpen, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Module {
  id: string;
  title: string;
  title_en: string | null;
  description: string;
  min_level: number;
  max_level: number;
  order_index: number;
  completed: boolean;
  accessible: boolean;
  soft_skill_categories: {
    id: string;
    name: string;
    color: string;
  } | null;
}

async function getModulesData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get all modules
  const { data: modules } = await supabase
    .from("modules")
    .select(`
      *,
      soft_skill_categories (
        id, name, name_en, slug, color
      )
    `)
    .eq("is_active", true)
    .order("order_index");

  // Get user progress
  let progress: Record<string, boolean> = {};
  let userLevel = 1;
  
  if (user) {
    const { data: userProgress } = await supabase
      .from("module_progress")
      .select("module_id, completed")
      .eq("user_id", user.id);

    if (userProgress) {
      progress = userProgress.reduce((acc, p) => {
        acc[p.module_id] = p.completed;
        return acc;
      }, {} as Record<string, boolean>);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("level")
      .eq("id", user.id)
      .single();
    
    userLevel = profile?.level || 1;
  }

  // Get categories
  const { data: categories } = await supabase
    .from("soft_skill_categories")
    .select("*")
    .order("name");

  const modulesWithProgress = modules?.map(m => ({
    ...m,
    completed: progress[m.id] || false,
    accessible: userLevel >= m.min_level && userLevel <= m.max_level
  })) || [];

  // Count completed
  const completedCount = Object.values(progress).filter(Boolean).length;

  return { 
    modules: modulesWithProgress, 
    categories, 
    userLevel,
    completedCount,
    totalCount: modules?.length || 0
  };
}

export default async function ModulesPage() {
  const { modules, categories, userLevel, completedCount, totalCount } = await getModulesData();

  // Group modules by category
  const modulesByCategory = modules.reduce((acc, m) => {
    const catId = m.soft_skill_categories?.id || "uncategorized";
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(m);
    return acc;
  }, {} as Record<string, Module[]>);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modul Pembelajaran</h1>
          <p className="text-muted-foreground">
            Pelajari materi sesuai level Anda (Level {userLevel})
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{completedCount}/{totalCount}</p>
          <p className="text-xs text-muted-foreground">Selesai</p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress Pembelajaran</span>
                <span>{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {modules.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Belum Ada Modul</h3>
            <p className="text-muted-foreground mt-2">
              Modul pembelajaran akan segera ditambahkan. 
              Untuk sementara, coba fitur latihan lainnya!
            </p>
            <Link href="/dashboard">
              <Button className="mt-4">Kembali ke Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Modules by Category */}
      {categories?.map(cat => {
        const catModules = modulesByCategory[cat.id] || [];
        if (catModules.length === 0) return null;

        return (
          <div key={cat.id}>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full bg-${cat.color}-500`}></span>
              {cat.name}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {catModules.map((module: Module) => (
                <Card 
                  key={module.id}
                  className={`${!module.accessible ? "opacity-60" : ""} ${
                    module.completed ? "border-green-500/50" : ""
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{module.title}</CardTitle>
                      {module.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : !module.accessible ? (
                        <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : null}
                    </div>
                    <CardDescription className="text-xs">
                      {module.description?.slice(0, 100)}
                      {module.description?.length > 100 && "..."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Level {module.min_level}-{module.max_level}
                      </span>
                      {module.accessible ? (
                        <Link href={`/dashboard/modules/${module.id}`}>
                          <Button size="sm" variant={module.completed ? "outline" : "default"}>
                            {module.completed ? "Lihat Ulang" : "Mulai"}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Perlu Level {module.min_level}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
