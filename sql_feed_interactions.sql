-- Tabela para interações no feed (curtidas e "estou orando")
CREATE TABLE IF NOT EXISTS kefel_feed_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES kefel_profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL, -- ID do favorito ou do pedido de oração
  item_type TEXT NOT NULL, -- 'favorite' ou 'oracao'
  interaction_type TEXT NOT NULL, -- 'like' ou 'prayer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id, interaction_type)
);

ALTER TABLE kefel_feed_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver interações" ON kefel_feed_interactions
  FOR SELECT USING (true);

CREATE POLICY "Usuário interage" ON kefel_feed_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário remove interação" ON kefel_feed_interactions
  FOR DELETE USING (auth.uid() = user_id);
