-- Tabela de solicitações de badges (lider, discipulador)
CREATE TABLE IF NOT EXISTS "public"."kefel_badge_requests" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "public"."kefel_profiles"("id") ON DELETE CASCADE,
  "badge_key" TEXT NOT NULL CHECK (badge_key IN ('lider', 'discipulador')),
  "status" TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "reviewed_at" TIMESTAMP WITH TIME ZONE,
  "reviewed_by" UUID REFERENCES "public"."kefel_profiles"("id")
);

-- Garante que cada usuário só tem uma solicitação pendente por badge
CREATE UNIQUE INDEX IF NOT EXISTS kefel_badge_requests_unique_pending 
  ON "public"."kefel_badge_requests"("user_id", "badge_key") 
  WHERE status = 'pendente';
