import Groq from "groq-sdk";
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
- Tanyakan pertanyaan follow-up untuk memahami situasi pengguna lebih baik
- Respons maksimal 3 paragraf`;

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
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: "Groq API key not configured",
        response: "Maaf, SoftrAI belum dikonfigurasi. Tambahkan GROQ_API_KEY di .env.local"
      }, { status: 200 });
    }

    // Ensure session exists - create if not provided
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          title: message.slice(0, 50),
        })
        .select()
        .single();
      
      if (sessionError) {
        console.error("Session creation error:", sessionError);
        return NextResponse.json({ 
          error: "Failed to create session",
          response: "Maaf, gagal membuat sesi chat baru."
        }, { status: 200 });
      }
      
      activeSessionId = newSession.id;
    }

    // Load chat history from database
    const { data: historyMessages, error: historyError } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", activeSessionId)
      .order("created_at", { ascending: true })
      .limit(20);
    
    if (historyError) {
      console.error("History load error:", historyError);
    }

    // Build messages array for Groq
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    // Add history
    if (historyMessages && historyMessages.length > 0) {
      for (const msg of historyMessages) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content
        });
      }
    }

    // Add current message
    messages.push({ role: "user", content: message });

    // Initialize Groq
    const groq = new Groq({ apiKey });

    // Generate response
    const completion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content?.trim() || 
      "Maaf, saya tidak bisa merespons saat ini.";

    // Save user message to database
    const { error: userMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: activeSessionId,
        role: "user",
        content: message,
      });

    if (userMsgError) {
      console.error("User message save error:", userMsgError);
    }

    // Save AI response to database
    const { error: aiMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: activeSessionId,
        role: "assistant",
        content: aiResponse,
      });

    if (aiMsgError) {
      console.error("AI message save error:", aiMsgError);
    }

    // Update session
    const newCount = (historyMessages?.length || 0) + 2;
    await supabase
      .from("chat_sessions")
      .update({ 
        messages_count: newCount,
        updated_at: new Date().toISOString()
      })
      .eq("id", activeSessionId);

    return NextResponse.json({ 
      response: aiResponse,
      sessionId: activeSessionId // Return session ID for client to track
    });
  } catch (error) {
    console.error("Groq API error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ 
      error: errorMessage,
      response: `Maaf, terjadi kesalahan: ${errorMessage}`
    }, { status: 200 });
  }
}
