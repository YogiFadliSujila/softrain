import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get all modules (with user progress if authenticated)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category");

    // Build query
    let query = supabase
      .from("modules")
      .select(`
        *,
        soft_skill_categories (
          id, name, name_en, slug, color
        )
      `)
      .eq("is_active", true)
      .order("order_index");

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data: modules, error } = await query;

    if (error) {
      console.error("Modules query error:", error);
      return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
    }

    // Get user progress if authenticated
    let progress: Record<string, boolean> = {};
    if (user) {
      const { data: userProgress } = await supabase
        .from("module_progress")
        .select("module_id, completed")
        .eq("user_id", user.id);

      if (userProgress) {
        progress = userProgress.reduce((acc, p) => {
          acc[p.module_id] = p.completed;
          return acc;
        }, {} as Record<string, boolean>);
      }
    }

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

    // Add progress and access info to modules
    const modulesWithProgress = modules?.map(m => ({
      ...m,
      completed: progress[m.id] || false,
      accessible: userLevel >= m.min_level && userLevel <= m.max_level
    }));

    return NextResponse.json({ 
      modules: modulesWithProgress,
      userLevel
    });
  } catch (error) {
    console.error("Modules GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Mark module as completed
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { moduleId } = await request.json();

    if (!moduleId) {
      return NextResponse.json({ error: "moduleId required" }, { status: 400 });
    }

    // Check if progress exists
    const { data: existing } = await supabase
      .from("module_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("module_id", moduleId)
      .single();

    if (existing) {
      // Update existing
      const { data } = await supabase
        .from("module_progress")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      
      return NextResponse.json({ progress: data });
    }

    // Create new progress
    const { data } = await supabase
      .from("module_progress")
      .insert({ 
        user_id: user.id, 
        module_id: moduleId, 
        completed: true,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    // Add experience for completing module
    const { data: profile } = await supabase
      .from("profiles")
      .select("experience, level")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newExp = profile.experience + 25; // 25 XP per module
      const newLevel = Math.floor(newExp / 100) + 1;
      
      await supabase
        .from("profiles")
        .update({ experience: newExp, level: newLevel })
        .eq("id", user.id);
    }

    return NextResponse.json({ 
      progress: data,
      xpEarned: 25
    });
  } catch (error) {
    console.error("Modules POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
