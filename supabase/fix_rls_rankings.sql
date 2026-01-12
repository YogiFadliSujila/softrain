-- Fix RLS Policies for Ranking System
-- Run this in Supabase SQL Editor to enable ranking updates

-- =============================================
-- FIX: Add missing INSERT/UPDATE policies for user_rankings
-- =============================================

-- Allow users to insert their own rankings
CREATE POLICY "Users can insert own rankings" 
ON public.user_rankings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own rankings
CREATE POLICY "Users can update own rankings" 
ON public.user_rankings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- =============================================
-- FIX: Add missing INSERT policy for user_energies
-- =============================================

-- Allow users to insert their own energy (for new users)
CREATE POLICY "Users can insert own energy" 
ON public.user_energies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FIX: Add missing INSERT policy for subscriptions
-- =============================================

-- Allow users to create their own subscriptions
CREATE POLICY "Users can insert own subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own subscriptions (for payment status)
CREATE POLICY "Users can update own subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- =============================================
-- VERIFY: Check if policies are applied
-- =============================================

-- You can run this to verify:
-- SELECT * FROM pg_policies WHERE tablename = 'user_rankings';
-- SELECT * FROM pg_policies WHERE tablename = 'user_energies';
-- SELECT * FROM pg_policies WHERE tablename = 'subscriptions';
