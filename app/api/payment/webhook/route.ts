import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Midtrans notification handler (webhook)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;

    // Verify signature (in production)
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (serverKey) {
      const expectedSignature = crypto
        .createHash("sha512")
        .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
        .digest("hex");

      if (signature_key !== expectedSignature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    const supabase = await createClient();

    // Map Midtrans status to our status
    let paymentStatus = "pending";
    if (transaction_status === "capture" || transaction_status === "settlement") {
      paymentStatus = "paid";
    } else if (transaction_status === "cancel" || transaction_status === "deny" || transaction_status === "expire") {
      paymentStatus = "cancelled";
    }

    // Update subscription status
    const { error } = await supabase
      .from("subscriptions")
      .update({ payment_status: paymentStatus })
      .eq("payment_id", order_id);

    if (error) {
      console.error("Failed to update subscription:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // If payment successful, give user unlimited energy
    if (paymentStatus === "paid") {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("payment_id", order_id)
        .single();

      if (subscription) {
        await supabase
          .from("user_energies")
          .update({ current_energy: 999 })
          .eq("user_id", subscription.user_id);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
