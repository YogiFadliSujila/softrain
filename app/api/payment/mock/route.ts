import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mock payment endpoint for development testing without Midtrans
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { order_id } = await request.json();

    if (!order_id) {
      return NextResponse.json({ error: "order_id required" }, { status: 400 });
    }

    // Find the pending subscription
    const { data: subscription, error: findError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("payment_id", order_id)
      .eq("user_id", user.id)
      .single();

    if (findError || !subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Update to paid status
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ payment_status: "paid" })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Update subscription error:", updateError);
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }

    // Give user unlimited energy
    await supabase
      .from("user_energies")
      .update({ current_energy: 999 })
      .eq("user_id", user.id);

    return NextResponse.json({ 
      success: true, 
      message: "Pembayaran berhasil (mock mode)",
      subscription_id: subscription.id,
      ends_at: subscription.ends_at
    });
  } catch (error) {
    console.error("Mock payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
