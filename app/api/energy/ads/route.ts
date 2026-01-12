import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Add energy from watching ads
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current energy
    const { data: energy } = await supabase
      .from("user_energies")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!energy) {
      return NextResponse.json({ error: "Energy not found" }, { status: 404 });
    }

    // Max 3 ads per day
    const MAX_ADS_PER_DAY = 3;
    const ENERGY_PER_AD = 1;

    if (energy.ads_watched_today >= MAX_ADS_PER_DAY) {
      return NextResponse.json({ 
        error: "Daily ad limit reached",
        adsWatched: energy.ads_watched_today,
        maxAds: MAX_ADS_PER_DAY
      }, { status: 400 });
    }

    // Add energy and increment ads watched
    const { data: updatedEnergy } = await supabase
      .from("user_energies")
      .update({ 
        current_energy: energy.current_energy + ENERGY_PER_AD,
        ads_watched_today: energy.ads_watched_today + 1
      })
      .eq("user_id", user.id)
      .select()
      .single();

    return NextResponse.json({ 
      success: true, 
      energy: updatedEnergy,
      added: ENERGY_PER_AD,
      adsRemaining: MAX_ADS_PER_DAY - (energy.ads_watched_today + 1)
    });
  } catch (error) {
    console.error("Ads reward error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
