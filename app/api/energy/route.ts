import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user energy
    const { data: energy, error } = await supabase
      .from("user_energies")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !energy) {
      // Create energy record if not exists
      const { data: newEnergy } = await supabase
        .from("user_energies")
        .insert({ user_id: user.id, current_energy: 5 })
        .select()
        .single();
      
      return NextResponse.json({ energy: newEnergy });
    }

    // Check if daily reset is needed (reset at 00:00 midnight)
    const lastReset = new Date(energy.last_daily_reset);
    const now = new Date();
    
    // Check if it's a different day (compare YYYY-MM-DD)
    const isDifferentDay = lastReset.toDateString() !== now.toDateString();

    if (isDifferentDay) {
      // Reset energy to 5 and ads watched to 0
      const { data: resetEnergy } = await supabase
        .from("user_energies")
        .update({ 
          current_energy: 5, 
          ads_watched_today: 0,
          last_daily_reset: now.toISOString()
        })
        .eq("user_id", user.id)
        .select()
        .single();
      
      return NextResponse.json({ energy: resetEnergy, reset: true });
    }

    return NextResponse.json({ energy });
  } catch (error) {
    console.error("Energy GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Use energy for an activity
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount = 1, action } = await request.json();

    // Get current energy
    const { data: energy } = await supabase
      .from("user_energies")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!energy) {
      return NextResponse.json({ error: "Energy not found" }, { status: 404 });
    }

    // Check if user has active subscription (unlimited energy)
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("payment_status", "paid")
      .gte("ends_at", new Date().toISOString())
      .single();

    // Premium users have unlimited energy
    if (subscription) {
      return NextResponse.json({ 
        success: true, 
        energy: { ...energy, current_energy: 999 },
        premium: true
      });
    }

    // Check if user has enough energy
    if (energy.current_energy < amount) {
      return NextResponse.json({ 
        error: "Not enough energy",
        current: energy.current_energy,
        required: amount
      }, { status: 400 });
    }

    // Deduct energy
    const { data: updatedEnergy } = await supabase
      .from("user_energies")
      .update({ current_energy: energy.current_energy - amount })
      .eq("user_id", user.id)
      .select()
      .single();

    return NextResponse.json({ 
      success: true, 
      energy: updatedEnergy,
      used: amount,
      action
    });
  } catch (error) {
    console.error("Energy POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
