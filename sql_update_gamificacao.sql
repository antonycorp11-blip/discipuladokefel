-- Atualização do Kefel Profiles com as mecânicas de gamificação (Selos e Presença)
ALTER TABLE "public"."kefel_profiles" 
ADD COLUMN IF NOT EXISTS "cultos_presenca" INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS "celulas_presenca" INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS "last_culto_claim" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "badges" JSONB DEFAULT '[]'::jsonb;
