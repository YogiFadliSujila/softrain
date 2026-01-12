"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function PremiumPage() {
  const [loading, setLoading] = useState<string | null>(null);

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
        // Redirect to Midtrans payment page
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
