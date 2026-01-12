import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch available Roleplayroll scenarios
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get("id");

    let userLevel = 1;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("level")
        .eq("id", user.id)
        .single();
      userLevel = profile?.level || 1;
    }

    if (scenarioId) {
      const { data: challenge, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", scenarioId)
        .eq("feature", "roleplayroll")
        .eq("is_active", true)
        .single();

      if (error || !challenge) {
        return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
      }

      // Get attempts
      let attemptCount = 0;
      let bestScore = 0;
      if (user) {
        const { data: attempts } = await supabase
          .from("challenge_attempts")
          .select("score")
          .eq("user_id", user.id)
          .eq("challenge_id", scenarioId)
          .order("score", { ascending: false });
        
        if (attempts) {
          attemptCount = attempts.length;
          bestScore = attempts[0]?.score || 0;
        }
      }

      return NextResponse.json({ 
        scenario: challenge,
        accessible: userLevel >= challenge.min_level,
        attemptCount,
        bestScore
      });
    }

    // Get all scenarios
    const { data: scenarios, error } = await supabase
      .from("challenges")
      .select(`
        id, title, title_en, description, description_en, 
        type, energy_cost, min_level, content
      `)
      .eq("feature", "roleplayroll")
      .eq("is_active", true)
      .order("min_level")
      .order("created_at");

    if (error) {
      console.error("Roleplayroll query error:", error);
      return NextResponse.json({ error: "Failed to fetch scenarios" }, { status: 500 });
    }

    // Get stats
    let stats: Record<string, { count: number; best: number }> = {};
    if (user) {
      const { data: attempts } = await supabase
        .from("challenge_attempts")
        .select("challenge_id, score")
        .eq("user_id", user.id);
      
      if (attempts) {
        attempts.forEach(a => {
          if (!stats[a.challenge_id]) {
            stats[a.challenge_id] = { count: 0, best: 0 };
          }
          stats[a.challenge_id].count++;
          if (a.score > stats[a.challenge_id].best) {
            stats[a.challenge_id].best = a.score;
          }
        });
      }
    }

    // Get energy
    let currentEnergy = 5;
    if (user) {
      const { data: energy } = await supabase
        .from("user_energies")
        .select("current_energy")
        .eq("user_id", user.id)
        .single();
      currentEnergy = energy?.current_energy || 5;
    }

    const scenariosWithStatus = scenarios?.map(s => ({
      ...s,
      attemptCount: stats[s.id]?.count || 0,
      bestScore: stats[s.id]?.best || 0,
      accessible: userLevel >= s.min_level
    }));

    return NextResponse.json({ 
      scenarios: scenariosWithStatus,
      userLevel,
      currentEnergy
    });
  } catch (error) {
    console.error("Roleplayroll GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Chat with AI or submit final result
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scenarioId, action, userMessage, conversationHistory, exchangeCount } = await request.json();

    if (!scenarioId || !action) {
      return NextResponse.json({ error: "scenarioId and action required" }, { status: 400 });
    }

    // Get scenario
    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", scenarioId)
      .eq("feature", "roleplayroll")
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const content = challenge.content as {
      scenario: {
        title: string;
        setting: string;
        context: string;
        your_role: string;
        ai_role: string;
      };
      ai_persona: {
        name: string;
        title: string;
        personality: string;
        greeting: string;
      };
      conversation_flow: string[];
      evaluation_points: string[];
      min_exchanges: number;
      max_exchanges: number;
      skill_focus: string[];
    };

    // ACTION: Start - Return greeting
    if (action === "start") {
      return NextResponse.json({
        success: true,
        aiMessage: content.ai_persona.greeting,
        aiName: content.ai_persona.name,
        aiTitle: content.ai_persona.title
      });
    }

    // ACTION: Chat - Get AI response using Groq
    if (action === "chat") {
      if (!userMessage) {
        return NextResponse.json({ error: "userMessage required" }, { status: 400 });
      }

      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "AI not configured. Add GROQ_API_KEY to .env.local" }, { status: 500 });
      }

      const systemPrompt = `Kamu adalah ${content.ai_persona.name}, ${content.ai_persona.title}.
Kepribadian: ${content.ai_persona.personality}

SKENARIO:
${content.scenario.context}

SETTING: ${content.scenario.setting}
Peran user: ${content.scenario.your_role}
Peran kamu: ${content.scenario.ai_role}

ALUR PERCAKAPAN YANG DIHARAPKAN:
${content.conversation_flow.map((f, i) => `${i + 1}. ${f}`).join('\n')}

INSTRUKSI:
1. Tetap dalam karakter sebagai ${content.ai_persona.name}
2. Berikan respons yang natural dan sesuai skenario
3. Ajukan pertanyaan follow-up yang relevan
4. Jika user sudah menjawab dengan baik, lanjutkan ke topik berikutnya dalam alur
5. Jangan terlalu panjang, maksimal 2-3 kalimat per respons
6. Gunakan bahasa Indonesia yang natural
7. Ini adalah percakapan ke-${exchangeCount || 1} dari maksimal ${content.max_exchanges}`;

      // Build messages for Groq
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt }
      ];

      // Add conversation history
      if (conversationHistory && conversationHistory.length > 0) {
        for (const msg of conversationHistory) {
          messages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
          });
        }
      }

      // Add current message
      messages.push({ role: "user", content: userMessage });

      try {
        const groq = new Groq({ apiKey });
        
        const completion = await groq.chat.completions.create({
          messages,
          model: "llama-3.3-70b-versatile",
          temperature: 0.8,
          max_tokens: 200,
        });

        const aiResponse = completion.choices[0]?.message?.content?.trim() || 
          "Maaf, saya tidak bisa merespons saat ini.";

        return NextResponse.json({
          success: true,
          aiMessage: aiResponse,
          aiName: content.ai_persona.name
        });
      } catch (aiError) {
        console.error("Groq error:", aiError);
        return NextResponse.json({ 
          error: "AI tidak tersedia. Coba lagi nanti." 
        }, { status: 500 });
      }
    }

    // ACTION: Complete - Evaluate and save
    if (action === "complete") {
      // Check energy first
      const { data: energy } = await supabase
        .from("user_energies")
        .select("current_energy")
        .eq("user_id", user.id)
        .single();

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("payment_status", "paid")
        .gte("ends_at", new Date().toISOString())
        .single();

      const isPremium = !!subscription;

      if (!isPremium && (!energy || energy.current_energy < challenge.energy_cost)) {
        return NextResponse.json({ 
          error: "Not enough energy",
          required: challenge.energy_cost,
          current: energy?.current_energy || 0
        }, { status: 400 });
      }

      // Simple scoring based on exchange count and conversation length
      const exchanges = exchangeCount || 0;
      const minExchanges = content.min_exchanges;
      
      let score = 0;
      
      // Exchange count score (40%)
      if (exchanges >= minExchanges) {
        score += 40;
      } else {
        score += Math.round((exchanges / minExchanges) * 40);
      }

      // Conversation history analysis (60%)
      const history = conversationHistory || [];
      const userMessages = history.filter((m: { role: string }) => m.role === "user");
      
      // Average message length
      const avgLength = userMessages.length > 0
        ? userMessages.reduce((sum: number, m: { content: string }) => sum + m.content.length, 0) / userMessages.length
        : 0;

      if (avgLength > 100) score += 30;
      else if (avgLength > 50) score += 20;
      else if (avgLength > 20) score += 10;

      // Message count
      if (userMessages.length >= minExchanges) score += 30;
      else score += Math.round((userMessages.length / minExchanges) * 30);

      score = Math.min(100, Math.max(0, score));

      // Deduct energy
      if (!isPremium) {
        await supabase
          .from("user_energies")
          .update({ current_energy: energy!.current_energy - challenge.energy_cost })
          .eq("user_id", user.id);
      }

      // Save attempt
      const { data: attempt } = await supabase
        .from("challenge_attempts")
        .insert({
          user_id: user.id,
          challenge_id: scenarioId,
          score,
          max_score: 100,
          ai_feedback: {
            exchangeCount: exchanges,
            conversationLength: history.length,
            averageMessageLength: Math.round(avgLength),
            scenario: content.scenario.title
          },
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      // Add ranking points
      const pointsEarned = Math.floor(score / 10);
      if (pointsEarned > 0) {
        const { data: category } = await supabase
          .from("soft_skill_categories")
          .select("id")
          .eq("slug", "communication")
          .single();

        if (category) {
          const { data: ranking } = await supabase
            .from("user_rankings")
            .select("*")
            .eq("user_id", user.id)
            .eq("category_id", category.id)
            .single();

          if (ranking) {
            await supabase
              .from("user_rankings")
              .update({ points: ranking.points + pointsEarned })
              .eq("id", ranking.id);
          } else {
            await supabase
              .from("user_rankings")
              .insert({
                user_id: user.id,
                category_id: category.id,
                points: pointsEarned
              });
          }
        }

        // Add XP
        const { data: profile } = await supabase
          .from("profiles")
          .select("experience, level")
          .eq("id", user.id)
          .single();

        if (profile) {
          const newExp = profile.experience + pointsEarned;
          const newLevel = Math.floor(newExp / 100) + 1;
          await supabase
            .from("profiles")
            .update({ experience: newExp, level: newLevel })
            .eq("id", user.id);
        }
      }

      // Generate feedback based on evaluation points
      const feedback = content.evaluation_points.map(point => ({
        point,
        score: score >= 80 ? "Baik" : score >= 50 ? "Cukup" : "Perlu ditingkatkan"
      }));

      return NextResponse.json({
        success: true,
        attempt,
        score,
        maxScore: 100,
        pointsEarned,
        feedback,
        summary: {
          exchanges,
          avgMessageLength: Math.round(avgLength),
          skillsFocus: content.skill_focus
        }
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Roleplayroll POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
