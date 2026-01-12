-- Softrain Database Schema for Supabase
-- Run this in your Supabase SQL Editor (database.new -> SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS & AUTHENTICATION (Uses Supabase Auth)
-- =============================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    level INT DEFAULT 1,
    experience INT DEFAULT 0,
    preferred_language VARCHAR(5) DEFAULT 'id', -- 'id' or 'en'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Energies
CREATE TABLE public.user_energies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_energy INT DEFAULT 5,
    last_daily_reset TIMESTAMPTZ DEFAULT NOW(),
    ads_watched_today INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTIONS & MONETIZATION
-- =============================================

CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL, -- 'daily', 'monthly', 'yearly'
    price INT NOT NULL, -- in IDR
    payment_id VARCHAR(100), -- Midtrans order ID
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'expired', 'cancelled'
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SOFT SKILL SYSTEM
-- =============================================

-- Soft Skill Categories
CREATE TABLE public.soft_skill_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    description_en TEXT,
    icon VARCHAR(50), -- Lucide icon name
    color VARCHAR(20), -- Tailwind color class
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Rankings per Category
CREATE TABLE public.user_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.soft_skill_categories(id) ON DELETE CASCADE,
    points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category_id)
);

-- =============================================
-- CHALLENGES & FEATURES
-- =============================================

-- Challenges (for all features)
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature VARCHAR(50) NOT NULL, -- 'roleplayroll', 'speaktrain', 'thinkquiz', 'journallist', 'ethicquiz'
    type VARCHAR(20) NOT NULL, -- 'practice', 'challenge', 'simulation'
    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    description TEXT,
    description_en TEXT,
    content JSONB NOT NULL, -- Feature-specific content
    energy_cost INT NOT NULL DEFAULT 1,
    min_level INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge Skill Weights (which soft skills a challenge trains)
CREATE TABLE public.challenge_skill_weights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.soft_skill_categories(id) ON DELETE CASCADE,
    weight DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- 0.00 to 1.00
    UNIQUE(challenge_id, category_id)
);

-- Challenge Attempts (user progress)
CREATE TABLE public.challenge_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
    score DECIMAL(5,2),
    max_score DECIMAL(5,2) DEFAULT 100.00,
    ai_feedback JSONB,
    duration_seconds INT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LEARNING MODULES
-- =============================================

CREATE TABLE public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    description TEXT,
    description_en TEXT,
    content JSONB NOT NULL, -- Module content (text, video URLs, etc.)
    min_level INT DEFAULT 1,
    max_level INT DEFAULT 20,
    category_id UUID REFERENCES public.soft_skill_categories(id),
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.module_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- =============================================
-- SOFTRAI CHATBOT
-- =============================================

CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255),
    messages_count INT DEFAULT 0,
    model_version VARCHAR(20) DEFAULT '1.5-flash', -- 'gemini-1.5-flash' or 'gemini-1.0-pro'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_energies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User Energies: Only own data
CREATE POLICY "Users can view own energy" ON public.user_energies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own energy" ON public.user_energies FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions: Only own data
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rankings: Public read, users can manage own
CREATE POLICY "Rankings are public" ON public.user_rankings FOR SELECT USING (true);
CREATE POLICY "Users can insert own rankings" ON public.user_rankings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rankings" ON public.user_rankings FOR UPDATE USING (auth.uid() = user_id);

-- Challenge Attempts: Only own data
CREATE POLICY "Users can view own attempts" ON public.challenge_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON public.challenge_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Module Progress: Only own data
CREATE POLICY "Users can view own progress" ON public.module_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.module_progress FOR ALL USING (auth.uid() = user_id);

-- Chat Sessions: Only own data
CREATE POLICY "Users can manage own chat sessions" ON public.chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own chat messages" ON public.chat_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = chat_messages.session_id AND user_id = auth.uid())
);

-- Public tables (no RLS needed, read-only for users)
-- challenges, soft_skill_categories, modules, challenge_skill_weights

-- =============================================
-- SEED DATA: Soft Skill Categories
-- =============================================

INSERT INTO public.soft_skill_categories (name, name_en, slug, description, description_en, icon, color) VALUES
('Komunikasi', 'Communication', 'communication', 'Kemampuan menyampaikan ide dengan jelas dan efektif', 'Ability to convey ideas clearly and effectively', 'MessageSquare', 'blue'),
('Kesadaran Diri', 'Self-Awareness', 'self-awareness', 'Kemampuan memahami emosi, kekuatan, dan kelemahan diri', 'Ability to understand own emotions, strengths, and weaknesses', 'User', 'purple'),
('Kesadaran Sosial', 'Social Awareness', 'social-awareness', 'Kemampuan memahami perspektif dan perasaan orang lain', 'Ability to understand others perspectives and feelings', 'Users', 'green'),
('Nilai Etika', 'Ethical Values', 'ethical-values', 'Kemampuan mengambil keputusan berdasarkan prinsip moral', 'Ability to make decisions based on moral principles', 'Scale', 'yellow'),
('Manajemen Emosi', 'Emotional Management', 'emotional-management', 'Kemampuan mengelola dan mengatur emosi secara sehat', 'Ability to manage and regulate emotions healthily', 'Heart', 'red'),
('Refleksi Kritis', 'Critical Reflection', 'critical-reflection', 'Kemampuan menganalisis dan mengevaluasi pemikiran sendiri', 'Ability to analyze and evaluate own thinking', 'Brain', 'orange');

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-create profile and energy on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    
    INSERT INTO public.user_energies (user_id)
    VALUES (NEW.id);
    
    -- Initialize rankings for all categories
    INSERT INTO public.user_rankings (user_id, category_id)
    SELECT NEW.id, id FROM public.soft_skill_categories;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_energies_updated_at BEFORE UPDATE ON public.user_energies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_rankings_updated_at BEFORE UPDATE ON public.user_rankings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
