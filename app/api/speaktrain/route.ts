import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch available Speaktrain challenges
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get("id");

    let userLevel = 1;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("level")
        .eq("id", user.id)
        .single();
      userLevel = profile?.level || 1;
    }

    if (challengeId) {
      const { data: challenge, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .eq("feature", "speaktrain")
        .eq("is_active", true)
        .single();

      if (error || !challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
      }

      // Get attempts count
      let attemptCount = 0;
      let bestScore = 0;
      if (user) {
        const { data: attempts } = await supabase
          .from("challenge_attempts")
          .select("score")
          .eq("user_id", user.id)
          .eq("challenge_id", challengeId)
          .order("score", { ascending: false });
        
        if (attempts) {
          attemptCount = attempts.length;
          bestScore = attempts[0]?.score || 0;
        }
      }

      return NextResponse.json({ 
        challenge,
        accessible: userLevel >= challenge.min_level,
        attemptCount,
        bestScore
      });
    }

    // Get all challenges
    const { data: challenges, error } = await supabase
      .from("challenges")
      .select(`
        id, title, title_en, description, description_en, 
        type, energy_cost, min_level, content
      `)
      .eq("feature", "speaktrain")
      .eq("is_active", true)
      .order("min_level")
      .order("created_at");

    if (error) {
      console.error("Speaktrain query error:", error);
      return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
    }

    // Get user's attempts
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

    const challengesWithStatus = challenges?.map(c => {
      const content = c.content as { duration_seconds: number };
      return {
        ...c,
        duration: content.duration_seconds,
        attemptCount: stats[c.id]?.count || 0,
        bestScore: stats[c.id]?.best || 0,
        accessible: userLevel >= c.min_level
      };
    });

    return NextResponse.json({ 
      challenges: challengesWithStatus,
      userLevel,
      currentEnergy
    });
  } catch (error) {
    console.error("Speaktrain GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Submit speech result
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, transcript, durationSeconds, wordCount, voiceAnalysis } = await request.json();

    if (!challengeId || !transcript) {
      return NextResponse.json({ 
        error: "challengeId and transcript required" 
      }, { status: 400 });
    }

    // Get challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .eq("feature", "speaktrain")
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Check energy
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

    // Evaluate speech
    const content = challenge.content as {
      duration_seconds: number;
      evaluation_criteria: {
        min_words: number;
        max_duration: number;
        key_elements: string[];
      };
    };

    const criteria = content.evaluation_criteria;
    const targetDuration = content.duration_seconds;

    // Scoring components (each out of 25, total 100)
    let durationScore = 0;
    let wordCountScore = 0;
    let fluencyScore = 0;
    let contentScore = 0;

    // Duration score (within ±20% of target is good)
    const durationDiff = Math.abs(durationSeconds - targetDuration) / targetDuration;
    if (durationDiff <= 0.1) durationScore = 25;
    else if (durationDiff <= 0.2) durationScore = 20;
    else if (durationDiff <= 0.3) durationScore = 15;
    else if (durationDiff <= 0.5) durationScore = 10;
    else durationScore = 5;

    // Word count score
    if (wordCount >= criteria.min_words) {
      wordCountScore = 25;
    } else {
      wordCountScore = Math.round((wordCount / criteria.min_words) * 25);
    }

    // Fluency score (words per minute)
    const wpm = (wordCount / durationSeconds) * 60;
    if (wpm >= 100 && wpm <= 160) fluencyScore = 25; // Ideal range
    else if (wpm >= 80 && wpm <= 180) fluencyScore = 20;
    else if (wpm >= 60 && wpm <= 200) fluencyScore = 15;
    else fluencyScore = 10;

    // Content score (check for key elements - simple keyword matching)
    const transcriptLower = transcript.toLowerCase();
    let elementsFound = 0;
    for (const element of criteria.key_elements) {
      // Simple check - could be enhanced with AI
      if (transcriptLower.includes(element.toLowerCase())) {
        elementsFound++;
      }
    }
    contentScore = Math.round((elementsFound / criteria.key_elements.length) * 25);

    // Voice analysis score (NEW) - scale down to 20 points max
    let voiceScore = 0;
    let voiceMessage = "Analisis suara tidak tersedia";
    
    if (voiceAnalysis) {
      // Volume scoring (0-8 points)
      if (voiceAnalysis.averageVolume >= 20 && voiceAnalysis.averageVolume <= 60) {
        voiceScore += 8;
      } else if (voiceAnalysis.averageVolume >= 15 && voiceAnalysis.averageVolume <= 70) {
        voiceScore += 6;
      } else if (voiceAnalysis.averageVolume < 15) {
        voiceScore += 2;
      } else {
        voiceScore += 4;
      }
      
      // Variation scoring (0-7 points) - higher std dev = more expressive
      if (voiceAnalysis.volumeVariation >= 10 && voiceAnalysis.volumeVariation <= 30) {
        voiceScore += 7;
      } else if (voiceAnalysis.volumeVariation >= 5) {
        voiceScore += 5;
      } else {
        voiceScore += 2;
      }
      
      // Silence/Pause scoring (0-5 points)
      if (voiceAnalysis.silencePercentage >= 10 && voiceAnalysis.silencePercentage <= 30) {
        voiceScore += 5;
      } else if (voiceAnalysis.silencePercentage < 10) {
        voiceScore += 3;
      } else {
        voiceScore += 2;
      }
      
      // Generate voice message
      const messages = [];
      if (voiceAnalysis.averageVolume >= 20 && voiceAnalysis.averageVolume <= 60) {
        messages.push("Volume ideal");
      } else if (voiceAnalysis.averageVolume < 15) {
        messages.push("Volume terlalu pelan");
      } else if (voiceAnalysis.averageVolume > 70) {
        messages.push("Volume terlalu keras");
      }
      
      if (voiceAnalysis.volumeVariation >= 10) {
        messages.push("Intonasi ekspresif");
      } else if (voiceAnalysis.volumeVariation < 5) {
        messages.push("Intonasi monoton");
      }
      
      if (voiceAnalysis.silencePercentage >= 10 && voiceAnalysis.silencePercentage <= 30) {
        messages.push("Jeda yang baik");
      }
      
      voiceMessage = messages.join(". ") || "Analisis suara selesai";
    }

    // Adjust base scores: each now max 20 instead of 25 to make room for voice
    const adjustedDuration = Math.round(durationScore * 0.8);
    const adjustedWordCount = Math.round(wordCountScore * 0.8);
    const adjustedFluency = Math.round(fluencyScore * 0.8);
    const adjustedContent = Math.round(contentScore * 0.8);

    const totalScore = adjustedDuration + adjustedWordCount + adjustedFluency + adjustedContent + voiceScore;
    const maxScore = 100;

    // Deduct energy
    if (!isPremium) {
      await supabase
        .from("user_energies")
        .update({ current_energy: energy!.current_energy - challenge.energy_cost })
        .eq("user_id", user.id);
    }

    // Generate feedback
    const feedback = {
      duration: {
        score: adjustedDuration,
        actual: durationSeconds,
        target: targetDuration,
        message: adjustedDuration >= 16 
          ? "Durasi bicara sangat baik!" 
          : adjustedDuration >= 12 
            ? "Durasi cukup baik, bisa lebih tepat." 
            : "Perlu latihan untuk mengatur durasi."
      },
      wordCount: {
        score: adjustedWordCount,
        actual: wordCount,
        target: criteria.min_words,
        message: adjustedWordCount >= 16 
          ? "Jumlah kata mencukupi!" 
          : "Coba tambahkan lebih banyak konten."
      },
      fluency: {
        score: adjustedFluency,
        wpm: Math.round(wpm),
        message: adjustedFluency >= 16 
          ? "Kecepatan bicara sangat baik!" 
          : adjustedFluency >= 12 
            ? "Kecepatan cukup baik." 
            : wpm < 80 
              ? "Bicara terlalu lambat, coba lebih natural." 
              : "Bicara terlalu cepat, coba lebih tenang."
      },
      voice: {
        score: voiceScore,
        message: voiceMessage
      },
      content: {
        score: adjustedContent,
        elementsFound,
        totalElements: criteria.key_elements.length,
        message: adjustedContent >= 16 
          ? "Konten mencakup semua elemen penting!" 
          : "Coba sertakan lebih banyak elemen kunci."
      }
    };

    // Save attempt
    const { data: attempt } = await supabase
      .from("challenge_attempts")
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        score: totalScore,
        max_score: maxScore,
        ai_feedback: {
          transcript,
          durationSeconds,
          wordCount,
          wpm: Math.round(wpm),
          feedback
        },
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    // Add ranking points
    const pointsEarned = Math.floor(totalScore / 10);
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

    return NextResponse.json({
      success: true,
      attempt,
      score: totalScore,
      maxScore,
      pointsEarned,
      feedback,
      voiceAnalysis: voiceAnalysis || null
    });
  } catch (error) {
    console.error("Speaktrain POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
