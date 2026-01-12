"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, Zap, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const statusCode = searchParams.get("status_code");
  const transactionStatus = searchParams.get("transaction_status");
  
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [message, setMessage] = useState("");
  const [endDate, setEndDate] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    if (!orderId) {
      setStatus("failed");
      setMessage("Order ID tidak ditemukan");
      return;
    }

    processPayment();
  }, [orderId, transactionStatus]);

  const processPayment = async () => {
    try {
      // Determine payment status from Midtrans response
      let paymentStatus = "pending";
      
      if (transactionStatus === "settlement" || transactionStatus === "capture") {
        paymentStatus = "paid";
      } else if (transactionStatus === "pending") {
        paymentStatus = "pending";
      } else if (transactionStatus === "deny" || transactionStatus === "cancel" || transactionStatus === "expire") {
        paymentStatus = "cancelled";
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus("failed");
        setMessage("Anda harus login untuk melihat status pembayaran");
        return;
      }

      // Find the subscription
      const { data: subscription, error: findError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("payment_id", orderId)
        .eq("user_id", user.id)
        .single();

      if (findError || !subscription) {
        setStatus("failed");
        setMessage("Subscription tidak ditemukan. Hubungi support jika Anda sudah membayar.");
        return;
      }

      // Update subscription status
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ payment_status: paymentStatus })
        .eq("id", subscription.id);

      if (updateError) {
        console.error("Update subscription error:", updateError);
        // Don't fail - still show the status to user
      }

      // If payment successful, give unlimited energy
      if (paymentStatus === "paid") {
        await supabase
          .from("user_energies")
          .update({ current_energy: 999 })
          .eq("user_id", user.id);

        setStatus("success");
        setMessage("Pembayaran berhasil! Energi unlimited telah diaktifkan.");
        setEndDate(subscription.ends_at);
      } else if (paymentStatus === "pending") {
        setStatus("pending");
        setMessage("Pembayaran sedang diproses. Silakan selesaikan pembayaran Anda.");
      } else {
        setStatus("failed");
        setMessage("Pembayaran dibatalkan atau gagal. Silakan coba lagi.");
      }
    } catch (err) {
      console.error("Process payment error:", err);
      setStatus("failed");
      setMessage("Terjadi kesalahan. Silakan hubungi support.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            {status === "loading" && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
                <CardTitle>Memproses Pembayaran...</CardTitle>
              </>
            )}
            {status === "success" && (
              <>
                <div className="w-16 h-16 rounded-full bg-green-500/20 mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <CardTitle className="text-green-600">Pembayaran Berhasil!</CardTitle>
              </>
            )}
            {status === "pending" && (
              <>
                <div className="w-16 h-16 rounded-full bg-yellow-500/20 mx-auto mb-4 flex items-center justify-center">
                  <AlertTriangle className="h-10 w-10 text-yellow-500" />
                </div>
                <CardTitle className="text-yellow-600">Menunggu Pembayaran</CardTitle>
              </>
            )}
            {status === "failed" && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/20 mx-auto mb-4 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
                <CardTitle className="text-red-600">Pembayaran Gagal</CardTitle>
              </>
            )}
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{message}</p>
            
            {status === "success" && (
              <>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                    <Zap className="h-5 w-5" />
                    <span className="font-semibold">Energi Unlimited Aktif!</span>
                  </div>
                  {endDate && (
                    <p className="text-sm text-muted-foreground">
                      Berlaku sampai: {formatDate(endDate)}
                    </p>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  <p>Order ID: {orderId}</p>
                </div>
              </>
            )}

            {status === "pending" && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm">
                  Jika Anda sudah membayar, status akan diupdate otomatis dalam beberapa menit.
                </p>
              </div>
            )}

            {status === "failed" && orderId && (
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                <p>Order ID: {orderId}</p>
                <p className="mt-1">Simpan ID ini jika Anda perlu menghubungi support.</p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-4">
              {status === "success" && (
                <Link href="/dashboard">
                  <Button className="w-full">
                    Mulai Latihan
                  </Button>
                </Link>
              )}
              
              {status === "pending" && (
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                  Cek Status Lagi
                </Button>
              )}
              
              {status === "failed" && (
                <Link href="/dashboard/premium">
                  <Button className="w-full">
                    Coba Lagi
                  </Button>
                </Link>
              )}
              
              <Link href="/dashboard/premium">
                <Button variant="ghost" className="w-full">
                  Kembali ke Premium
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
