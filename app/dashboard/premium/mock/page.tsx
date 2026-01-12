"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, Zap, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MockPaymentPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!orderId) {
      setStatus("error");
      setMessage("Order ID tidak ditemukan");
      return;
    }

    // Simulate payment processing
    const processPayment = async () => {
      try {
        const res = await fetch("/api/payment/mock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId })
        });

        const data = await res.json();

        if (data.success) {
          setStatus("success");
          setMessage(`Berlangganan aktif sampai ${new Date(data.ends_at).toLocaleDateString("id-ID")}`);
        } else {
          setStatus("error");
          setMessage(data.error || "Pembayaran gagal");
        }
      } catch {
        setStatus("error");
        setMessage("Terjadi kesalahan koneksi");
      }
    };

    // Delay to simulate payment processing
    setTimeout(processPayment, 2000);
  }, [orderId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            {status === "loading" && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <CardTitle>Memproses Pembayaran...</CardTitle>
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardTitle className="text-green-600">Pembayaran Berhasil!</CardTitle>
              </>
            )}
            {status === "error" && (
              <>
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <CardTitle className="text-red-600">Pembayaran Gagal</CardTitle>
              </>
            )}
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{message}</p>
            
            {status === "success" && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Zap className="h-5 w-5" />
                  <span className="font-semibold">Energi Unlimited Aktif!</span>
                </div>
              </div>
            )}

            {status !== "loading" && (
              <Link href="/dashboard">
                <Button className="w-full">
                  Kembali ke Dashboard
                </Button>
              </Link>
            )}

            {status === "loading" && (
              <p className="text-xs text-muted-foreground">
                Mode Development - Tidak ada pembayaran nyata
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
