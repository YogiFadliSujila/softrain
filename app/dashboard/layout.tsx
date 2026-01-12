import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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
  Zap,
  LogOut,
  User,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Bot, label: "SoftrAI", href: "/dashboard/softrai" },
  { icon: Mic, label: "Speaktrain", href: "/dashboard/speaktrain" },
  { icon: MessageSquare, label: "Roleplayroll", href: "/dashboard/roleplayroll" },
  { icon: Brain, label: "Thinkquiz", href: "/dashboard/thinkquiz" },
  { icon: BookOpen, label: "JournAllist", href: "/dashboard/journallist" },
  { icon: Scale, label: "Ethicquiz", href: "/dashboard/ethicquiz" },
  { icon: GraduationCap, label: "Modul", href: "/dashboard/modules" },
  { icon: Trophy, label: "Ranking", href: "/dashboard/rankings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get user energy
  const { data: energy } = await supabase
    .from("user_energies")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/dashboard" className="font-bold text-xl text-primary">
            Softrain
          </Link>

          <div className="flex items-center gap-4">
            {/* Energy Display */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {energy?.current_energy ?? 5} Energi
              </span>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{profile?.display_name ?? user.email}</p>
                <p className="text-xs text-muted-foreground">Level {profile?.level ?? 1}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
            </div>

            {/* Logout */}
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="icon" type="submit" title="Keluar">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="hidden md:flex w-64 flex-col fixed left-0 top-14 h-[calc(100vh-3.5rem)] border-r bg-card">
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64">
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 p-2 text-muted-foreground hover:text-primary"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
