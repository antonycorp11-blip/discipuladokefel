export type UserRole = 'master' | 'lider' | 'membro';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  celula_id?: string;
  tempo_leitura_total: number; // in seconds
  photoURL?: string;
}

export interface Celula {
  id: string;
  nome: string;
  dia_semana: string;
  lider_id: string;
}

export interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  imagem_url: string;
  data_hora: string;
  preco: number;
  endereco: string;
  criado_por: string;
  tipo: 'gratuito' | 'pago';
}

export interface LeituraLog {
  id: string;
  user_id: string;
  tempo_segundos: number;
  data: string;
  livro: string;
  capitulo: number;
}
