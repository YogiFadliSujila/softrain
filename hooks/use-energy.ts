"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface EnergyState {
  current: number;
  max: number;
  isPremium: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useEnergy() {
  const [energy, setEnergy] = useState<number>(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchEnergy = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check premium status
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("payment_status", "paid")
        .gte("ends_at", new Date().toISOString())
        .single();

      if (subscription) {
        setIsPremium(true);
        setEnergy(999);
      } else {
        setIsPremium(false);
        // Fetch energy
        const res = await fetch("/api/energy");
        const data = await res.json();
        if (data.energy) {
          setEnergy(data.energy.current_energy);
        }
      }
    } catch (error) {
      console.error("Failed to fetch energy:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchEnergy();

    // Listen for global energy updates
    const handleUpdate = () => fetchEnergy();
    window.addEventListener("energy-updated", handleUpdate);
    
    return () => {
      window.removeEventListener("energy-updated", handleUpdate);
    };
  }, [fetchEnergy]);

  return {
    current: energy,
    max: 5,
    isPremium,
    loading,
    refresh: fetchEnergy
  };
}
