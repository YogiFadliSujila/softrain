import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch available Ethicquiz challenges
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get("id");

    // Get user level for access control
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
        .eq("feature", "ethicquiz")
        .eq("is_active", true)
        .single();

      if (error || !challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
      }

      // Check if user has already attempted this challenge
      let attempted = false;
      let previousAttempt = null;
      if (user) {
        const { data: attempt } = await supabase
          .from("challenge_attempts")
          .select("*")
          .eq("user_id", user.id)
          .eq("challenge_id", challengeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (attempt) {
          attempted = true;
          previousAttempt = attempt;
        }
      }

      return NextResponse.json({ 
        challenge,
        accessible: userLevel >= challenge.min_level,
        attempted,
        previousAttempt
      });
    }

    // Get all ethicquiz challenges
    const { data: challenges, error } = await supabase
      .from("challenges")
      .select(`
        id, title, title_en, description, description_en, 
        type, energy_cost, min_level
      `)
      .eq("feature", "ethicquiz")
      .eq("is_active", true)
      .order("min_level")
      .order("created_at");

    if (error) {
      console.error("Ethicquiz query error:", error);
      return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
    }

    // Get user's attempts for each challenge
    let attemptedIds: Set<string> = new Set();
    if (user) {
      const { data: attempts } = await supabase
        .from("challenge_attempts")
        .select("challenge_id")
        .eq("user_id", user.id);
      
      if (attempts) {
        attemptedIds = new Set(attempts.map(a => a.challenge_id));
      }
    }

    // Add attempted and accessible flags
    const challengesWithStatus = challenges?.map(c => ({
      ...c,
      attempted: attemptedIds.has(c.id),
      accessible: userLevel >= c.min_level
    }));

    return NextResponse.json({ 
      challenges: challengesWithStatus,
      userLevel
    });
  } catch (error) {
    console.error("Ethicquiz GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Submit answer for an Ethicquiz challenge
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, selectedOptionId } = await request.json();

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
      .eq("feature", "ethicquiz")
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Check if user has enough energy
    const { data: energy } = await supabase
      .from("user_energies")
      .select("current_energy")
      .eq("user_id", user.id)
      .single();

    // Check for active subscription (premium users skip energy check)
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

    // Find the selected option and calculate score
    const content = challenge.content as {
      scenario: string;
      options: Array<{ id: string; text: string; ethics_score: number; feedback: string }>;
      explanation: string;
      related_values: string[];
    };

    const selectedOption = content.options.find(o => o.id === selectedOptionId);
    if (!selectedOption) {
      return NextResponse.json({ error: "Invalid option selected" }, { status: 400 });
    }

    const score = selectedOption.ethics_score;
    const maxScore = 100;

    // Deduct energy (if not premium)
    if (!isPremium) {
      await supabase
        .from("user_energies")
        .update({ current_energy: energy!.current_energy - challenge.energy_cost })
        .eq("user_id", user.id);
    }

    // Save attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("challenge_attempts")
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        score,
        max_score: maxScore,
        ai_feedback: {
          selected_option: selectedOptionId,
          feedback: selectedOption.feedback,
          explanation: content.explanation,
          related_values: content.related_values
        },
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (attemptError) {
      console.error("Attempt save error:", attemptError);
      return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
    }

    // Add points to ranking (based on score, 1 point per 10 ethics_score)
    const pointsEarned = Math.floor(score / 10);
    if (pointsEarned > 0) {
      // Get ethical-values category
      const { data: category } = await supabase
        .from("soft_skill_categories")
        .select("id")
        .eq("slug", "ethical-values")
        .single();

      if (category) {
        // Get current ranking
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

      // Add XP to profile
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
      score,
      maxScore,
      pointsEarned,
      feedback: selectedOption.feedback,
      explanation: content.explanation,
      relatedValues: content.related_values,
      allOptions: content.options // Show all options with scores after submission
    });
  } catch (error) {
    console.error("Ethicquiz POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
