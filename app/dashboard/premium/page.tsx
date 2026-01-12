"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Star, Loader2, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const plans = [
  {
    id: "daily",
    name: "Harian",
    price: 5000,
    duration: "1 hari",
    icon: Zap,
    features: ["Energi unlimited 24 jam", "Akses semua fitur"],
    popular: false,
  },
  {
    id: "monthly",
    name: "Bulanan",
    price: 40000,
    duration: "30 hari",
    icon: Star,
    features: ["Energi unlimited 30 hari", "Akses semua fitur", "Hemat 20%"],
    popular: true,
  },
  {
    id: "yearly",
    name: "Tahunan",
    price: 250000,
    duration: "365 hari",
    icon: Crown,
    features: ["Energi unlimited 1 tahun", "Akses semua fitur", "Hemat 48%", "Prioritas support"],
    popular: false,
  },
];

interface Subscription {
  id: string;
  plan: string;
  price: number;
  payment_status: string;
  starts_at: string;
  ends_at: string;
}

export default function PremiumPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const supabase = createClient();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for active subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("payment_status", "paid")
        .gte("ends_at", new Date().toISOString())
        .order("ends_at", { ascending: false })
        .limit(1)
        .single();

      if (subscription) {
        setActiveSubscription(subscription);
      }
    } catch (err) {
      console.error("Check subscription error:", err);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handlePurchase = async (planId: string) => {
    setLoading(planId);

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await response.json();

      if (data.redirect_url) {
        // Redirect to payment page (or mock page in dev)
        window.location.href = data.redirect_url;
      } else if (data.token) {
        // Use Snap.js (if loaded)
        // @ts-ignore
        if (window.snap) {
          // @ts-ignore
          window.snap.pay(data.token);
        } else {
          alert("Midtrans belum dikonfigurasi. Order ID: " + data.order_id);
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(null);
    }
  };

  const getPlanName = (planId: string) => {
    return plans.find(p => p.id === planId)?.name || planId;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (checkingSubscription) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show active subscription
  if (activeSubscription) {
    const daysRemaining = getDaysRemaining(activeSubscription.ends_at);
    
    return (
      <div className="max-w-2xl mx-auto pb-20 md:pb-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-green-600">Premium Aktif!</CardTitle>
              <CardDescription>
                Anda sedang berlangganan paket {getPlanName(activeSubscription.plan)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted text-center">
                  <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">Unlimited</p>
                  <p className="text-sm text-muted-foreground">Energi</p>
                </div>
                <div className="p-4 rounded-lg bg-muted text-center">
                  <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{daysRemaining}</p>
                  <p className="text-sm text-muted-foreground">Hari Tersisa</p>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paket</span>
                  <span className="font-medium">{getPlanName(activeSubscription.plan)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Harga</span>
                  <span className="font-medium">Rp {activeSubscription.price.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mulai</span>
                  <span className="font-medium">{formatDate(activeSubscription.starts_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Berakhir</span>
                  <span className="font-medium">{formatDate(activeSubscription.ends_at)}</span>
                </div>
              </div>

              {/* Benefits */}
              <div>
                <h3 className="font-semibold mb-3">Keuntungan Premium:</h3>
                <ul className="space-y-2">
                  {[
                    "Energi unlimited tanpa batas",
                    "Akses semua fitur latihan",
                    "Tidak ada iklan",
                    "Prioritas support"
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              {daysRemaining <= 7 && (
                <p className="text-sm text-yellow-600 text-center">
                  ⚠️ Langganan Anda akan berakhir dalam {daysRemaining} hari
                </p>
              )}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setActiveSubscription(null)}
              >
                Lihat Paket Lainnya
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show pricing plans
  return (
    <div className="max-w-5xl mx-auto pb-20 md:pb-0">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Upgrade ke Premium</h1>
        <p className="text-muted-foreground mt-2">
          Dapatkan energi unlimited dan akses penuh ke semua fitur
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`relative h-full ${plan.popular ? "border-primary shadow-lg" : ""}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Paling Populer
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
                  plan.popular ? "bg-primary/20" : "bg-muted"
                }`}>
                  <plan.icon className={`h-6 w-6 ${plan.popular ? "text-primary" : ""}`} />
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.duration}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-4">
                  <span className="text-4xl font-bold">
                    Rp {plan.price.toLocaleString("id-ID")}
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-left">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(plan.id)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Pilih Paket"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 text-center text-sm text-muted-foreground">
        <p>Pembayaran aman via Midtrans</p>
        <p className="mt-1">Bisa bayar pakai QRIS, Transfer Bank, OVO, GoPay, dll.</p>
      </div>
    </div>
  );
}
