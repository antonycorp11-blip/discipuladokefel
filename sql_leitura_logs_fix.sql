-- =========================================================
--  FIX: kefel_leitura_logs — RLS + Recuperação de Dados
--  Execute no Supabase SQL Editor
-- =========================================================

-- 1. Garantir que a tabela existe
CREATE TABLE IF NOT EXISTS kefel_leitura_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES kefel_profiles(id) ON DELETE CASCADE,
  livro       text,
  capitulo    integer,
  tempo_segundos integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE kefel_leitura_logs ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "leitura_logs_insert" ON kefel_leitura_logs;
DROP POLICY IF EXISTS "leitura_logs_select" ON kefel_leitura_logs;
DROP POLICY IF EXISTS "allow_insert_leitura_logs" ON kefel_leitura_logs;
DROP POLICY IF EXISTS "allow_select_leitura_logs" ON kefel_leitura_logs;

-- 4. Qualquer usuário autenticado (incluindo anônimos) pode INSERT no próprio log
CREATE POLICY "allow_insert_leitura_logs"
  ON kefel_leitura_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Qualquer usuário autenticado pode SELECT em todos os logs (necessário para o ranking)
CREATE POLICY "allow_select_leitura_logs"
  ON kefel_leitura_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- 6. Índice para performance no ranking (filtro por created_at)
CREATE INDEX IF NOT EXISTS idx_leitura_logs_created_at ON kefel_leitura_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leitura_logs_user_id ON kefel_leitura_logs(user_id);

-- =========================================================
--  RECUPERAÇÃO: Inserir logs históricos baseados no perfil
--  (Para usuários que leram mas os logs não foram registrados)
-- =========================================================
-- Este comando insere UM log de recuperação para cada perfil
-- que tem tempo_leitura_total > 0 mas NENHUM log registrado.
-- O log é datado de hoje para aparecer no ranking desta semana.

INSERT INTO kefel_leitura_logs (user_id, livro, capitulo, tempo_segundos, created_at)
SELECT 
  p.id,
  'Recuperado',
  0,
  p.tempo_leitura_total,
  now()
FROM kefel_profiles p
WHERE p.tempo_leitura_total > 0
  AND NOT EXISTS (
    SELECT 1 FROM kefel_leitura_logs l WHERE l.user_id = p.id
  );

-- Verificar resultado:
SELECT 
  p.nome,
  p.tempo_leitura_total AS total_perfil,
  COALESCE(SUM(l.tempo_segundos), 0) AS total_logs,
  COUNT(l.id) AS qtd_logs
FROM kefel_profiles p
LEFT JOIN kefel_leitura_logs l ON l.user_id = p.id
GROUP BY p.id, p.nome, p.tempo_leitura_total
ORDER BY p.tempo_leitura_total DESC;
