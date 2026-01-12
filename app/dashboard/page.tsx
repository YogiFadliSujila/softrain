import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { 
  MessageSquare, 
  Mic, 
  Brain, 
  BookOpen, 
  Scale, 
  Bot, 
  Trophy, 
  GraduationCap,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Bot,
    title: "SoftrAI",
    description: "Chat dengan AI untuk pengembangan diri",
    href: "/dashboard/softrai",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    energyCost: 0,
  },
  {
    icon: Mic,
    title: "Public Speaktrain",
    description: "Latihan pidato dengan evaluasi AI",
    href: "/dashboard/speaktrain",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    energyCost: 1,
  },
  {
    icon: MessageSquare,
    title: "Roleplayroll",
    description: "Simulasi diskusi dengan peran",
    href: "/dashboard/roleplayroll",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    energyCost: 3,
  },
  {
    icon: Brain,
    title: "Critical Thinkquiz",
    description: "Soal logika dan berpikir kritis",
    href: "/dashboard/thinkquiz",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    energyCost: 2,
  },
  {
    icon: BookOpen,
    title: "JournAllist",
    description: "Pemahaman artikel dan diskusi",
    href: "/dashboard/journallist",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    energyCost: 1,
  },
  {
    icon: Scale,
    title: "Ethicquiz",
    description: "Dilema etika sehari-hari",
    href: "/dashboard/ethicquiz",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    energyCost: 2,
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  // Get user rankings
  const { data: rankings } = await supabase
    .from("user_rankings")
    .select(`
      points,
      soft_skill_categories (
        name,
        slug,
        icon,
        color
      )
    `)
    .eq("user_id", user?.id);

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          Halo, {profile?.display_name?.split(" ")[0] ?? "User"}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Selamat datang kembali. Ayo tingkatkan soft skills Anda hari ini.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Level</CardDescription>
            <CardTitle className="text-3xl">{profile?.level ?? 1}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>{profile?.experience ?? 0} XP</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Poin</CardDescription>
            <CardTitle className="text-3xl">
              {rankings?.reduce((acc, r) => acc + (r.points || 0), 0) ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="h-3 w-3" />
              <span>6 Kategori</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Modul Selesai</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <GraduationCap className="h-3 w-3" />
              <span>Mulai belajar</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tantangan</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Brain className="h-3 w-3" />
              <span>Diselesaikan</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Fitur Latihan</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <Card className="h-full hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    {feature.energyCost > 0 && (
                      <span className="text-xs bg-muted px-2 py-1 rounded-full">
                        {feature.energyCost} ⚡
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-4">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" className="gap-1 p-0">
                    Mulai <ArrowRight className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Aksi Cepat</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/modules">
            <Button variant="outline" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Pelajari Modul
            </Button>
          </Link>
          <Link href="/dashboard/rankings">
            <Button variant="outline" className="gap-2">
              <Trophy className="h-4 w-4" />
              Lihat Ranking
            </Button>
          </Link>
          <Link href="/dashboard/softrai">
            <Button className="gap-2">
              <Bot className="h-4 w-4" />
              Chat dengan SoftrAI
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
