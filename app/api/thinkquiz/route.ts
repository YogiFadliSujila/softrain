import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch available Thinkquiz challenges
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get("id");

    // Get user level
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
      // Get specific challenge
      const { data: challenge, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .eq("feature", "thinkquiz")
        .eq("is_active", true)
        .single();

      if (error || !challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
      }

      // Check previous attempts
      let attempted = false;
      let bestScore = 0;
      if (user) {
        const { data: attempts } = await supabase
          .from("challenge_attempts")
          .select("score")
          .eq("user_id", user.id)
          .eq("challenge_id", challengeId)
          .order("score", { ascending: false })
          .limit(1);
        
        if (attempts && attempts.length > 0) {
          attempted = true;
          bestScore = attempts[0].score;
        }
      }

      return NextResponse.json({ 
        challenge,
        accessible: userLevel >= challenge.min_level,
        attempted,
        bestScore
      });
    }

    // Get all thinkquiz challenges
    const { data: challenges, error } = await supabase
      .from("challenges")
      .select(`
        id, title, title_en, description, description_en, 
        type, energy_cost, min_level
      `)
      .eq("feature", "thinkquiz")
      .eq("is_active", true)
      .order("min_level")
      .order("created_at");

    if (error) {
      console.error("Thinkquiz query error:", error);
      return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
    }

    // Get user's best scores
    let scores: Record<string, number> = {};
    if (user) {
      const { data: attempts } = await supabase
        .from("challenge_attempts")
        .select("challenge_id, score")
        .eq("user_id", user.id);
      
      if (attempts) {
        // Get best score per challenge
        attempts.forEach(a => {
          if (!scores[a.challenge_id] || a.score > scores[a.challenge_id]) {
            scores[a.challenge_id] = a.score;
          }
        });
      }
    }

    const challengesWithStatus = challenges?.map(c => ({
      ...c,
      attempted: c.id in scores,
      bestScore: scores[c.id] || 0,
      accessible: userLevel >= c.min_level
    }));

    return NextResponse.json({ 
      challenges: challengesWithStatus,
      userLevel
    });
  } catch (error) {
    console.error("Thinkquiz GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Submit answer for Thinkquiz
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, selectedOptionId, timeSpentSeconds } = await request.json();

    if (!challengeId || !selectedOptionId) {
      return NextResponse.json({ 
        error: "challengeId and selectedOptionId required" 
      }, { status: 400 });
    }

    // Get the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .eq("feature", "thinkquiz")
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

    // Check premium
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

    // Evaluate answer
    const content = challenge.content as {
      question: string;
      options: Array<{ id: string; text: string; is_correct: boolean; explanation: string }>;
      hint: string;
      explanation: string;
      skill_focus: string[];
    };

    const selectedOption = content.options.find(o => o.id === selectedOptionId);
    if (!selectedOption) {
      return NextResponse.json({ error: "Invalid option selected" }, { status: 400 });
    }

    const isCorrect = selectedOption.is_correct;
    // Score: 100 if correct, 0 if wrong. Bonus points for speed (if under 30 seconds)
    let score = isCorrect ? 100 : 0;
    const timeBonus = isCorrect && timeSpentSeconds && timeSpentSeconds < 30 
      ? Math.floor((30 - timeSpentSeconds) / 3) 
      : 0;
    score += timeBonus;
    const maxScore = 110; // 100 + max 10 bonus

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
        challenge_id: challengeId,
        score,
        max_score: maxScore,
        ai_feedback: {
          selected_option: selectedOptionId,
          is_correct: isCorrect,
          time_spent: timeSpentSeconds,
          time_bonus: timeBonus,
          option_explanation: selectedOption.explanation,
          full_explanation: content.explanation
        },
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    // Add ranking points (only if correct)
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = Math.floor(score / 10); // 10-11 points for correct answer

      const { data: category } = await supabase
        .from("soft_skill_categories")
        .select("id")
        .eq("slug", "critical-thinking")
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

    // Find correct answer for feedback
    const correctOption = content.options.find(o => o.is_correct);

    return NextResponse.json({
      success: true,
      attempt,
      isCorrect,
      score,
      maxScore,
      timeBonus,
      pointsEarned,
      feedback: selectedOption.explanation,
      explanation: content.explanation,
      correctAnswer: correctOption?.id,
      skillFocus: content.skill_focus,
      allOptions: content.options
    });
  } catch (error) {
    console.error("Thinkquiz POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
