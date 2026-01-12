import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `Kamu adalah SoftrAI, asisten AI profesional untuk pengembangan soft skills. Kamu membantu pengguna dalam:
1. Diskusi tentang pengembangan diri (komunikasi, kesadaran diri, nilai etika, dll)
2. Memberikan saran dan motivasi
3. Mendengarkan curhat tentang progres mereka
4. Memberikan tips praktis untuk meningkatkan soft skills

Panduan:
- Gunakan bahasa Indonesia yang ramah dan profesional
- Berikan respons yang empatik dan mendukung
- Jika ditanya hal di luar topik pengembangan diri, arahkan kembali dengan lembut
- Berikan contoh konkret dan actionable tips
- Tanyakan pertanyaan follow-up untuk memahami situasi pengguna lebih baik`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, sessionId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Check if API key exists
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: "Gemini API key not configured",
        response: "Maaf, SoftrAI belum dikonfigurasi. Silakan hubungi administrator untuk mengaktifkan fitur ini."
      }, { status: 200 });
    }

    // Get chat history from session (optional, skip if no session)
    let history: { role: string; content: string }[] = [];
    if (sessionId) {
      try {
        const { data: messages } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true })
          .limit(20);
        
        if (messages) {
          history = messages;
        }
      } catch {
        // Ignore database errors, proceed without history
      }
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey });
    
    // Build conversation context
    const conversationHistory = history.map(msg => 
      `${msg.role === "user" ? "User" : "SoftrAI"}: ${msg.content}`
    ).join("\n");

    const fullPrompt = `${SYSTEM_PROMPT}

${conversationHistory ? `Riwayat percakapan:\n${conversationHistory}\n\n` : ""}User: ${message}

SoftrAI:`;

    // Generate response using the correct API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    const aiResponse = response.text?.trim() || "Maaf, saya tidak bisa merespons saat ini.";

    // Save messages to database (optional, don't fail if db error)
    if (sessionId) {
      try {
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "user",
          content: message,
        });

        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: aiResponse,
        });

        await supabase
          .from("chat_sessions")
          .update({ 
            messages_count: history.length + 2,
            updated_at: new Date().toISOString()
          })
          .eq("id", sessionId);
      } catch {
        // Ignore database errors
      }
    }

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("Gemini API error:", error);
    
    // Return more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ 
      error: errorMessage,
      response: `Maaf, terjadi kesalahan: ${errorMessage}`
    }, { status: 200 });
  }
}

