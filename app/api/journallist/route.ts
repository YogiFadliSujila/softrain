import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch available JournAllist articles
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get("id");

    let userLevel = 1;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("level")
        .eq("id", user.id)
        .single();
      userLevel = profile?.level || 1;
    }

    if (articleId) {
      const { data: challenge, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", articleId)
        .eq("feature", "journallist")
        .eq("is_active", true)
        .single();

      if (error || !challenge) {
        return NextResponse.json({ error: "Article not found" }, { status: 404 });
      }

      // Check attempts
      let attempted = false;
      let bestScore = 0;
      let totalQuestions = 0;
      
      const content = challenge.content as {
        questions: Array<{ id: number }>;
      };
      totalQuestions = content.questions?.length || 0;

      if (user) {
        const { data: attempts } = await supabase
          .from("challenge_attempts")
          .select("score, max_score")
          .eq("user_id", user.id)
          .eq("challenge_id", articleId)
          .order("score", { ascending: false })
          .limit(1);
        
        if (attempts && attempts.length > 0) {
          attempted = true;
          bestScore = attempts[0].score;
        }
      }

      return NextResponse.json({ 
        article: challenge,
        accessible: userLevel >= challenge.min_level,
        attempted,
        bestScore,
        totalQuestions
      });
    }

    // Get all articles
    const { data: articles, error } = await supabase
      .from("challenges")
      .select(`
        id, title, title_en, description, description_en, 
        type, energy_cost, min_level, content
      `)
      .eq("feature", "journallist")
      .eq("is_active", true)
      .order("min_level")
      .order("created_at");

    if (error) {
      console.error("JournAllist query error:", error);
      return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
    }

    // Get user's best scores
    let scores: Record<string, { score: number; maxScore: number }> = {};
    if (user) {
      const { data: attempts } = await supabase
        .from("challenge_attempts")
        .select("challenge_id, score, max_score")
        .eq("user_id", user.id);
      
      if (attempts) {
        attempts.forEach(a => {
          if (!scores[a.challenge_id] || a.score > scores[a.challenge_id].score) {
            scores[a.challenge_id] = { score: a.score, maxScore: a.max_score };
          }
        });
      }
    }

    const articlesWithStatus = articles?.map(a => {
      const content = a.content as { article: { read_time: number }; questions: Array<{ id: number }> };
      return {
        ...a,
        readTime: content.article?.read_time || 5,
        questionCount: content.questions?.length || 0,
        attempted: a.id in scores,
        bestScore: scores[a.id]?.score || 0,
        maxScore: scores[a.id]?.maxScore || 0,
        accessible: userLevel >= a.min_level
      };
    });

    return NextResponse.json({ 
      articles: articlesWithStatus,
      userLevel
    });
  } catch (error) {
    console.error("JournAllist GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Submit quiz answers
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId, answers, readingTimeSeconds } = await request.json();

    if (!articleId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ 
        error: "articleId and answers array required" 
      }, { status: 400 });
    }

    // Get the article
    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", articleId)
      .eq("feature", "journallist")
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
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

    // Grade answers
    const content = challenge.content as {
      article: { title: string };
      questions: Array<{
        id: number;
        question: string;
        options: Array<{ id: string; text: string; is_correct: boolean }>;
      }>;
    };

    const results: Array<{
      questionId: number;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
    }> = [];

    let correctCount = 0;
    const totalQuestions = content.questions.length;

    for (const answer of answers) {
      const question = content.questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      const correctOption = question.options.find(o => o.is_correct);
      const isCorrect = correctOption?.id === answer.selectedOptionId;
      
      if (isCorrect) correctCount++;
      
      results.push({
        questionId: answer.questionId,
        userAnswer: answer.selectedOptionId,
        correctAnswer: correctOption?.id || "",
        isCorrect
      });
    }

    // Calculate score (percentage-based)
    const score = Math.round((correctCount / totalQuestions) * 100);
    const maxScore = 100;

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
        challenge_id: articleId,
        score,
        max_score: maxScore,
        ai_feedback: {
          results,
          correctCount,
          totalQuestions,
          readingTime: readingTimeSeconds
        },
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    // Add ranking points (based on correct answers)
    const pointsEarned = correctCount * 5; // 5 points per correct answer
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
      score,
      maxScore,
      correctCount,
      totalQuestions,
      pointsEarned,
      results,
      questions: content.questions // Return full questions for review
    });
  } catch (error) {
    console.error("JournAllist POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
