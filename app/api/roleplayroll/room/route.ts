import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Generate 6-character room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get room by code
  if (code) {
    const { data: room, error } = await supabase
      .from("roleplay_rooms")
      .select(`
        *,
        scenario:challenges(id, title, content),
        host:profiles!roleplay_rooms_host_id_fkey(id, display_name, avatar_url),
        guest:profiles!roleplay_rooms_guest_id_fkey(id, display_name, avatar_url)
      `)
      .eq("room_code", code.toUpperCase())
      .single();

    if (error || !room) {
      return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ room });
  }

  // Get user's active rooms
  const { data: rooms } = await supabase
    .from("roleplay_rooms")
    .select(`
      *,
      scenario:challenges(id, title),
      host:profiles!roleplay_rooms_host_id_fkey(display_name),
      guest:profiles!roleplay_rooms_guest_id_fkey(display_name)
    `)
    .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
    .in("status", ["waiting", "active"])
    .order("created_at", { ascending: false });

  return NextResponse.json({ rooms: rooms || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { action, scenarioId, roomCode, role } = body;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // CREATE ROOM
  if (action === "create") {
    if (!scenarioId) {
      return NextResponse.json({ error: "Scenario ID required" }, { status: 400 });
    }

    // Generate unique room code
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("roleplay_rooms")
        .select("id")
        .eq("room_code", code)
        .single();
      
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    // Create room
    const { data: room, error } = await supabase
      .from("roleplay_rooms")
      .insert({
        room_code: code,
        scenario_id: scenarioId,
        host_id: user.id,
        host_role: role || "hrd",
        guest_role: role === "hrd" ? "kandidat" : "hrd",
        status: "waiting"
      })
      .select()
      .single();

    if (error) {
      console.error("Create room error:", error);
      return NextResponse.json({ error: "Gagal membuat room" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      room,
      roomCode: code 
    });
  }

  // JOIN ROOM
  if (action === "join") {
    if (!roomCode) {
      return NextResponse.json({ error: "Room code required" }, { status: 400 });
    }

    const upperCode = roomCode.toUpperCase();
    console.log("[JOIN] Attempting to join room:", upperCode, "by user:", user.id);

    // Find room - use maybeSingle to avoid error when not found
    const { data: room, error: findError } = await supabase
      .from("roleplay_rooms")
      .select("*")
      .eq("room_code", upperCode)
      .eq("status", "waiting")
      .maybeSingle();

    console.log("[JOIN] Find result:", { room: room?.id, error: findError });

    if (findError) {
      console.error("[JOIN] Find error:", findError);
      return NextResponse.json({ error: "Error mencari room: " + findError.message }, { status: 500 });
    }

    if (!room) {
      return NextResponse.json({ error: "Room tidak ditemukan atau sudah dimulai" }, { status: 404 });
    }

    if (room.host_id === user.id) {
      return NextResponse.json({ error: "Anda adalah host room ini" }, { status: 400 });
    }

    if (room.guest_id) {
      return NextResponse.json({ error: "Room sudah penuh" }, { status: 400 });
    }

    // Join as guest
    console.log("[JOIN] Updating room with guest_id:", user.id);
    const { data: updated, error: updateError } = await supabase
      .from("roleplay_rooms")
      .update({ guest_id: user.id })
      .eq("id", room.id)
      .eq("status", "waiting")
      .is("guest_id", null)
      .select()
      .maybeSingle();

    console.log("[JOIN] Update result:", { updated: updated?.id, error: updateError });

    if (updateError) {
      console.error("[JOIN] Update error:", updateError);
      return NextResponse.json({ error: "Gagal join room: " + updateError.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Room sudah diisi user lain" }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      room: updated 
    });
  }

  // START ROOM (host only)
  if (action === "start") {
    if (!roomCode) {
      return NextResponse.json({ error: "Room code required" }, { status: 400 });
    }

    const { data: room } = await supabase
      .from("roleplay_rooms")
      .select("*")
      .eq("room_code", roomCode.toUpperCase())
      .single();

    if (!room || room.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!room.guest_id) {
      return NextResponse.json({ error: "Menunggu partner bergabung" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("roleplay_rooms")
      .update({ 
        status: "active",
        started_at: new Date().toISOString()
      })
      .eq("id", room.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Gagal start room" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      room: updated 
    });
  }

  // LEAVE ROOM
  if (action === "leave") {
    if (!roomCode) {
      return NextResponse.json({ error: "Room code required" }, { status: 400 });
    }

    const { data: room } = await supabase
      .from("roleplay_rooms")
      .select("*")
      .eq("room_code", roomCode.toUpperCase())
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
    }

    // If host leaves, cancel room
    if (room.host_id === user.id) {
      await supabase
        .from("roleplay_rooms")
        .update({ status: "cancelled" })
        .eq("id", room.id);
    } 
    // If guest leaves, remove guest
    else if (room.guest_id === user.id) {
      await supabase
        .from("roleplay_rooms")
        .update({ guest_id: null })
        .eq("id", room.id);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
