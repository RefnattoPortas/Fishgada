-- ============================================================
-- Add Onboarding Persistence to Profiles
-- ============================================================

-- Adiciona o campo se não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN DEFAULT FALSE;

-- Garante que usuários existentes herdem o valor default (se for o caso)
UPDATE public.profiles SET has_seen_onboarding = FALSE WHERE has_seen_onboarding IS NULL;
