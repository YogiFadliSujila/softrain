import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

interface Message {
  sender_id: string;
  sender_name: string;
  content: string;
}

interface EvaluationResult {
  hostScore: number;
  guestScore: number;
  hostFeedback: {
    komunikasi: string;
    profesionalisme: string;
    kualitasArgumen: string;
    saran: string;
  };
  guestFeedback: {
    komunikasi: string;
    profesionalisme: string;
    kualitasArgumen: string;
    saran: string;
  };
  overallSummary: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { roomCode, messages } = body;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!roomCode) {
    return NextResponse.json({ error: "Room code required" }, { status: 400 });
  }

  // Check Groq API key
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured. Add GROQ_API_KEY to .env.local" }, { status: 500 });
  }

  // Get room data
  const { data: room, error: roomError } = await supabase
    .from("roleplay_rooms")
    .select(`
      *,
      scenario:challenges(title, content),
      host:profiles!roleplay_rooms_host_id_fkey(display_name),
      guest:profiles!roleplay_rooms_guest_id_fkey(display_name)
    `)
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
  }

  // Check if user is participant
  if (room.host_id !== user.id && room.guest_id !== user.id) {
    return NextResponse.json({ error: "Anda bukan peserta room ini" }, { status: 403 });
  }

  const hostName = room.host?.display_name || "Host";
  const guestName = room.guest?.display_name || "Guest";
  const hostRole = room.host_role;
  const guestRole = room.guest_role;
  const scenarioTitle = room.scenario?.title || "Roleplay";
  const scenarioContext = room.scenario?.content?.scenario?.context || "";

  // Build conversation text
  const conversationText = (messages as Message[])
    .map(m => `${m.sender_name}: ${m.content}`)
    .join("\n");

  // AI Evaluation prompt
  const prompt = `Anda adalah evaluator profesional untuk sesi latihan wawancara/roleplay.

KONTEKS SKENARIO:
- Judul: ${scenarioTitle}
- Deskripsi: ${scenarioContext}
- ${hostName} berperan sebagai: ${hostRole}
- ${guestName} berperan sebagai: ${guestRole}

PERCAKAPAN:
${conversationText}

TUGAS:
Evaluasi performa kedua peserta berdasarkan:
1. Komunikasi (kejelasan, sopan santun, flow percakapan)
2. Profesionalisme (sikap, bahasa yang digunakan)
3. Kualitas Argumen (logika, relevansi jawaban)

Berikan skor 0-100 dan feedback spesifik untuk masing-masing peserta.

RESPONS dalam format JSON SAJA (tanpa markdown):
{
  "hostScore": <number 0-100>,
  "guestScore": <number 0-100>,
  "hostFeedback": {
    "komunikasi": "<feedback singkat>",
    "profesionalisme": "<feedback singkat>",
    "kualitasArgumen": "<feedback singkat>",
    "saran": "<saran perbaikan>"
  },
  "guestFeedback": {
    "komunikasi": "<feedback singkat>",
    "profesionalisme": "<feedback singkat>",
    "kualitasArgumen": "<feedback singkat>",
    "saran": "<saran perbaikan>"
  },
  "overallSummary": "<ringkasan singkat sesi roleplay>"
}`;

  try {
    const groq = new Groq({ apiKey });
    
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Anda adalah evaluator profesional. Respons HANYA dalam format JSON valid."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Invalid AI response:", responseText);
      throw new Error("Invalid AI response format");
    }

    const evaluation: EvaluationResult = JSON.parse(jsonMatch[0]);

    // Save scores to room
    await supabase
      .from("roleplay_rooms")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        host_score: evaluation.hostScore,
        guest_score: evaluation.guestScore,
        host_feedback: evaluation.hostFeedback,
        guest_feedback: evaluation.guestFeedback
      })
      .eq("id", room.id);

    return NextResponse.json({
      success: true,
      evaluation,
      room: {
        hostName,
        guestName,
        hostRole,
        guestRole,
        scenarioTitle
      }
    });
  } catch (error) {
    console.error("AI Evaluation error:", error);
    return NextResponse.json({ 
      error: "Gagal melakukan evaluasi AI" 
    }, { status: 500 });
  }
}

// GET: Retrieve existing evaluation
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get("code");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!roomCode) {
    return NextResponse.json({ error: "Room code required" }, { status: 400 });
  }

  const { data: room, error } = await supabase
    .from("roleplay_rooms")
    .select(`
      *,
      scenario:challenges(title, content),
      host:profiles!roleplay_rooms_host_id_fkey(display_name),
      guest:profiles!roleplay_rooms_guest_id_fkey(display_name)
    `)
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (error || !room) {
    return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({
    room: {
      id: room.id,
      hostName: room.host?.display_name,
      guestName: room.guest?.display_name,
      hostRole: room.host_role,
      guestRole: room.guest_role,
      hostScore: room.host_score,
      guestScore: room.guest_score,
      hostFeedback: room.host_feedback,
      guestFeedback: room.guest_feedback,
      scenarioTitle: room.scenario?.title,
      status: room.status,
      isHost: room.host_id === user.id
    }
  });
}
