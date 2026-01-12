import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get rankings for all categories or specific category
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get all soft skill categories
    const { data: categories } = await supabase
      .from("soft_skill_categories")
      .select("*")
      .order("name");

    if (category) {
      // Get rankings for specific category
      const { data: rankings } = await supabase
        .from("user_rankings")
        .select(`
          points,
          profiles (
            id,
            display_name,
            avatar_url,
            level
          )
        `)
        .eq("category_id", category)
        .order("points", { ascending: false })
        .limit(limit);

      return NextResponse.json({ category, rankings });
    }

    // Get overall rankings (sum of all points)
    const { data: overallRankings } = await supabase
      .from("profiles")
      .select(`
        id,
        display_name,
        avatar_url,
        level,
        user_rankings (
          points
        )
      `)
      .limit(limit);

    // Calculate total points for each user
    const rankedUsers = overallRankings
      ?.map(user => ({
        id: user.id,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        level: user.level,
        total_points: user.user_rankings?.reduce((sum, r) => sum + (r.points || 0), 0) || 0
      }))
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, limit);

    return NextResponse.json({ 
      categories,
      overall: rankedUsers
    });
  } catch (error) {
    console.error("Rankings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Add points to user ranking (internal use)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { categoryId, points, reason } = await request.json();

    if (!categoryId || !points) {
      return NextResponse.json({ error: "categoryId and points required" }, { status: 400 });
    }

    // Get current ranking
    const { data: ranking } = await supabase
      .from("user_rankings")
      .select("*")
      .eq("user_id", user.id)
      .eq("category_id", categoryId)
      .single();

    if (!ranking) {
      // Create new ranking entry
      const { data: newRanking } = await supabase
        .from("user_rankings")
        .insert({ user_id: user.id, category_id: categoryId, points })
        .select()
        .single();
      
      return NextResponse.json({ ranking: newRanking, added: points });
    }

    // Update existing ranking
    const newPoints = ranking.points + points;
    const { data: updatedRanking } = await supabase
      .from("user_rankings")
      .update({ points: newPoints })
      .eq("id", ranking.id)
      .select()
      .single();

    // Also update user experience
    const { data: profile } = await supabase
      .from("profiles")
      .select("experience, level")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newExp = profile.experience + points;
      const newLevel = Math.floor(newExp / 100) + 1; // 100 XP per level
      
      await supabase
        .from("profiles")
        .update({ experience: newExp, level: newLevel })
        .eq("id", user.id);
    }

    return NextResponse.json({ 
      ranking: updatedRanking, 
      added: points,
      reason
    });
  } catch (error) {
    console.error("Rankings POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
