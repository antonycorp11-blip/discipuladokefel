-- 1. Adicionar colunas de metas na tabela kefel_celulas
ALTER TABLE public.kefel_celulas
ADD COLUMN IF NOT EXISTS meta_celula integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_culto integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_evento integer DEFAULT 0;

-- 2. Adicionar colunas de referência e meta no relatório para guardar o histórico exato
ALTER TABLE public.kefel_relatorios
ADD COLUMN IF NOT EXISTS referencia text,
ADD COLUMN IF NOT EXISTS meta_exigida integer DEFAULT 0;

-- Garantir que não existam linhas duplicadas para o mesmo líder e referência (opcional, pode limpar lixo antigo se quiser)
-- O front-end usará .delete() antes de dar .insert() caso queira sobrepor.
