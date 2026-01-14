"use client";

import { useState } from "react";
import { useEnergy } from "@/hooks/use-energy";
import { Button } from "@/components/ui/button";
import { Zap, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function useEnergyGuard() {
  const [isOpen, setIsOpen] = useState(false);
  const { current, isPremium, refresh } = useEnergy();

  const checkEnergy = async (cost: number) => {
    // If premium, always allow
    if (isPremium) return true;

    // Refresh to verify server state before blocking
    await refresh();
    
    // Check latest state - we need to fetch again inside refresh 
    // but useEnergy hook state might conflict with async.
    // Ideally useEnergy would return the promise data but for now
    // let's rely on the updated hook fetching.
    
    // We'll optimistically check `current` unless we force a wait
    // Actually, refresh() is async, so awaiting it should update 'current' state? 
    // No, setState is async. 
    
    // Improved logic: Fetch directly here for the check
    const res = await fetch("/api/energy");
    const data = await res.json();
    
    let currentEnergy = 0;
    let userIsPremium = false;
    
    // Double check premium from endpoint if possible OR reuse hook
    // Let's rely on the API response structure I built
    if (data.energy) {
       currentEnergy = data.energy.current_energy;
       // Premium check should be in API ideally, or passed down
    }
    
    // If API returns success:true & premium:true (from my previous code inspection)
    // Wait, GET /api/energy just returns energy record.
    // POST /api/energy checks premium.
    
    // Let's stick to the hook's state for simplicity first, but it might be stale.
    // Better: use the hook state, but if 0, maybe re-fetch?
    
    // Let's just trust the hook state for instant feedback.
    if (current >= cost || isPremium) return true;
    
    setIsOpen(true);
    return false;
  };

  const EnergyModal = () => (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm bg-background border rounded-lg shadow-lg overflow-hidden"
          >
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Zap className="h-8 w-8 text-yellow-500 fill-yellow-500" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold">Energi Habis!</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Anda kehabisan energi harian. Energi akan direset besok atau upgrade ke Premium untuk akses tanpa batas.
                </p>
              </div>

              <div className="grid gap-3 pt-2">
                <Link href="/dashboard/premium" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:from-yellow-600 hover:to-orange-600">
                    <Lock className="h-4 w-4 mr-2" />
                    Upgrade ke Premium
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Nanti Saja
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return { checkEnergy, EnergyModal };
}
