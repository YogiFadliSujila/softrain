-- Multiplayer Roleplay Rooms
-- Run this in Supabase SQL Editor

-- Drop existing policies first (if re-running)
DROP POLICY IF EXISTS "Users can view their rooms" ON roleplay_rooms;
DROP POLICY IF EXISTS "Anyone can view waiting rooms" ON roleplay_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON roleplay_rooms;
DROP POLICY IF EXISTS "Host can update room" ON roleplay_rooms;
DROP POLICY IF EXISTS "Anyone can join waiting room" ON roleplay_rooms;
DROP POLICY IF EXISTS "Guest can join waiting room" ON roleplay_rooms;

-- Create roleplay_rooms table
CREATE TABLE IF NOT EXISTS roleplay_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  scenario_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  host_role VARCHAR(50) DEFAULT 'hrd',
  guest_role VARCHAR(50) DEFAULT 'kandidat',
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  host_score INTEGER,
  guest_score INTEGER,
  host_feedback JSONB,
  guest_feedback JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roleplay_rooms_code ON roleplay_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_roleplay_rooms_host ON roleplay_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_roleplay_rooms_status ON roleplay_rooms(status);

-- Enable RLS
ALTER TABLE roleplay_rooms ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS POLICIES
-- =====================

-- 1. SELECT: Users can see rooms they are part of
CREATE POLICY "Users can view their rooms" ON roleplay_rooms
  FOR SELECT USING (
    auth.uid() = host_id OR auth.uid() = guest_id
  );

-- 2. SELECT: Anyone can view waiting rooms (for join flow)
CREATE POLICY "Anyone can view waiting rooms" ON roleplay_rooms
  FOR SELECT USING (
    status = 'waiting'
  );

-- 3. INSERT: Users can create rooms as host
CREATE POLICY "Users can create rooms" ON roleplay_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = host_id
  );

-- 4. UPDATE: Host can update their room
CREATE POLICY "Host can update room" ON roleplay_rooms
  FOR UPDATE USING (
    auth.uid() = host_id
  ) WITH CHECK (
    auth.uid() = host_id
  );

-- 5. UPDATE: Anyone can join waiting room (set themselves as guest)
CREATE POLICY "Guest can join waiting room" ON roleplay_rooms
  FOR UPDATE USING (
    status = 'waiting' AND guest_id IS NULL
  ) WITH CHECK (
    -- The new guest_id must be the current user
    guest_id = auth.uid()
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE roleplay_rooms;

-- Grant access
GRANT ALL ON roleplay_rooms TO authenticated;
