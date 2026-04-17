-- Tabela para pedidos de oração compartilhados no feed
CREATE TABLE IF NOT EXISTS kefel_oracao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES kefel_profiles(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kefel_oracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver pedidos" ON kefel_oracao
  FOR SELECT USING (true);

CREATE POLICY "Usuário insere próprio pedido" ON kefel_oracao
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário deleta próprio pedido" ON kefel_oracao
  FOR DELETE USING (auth.uid() = user_id);
