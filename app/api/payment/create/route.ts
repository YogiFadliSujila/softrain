import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Midtrans Sandbox API
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-XXXXXXX";
const MIDTRANS_API_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";

interface SubscriptionPlan {
  name: string;
  price: number;
  duration_days: number;
}

const PLANS: Record<string, SubscriptionPlan> = {
  daily: { name: "Harian", price: 5000, duration_days: 1 },
  monthly: { name: "Bulanan", price: 40000, duration_days: 30 },
  yearly: { name: "Tahunan", price: 250000, duration_days: 365 },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await request.json();

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const selectedPlan = PLANS[plan];
    const orderId = `SOFTRAIN-${plan.toUpperCase()}-${Date.now()}`;

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    // Create Midtrans transaction
    const transactionDetails = {
      transaction_details: {
        order_id: orderId,
        gross_amount: selectedPlan.price,
      },
      customer_details: {
        email: user.email,
        first_name: profile?.display_name || "User",
      },
      item_details: [
        {
          id: plan,
          price: selectedPlan.price,
          quantity: 1,
          name: `Softrain Premium ${selectedPlan.name}`,
        },
      ],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/premium/success`,
      },
    };

    // Check if server key is configured
    if (!process.env.MIDTRANS_SERVER_KEY) {
      // Return mock token for development
      return NextResponse.json({
        token: "mock-token-" + orderId,
        redirect_url: "/dashboard/premium/mock",
        order_id: orderId,
        message: "Midtrans belum dikonfigurasi. Ini adalah mode development.",
      });
    }

    // Create authorization header
    const authString = Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64");

    const response = await fetch(MIDTRANS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify(transactionDetails),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Midtrans error:", data);
      return NextResponse.json({ error: "Payment gateway error" }, { status: 500 });
    }

    // Save subscription record (pending)
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + selectedPlan.duration_days * 24 * 60 * 60 * 1000);

    await supabase.from("subscriptions").insert({
      user_id: user.id,
      plan,
      price: selectedPlan.price,
      payment_id: orderId,
      payment_status: "pending",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    });

    return NextResponse.json({
      token: data.token,
      redirect_url: data.redirect_url,
      order_id: orderId,
    });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
