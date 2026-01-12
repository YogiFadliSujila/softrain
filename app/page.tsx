"use client";

import { motion } from "framer-motion";
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
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: MessageSquare,
    title: "Roleplayroll",
    description: "Simulasi diskusi dengan peran leader/staf. AI menilai gestur, ekspresi, dan argumentasi.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Mic,
    title: "Public Speaktrain",
    description: "Latihan pidato dengan evaluasi gerakan mata, intonasi suara, dan tingkat percaya diri.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Brain,
    title: "Critical Thinkquiz",
    description: "Soal-soal logika dan visual untuk melatih berpikir kritis dan refleksi personal.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: BookOpen,
    title: "JournAllist",
    description: "Baca artikel, buat pertanyaan, dan diskusikan dengan AI untuk memahami lebih dalam.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Scale,
    title: "Ethicquiz",
    description: "Dilema etika sehari-hari untuk menguji nilai dan prinsip hidup Anda.",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: Bot,
    title: "SoftrAI",
    description: "Chatbot AI profesional untuk diskusi pengembangan diri dan curhat progres.",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Softrain
            </h1>
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
              Platform berbasis AI untuk mengembangkan soft skills Anda.
              Latih komunikasi, kesadaran diri, dan nilai etika dengan cara yang interaktif.
            </p>
            <div className="mt-8 flex gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="gap-2">
                  Mulai Sekarang
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg">
                  Masuk
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl mx-auto"
          >
            {[
              { icon: Trophy, label: "6 Kategori Soft Skill", value: "6" },
              { icon: Zap, label: "5 Energi Gratis/Hari", value: "5" },
              { icon: GraduationCap, label: "Modul Pembelajaran", value: "∞" },
              { icon: Bot, label: "AI Real-time", value: "24/7" },
            ].map((stat, index) => (
              <div
                key={index}
                className="flex flex-col items-center p-4 rounded-lg bg-card border"
              >
                <stat.icon className="h-6 w-6 text-primary mb-2" />
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-muted-foreground text-center">
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">9 Fitur Utama</h2>
            <p className="mt-2 text-muted-foreground">
              Kembangkan berbagai aspek soft skills dengan fitur-fitur interaktif
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
            
            {/* System Features */}
            <motion.div variants={itemVariants}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group border-dashed">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Sistem Ranking</CardTitle>
                  <CardDescription>
                    Peringkat per kategori soft skill dan leaderboard keseluruhan.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group border-dashed">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Modul Pembelajaran</CardTitle>
                  <CardDescription>
                    Materi pembelajaran yang bertambah seiring kenaikan level Anda.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group border-dashed">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Energi & Premium</CardTitle>
                  <CardDescription>
                    5 energi gratis/hari. Upgrade ke premium mulai Rp 5.000/hari.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Siap Mengembangkan Soft Skills Anda?</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Mulai perjalanan pengembangan diri Anda sekarang. Gratis untuk memulai!
          </p>
          <Link href="/auth/register">
            <Button size="lg" className="mt-8 gap-2">
              Daftar Gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 Softrain. Platform Pengembangan Soft Skills Berbasis AI.</p>
        </div>
      </footer>
    </div>
  );
}
