"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, ArrowRight, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Scenario {
  id: string;
  title: string;
}

interface JoinRoomCardProps {
  scenarios: Scenario[];
}

export function JoinRoomCard({ scenarios }: JoinRoomCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [roomCode, setRoomCode] = useState("");
  const [role, setRole] = useState<"hrd" | "kandidat">("hrd");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    if (!selectedScenario) {
      setError("Pilih skenario terlebih dahulu");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/roleplayroll/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          scenarioId: selectedScenario,
          role
        })
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/dashboard/roleplayroll/room/${data.roomCode}`);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Gagal membuat room");
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim()) {
      setError("Masukkan kode room");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/roleplayroll/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          roomCode: roomCode.trim().toUpperCase()
        })
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/dashboard/roleplayroll/room/${data.room.room_code}`);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Gagal join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Video className="h-5 w-5 text-purple-500" />
          Multiplayer Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "menu" && (
          <>
            <p className="text-sm text-muted-foreground">
              Roleplay bersama teman! Satu sebagai HRD, satu sebagai Kandidat.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setMode("create")}
                className="h-auto py-4 flex-col"
              >
                <Plus className="h-5 w-5 mb-1" />
                <span>Buat Room</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setMode("join")}
                className="h-auto py-4 flex-col"
              >
                <Users className="h-5 w-5 mb-1" />
                <span>Join Room</span>
              </Button>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <div>
              <label className="text-sm font-medium mb-2 block">Pilih Skenario</label>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full p-2 rounded-md border bg-background"
              >
                <option value="">-- Pilih Skenario --</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Peran Anda</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={role === "hrd" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRole("hrd")}
                >
                  HRD
                </Button>
                <Button
                  variant={role === "kandidat" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRole("kandidat")}
                >
                  Kandidat
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => { setMode("menu"); setError(null); }}
                disabled={loading}
              >
                Kembali
              </Button>
              <Button
                onClick={createRoom}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Buat Room
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {mode === "join" && (
          <>
            <div>
              <label className="text-sm font-medium mb-2 block">Kode Room</label>
              <Input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Contoh: ABC123"
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => { setMode("menu"); setError(null); setRoomCode(""); }}
                disabled={loading}
              >
                Kembali
              </Button>
              <Button
                onClick={joinRoom}
                disabled={loading || roomCode.length < 6}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Join Room
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
