import { createClient } from "@/lib/supabase/server";
import { Trophy, Medal, Award, User, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RankingUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  total_points: number;
}

interface Category {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  icon: string;
  color: string;
}

async function getRankings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get categories
  const { data: categories } = await supabase
    .from("soft_skill_categories")
    .select("*")
    .order("name");

  // Get overall rankings
  const { data: profiles } = await supabase
    .from("profiles")
    .select(`
      id,
      display_name,
      avatar_url,
      level,
      user_rankings (
        points
      )
    `)
    .limit(20);

  const overall = profiles
    ?.map(u => ({
      id: u.id,
      display_name: u.display_name || "User",
      avatar_url: u.avatar_url,
      level: u.level || 1,
      total_points: u.user_rankings?.reduce((sum, r) => sum + (r.points || 0), 0) || 0
    }))
    .sort((a, b) => b.total_points - a.total_points) || [];

  // Get user's own rankings
  let userRankings = null;
  if (user) {
    const { data } = await supabase
      .from("user_rankings")
      .select(`
        points,
        soft_skill_categories (
          id, name, slug, color
        )
      `)
      .eq("user_id", user.id);
    userRankings = data;
  }

  return { categories, overall, userRankings, currentUserId: user?.id };
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
}

export default async function RankingsPage() {
  const { categories, overall, userRankings, currentUserId } = await getRankings();

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Lihat peringkat Anda di setiap kategori soft skill</p>
      </div>

      {/* User's Own Rankings */}
      {userRankings && userRankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Poin Anda per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {userRankings.map((r: any) => (
                <div 
                  key={r.soft_skill_categories?.id}
                  className="p-3 rounded-lg bg-muted text-center"
                >
                  <p className="text-xs text-muted-foreground truncate">
                    {r.soft_skill_categories?.name}
                  </p>
                  <p className="text-2xl font-bold">{r.points || 0}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top 20 Overall
          </CardTitle>
          <CardDescription>Peringkat berdasarkan total poin di semua kategori</CardDescription>
        </CardHeader>
        <CardContent>
          {overall.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Belum ada data peringkat. Mulai latihan untuk mendapatkan poin!
            </p>
          ) : (
            <div className="space-y-2">
              {overall.map((user: RankingUser, index: number) => (
                <div 
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    user.id === currentUserId ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                  }`}
                >
                  <div className="w-8 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {user.display_name}
                      {user.id === currentUserId && (
                        <span className="text-xs text-primary ml-2">(Anda)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Level {user.level}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{user.total_points}</p>
                    <p className="text-xs text-muted-foreground">poin</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Kategori Soft Skill</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories?.map((cat: Category) => (
            <Card key={cat.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{cat.name}</CardTitle>
                <CardDescription className="text-xs">{cat.name_en}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Lihat leaderboard untuk kategori ini
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
