// ── Cliente Supabase usando fetch nativo — sem npm install necessário ──
// Implementa auth, database (PostgREST) e storage via REST API pura.

const SUPABASE_URL = 'https://wayigtlilhvutbfvxgae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndheWlndGxpbGh2dXRiZnZ4Z2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDUwODQsImV4cCI6MjA4NDA4MTA4NH0.T26a6WAF4R7UlxN8lRHqoh_QEpc3SZqa97NhOlXQfbI';

// ── Tipos ────────────────────────────────────────────────────────
export type KefelRole = 'master' | 'lider' | 'membro';

export interface KefelProfile {
  id: string;
  nome: string;
  email: string;
  role: KefelRole;
  celula_id?: string | null;
  tempo_leitura_total: number;
  avatar_url?: string | null;
}

export interface KefelCelula {
  id: string;
  nome: string;
  dia_semana: string;
  lider_id?: string | null;
  criado_por?: string | null;
  imagem_url?: string | null;
}

export interface KefelEvento {
  id: string;
  titulo: string;
  descricao: string;
  imagem_url?: string | null;
  data_hora: string;
  preco: number;
  endereco: string;
  tipo: 'gratuito' | 'pago';
  criado_por?: string | null;
}

export interface KefelInvite {
  id: string;
  email: string;
  nome: string;
  convidado_por?: string | null;
  status: 'pendente' | 'aceito' | 'expirado';
}

export interface KefelFavorito {
  id: string;
  user_id: string;
  livro: string;
  capitulo: number;
  versiculo: number;
  texto: string;
  created_at?: string;
}

// ── Sessão persistida em localStorage ───────────────────────────
const SESSION_KEY = 'kefel_sb_session';

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix timestamp
  user: { id: string; email: string };
}

function getSession(): Session | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

function saveSession(s: Session | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

async function getToken(): Promise<string> {
  const session = getSession();
  if (!session) return SUPABASE_ANON_KEY;

  // Se o token expira em menos de 5 minutos, renova agora
  const isExpired = Date.now() > (session.expires_at - 300000);
  if (isExpired && session.refresh_token) {
    const fresh = await supabase.auth._refresh(session.refresh_token);
    if (fresh) return fresh.access_token;
  }

  return session.access_token;
}

// ── Cabeçalhos comuns ────────────────────────────────────────────
function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════
export const supabase = {
  auth: {
    _listeners: [] as Array<(event: string, session: Session | null) => void>,

    onAuthStateChange(cb: (event: string, session: Session | null) => void) {
      supabase.auth._listeners.push(cb);
      // Notifica imediatamente com sessão atual
      const s = getSession();
      if (s) setTimeout(() => cb('SIGNED_IN', s), 0);
      else setTimeout(() => cb('SIGNED_OUT', null), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              supabase.auth._listeners = supabase.auth._listeners.filter((l) => l !== cb);
            },
          },
        },
      };
    },

    _notify(event: string, session: Session | null) {
      supabase.auth._listeners.forEach((l) => l(event, session));
    },

    async getUser() {
      const s = getSession();
      return { data: { user: s ? s.user : null } };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: { message: data.error_description || data.msg || 'Erro ao entrar' } };
      }
      const session: Session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
        user: { id: data.user.id, email: data.user.email },
      };
      saveSession(session);
      supabase.auth._notify('SIGNED_IN', session);
      return { error: null, data: { session } };
    },

    async signUp({ email, password, options }: {
      email: string; password: string;
      options?: { data?: Record<string, string>; emailRedirectTo?: string };
    }) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password,
          data: options?.data || {},
          gotrue_meta_security: {},
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: { message: data.error_description || data.msg || 'Erro ao criar conta' }, data: null };
      }

      // Se o Supabase retornou sessão (autologin), salvamos aqui
      if (data.access_token) {
        const session: Session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + (data.expires_in || 3600) * 1000,
          user: { id: data.user.id, email: data.user.email },
        };
        saveSession(session);
        supabase.auth._notify('SIGNED_IN', session);
      }

      return { error: null, data: { user: data.user || data } };
    },

    async signInAnonymously() {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymous: true,
          gotrue_meta_security: {},
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: { message: data.error_description || data.msg || 'Erro ao entrar anonimamente' }, data: null };
      }

      const session: Session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
        user: { id: data.user.id, email: data.user.email || '' },
      };
      saveSession(session);
      supabase.auth._notify('SIGNED_IN', session);
      return { error: null, data: { user: data.user, session } };
    },

    async signOut() {
      const session = getSession();
      if (session) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: headers(),
        }).catch(() => {});
      }
      saveSession(null);
      supabase.auth._notify('SIGNED_OUT', null);
    },

    // Renovação automática de token
    async _refresh(refreshToken: string) {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error('Refresh failed');

        const session: Session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + (data.expires_in || 3600) * 1000,
          user: { id: data.user.id, email: data.user.email },
        };
        saveSession(session);
        return session;
      } catch {
        // Se falhar o refresh total, desloga
        saveSession(null);
        supabase.auth._notify('SIGNED_OUT', null);
        return null;
      }
    },

    // Convite de líder via Magic Link (OTP)
    async signInWithOtp({ email, options }: { email: string; options?: { data?: Record<string, string>; emailRedirectTo?: string; shouldCreateUser?: boolean } }) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/magiclink`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, data: options?.data || {} }),
      });
      const data = await res.json();
      if (!res.ok) return { error: { message: data.error_description || data.msg || 'Erro' } };
      return { error: null };
    },

    // Admin: invite user (usa service_role — funciona apenas se configurado)
    admin: {
      inviteUserByEmail: async (email: string, _options?: unknown) => {
        // Na versão client-side não temos service_role, então usamos OTP como fallback
        return supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  //  DATABASE (PostgREST)
  // ══════════════════════════════════════════════════════════════
  from(table: string) {
    return new QueryBuilder(table);
  },

  async rpc(name: string, args: Record<string, any> = {}) {
    const url = `${SUPABASE_URL}/rest/v1/rpc/${name}`;
    const token = await getToken();
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers(),
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(args)
    });

    if (res.status === 204) return { data: null, error: null };
    let json: any;
    try { json = await res.json(); } catch { json = null; }
    
    if (!res.ok) {
      return { data: null, error: { message: json?.message || `HTTP ${res.status}` } };
    }
    return { data: json, error: null };
  },

  // ══════════════════════════════════════════════════════════════
  //  STORAGE
  // ══════════════════════════════════════════════════════════════
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File, _opts?: unknown) {
          const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${await getToken()}`,
              'x-upsert': 'true',
            },
            body: file,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { error: { message: (err as { message?: string }).message || 'Upload falhou' }, data: null };
          }
          return { data: { path }, error: null };
        },
        getPublicUrl(path: string) {
          return {
            data: { publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` },
          };
        },
      };
    },
  },
};

// ══════════════════════════════════════════════════════════════
//  QueryBuilder — encadeia .select().eq().order().limit().single()
// ══════════════════════════════════════════════════════════════
class QueryBuilder {
  private _table: string;
  private _qs: string[] = [];
  private _headers: Record<string, string> = {};
  private _single = false;
  private _method = 'GET';
  private _body: unknown = undefined;
  private _prefer: string[] = [];

  constructor(table: string) {
    this._table = table;
    this._headers = headers();
  }

  select(cols = '*') {
    this._qs.push(`select=${encodeURIComponent(cols)}`);
    return this;
  }

  eq(col: string, val: string | number | boolean) {
    this._qs.push(`${col}=eq.${encodeURIComponent(String(val))}`);
    return this;
  }

  neq(col: string, val: string | number) {
    this._qs.push(`${col}=neq.${encodeURIComponent(String(val))}`);
    return this;
  }

  gte(col: string, val: string) {
    this._qs.push(`${col}=gte.${encodeURIComponent(val)}`);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    const dir = opts?.ascending === false ? 'desc' : 'asc';
    this._qs.push(`order=${col}.${dir}`);
    return this;
  }

  limit(n: number) {
    this._qs.push(`limit=${n}`);
    return this;
  }

  single() {
    this._single = true;
    this._headers['Accept'] = 'application/vnd.pgrst.object+json';
    return this;
  }

  // Mutations
  insert(data: unknown) {
    this._method = 'POST';
    this._body = Array.isArray(data) ? data : [data];
    this._prefer.push('return=representation');
    return this;
  }

  update(data: unknown) {
    this._method = 'PATCH';
    this._body = data;
    this._prefer.push('return=representation');
    return this;
  }

  delete() {
    this._method = 'DELETE';
    this._prefer.push('return=representation');
    return this;
  }

  upsert(data: unknown) {
    this._method = 'POST';
    this._body = Array.isArray(data) ? data : [data];
    this._prefer.push('return=representation', 'resolution=merge-duplicates');
    return this;
  }

  // Executa a query — retorna Promise real
  async exec(): Promise<{ data: unknown; error: { message: string } | null }> {
    const qs = this._qs.length ? '?' + this._qs.join('&') : '';
    const url = `${SUPABASE_URL}/rest/v1/${this._table}${qs}`;

    // Busca o token de forma assíncrona (com refresh automático se necessário)
    const token = await getToken();

    const reqHeaders: Record<string, string> = {
      ...this._headers,
      Authorization: `Bearer ${token}`,
      ...(this._prefer.length ? { Prefer: this._prefer.join(',') } : {}),
    };

    return fetch(url, {
      method: this._method,
      headers: reqHeaders,
      body: this._body !== undefined ? JSON.stringify(this._body) : undefined,
    }).then(async (res) => {
      if (res.status === 204) return { data: null, error: null };
      let json: unknown;
      try { json = await res.json(); } catch { json = null; }
      if (!res.ok) {
        const err = json as { message?: string; details?: string } | null;
        return { data: null, error: { message: err?.message || err?.details || `HTTP ${res.status}` } };
      }
      return { data: json ?? null, error: null };
    });
  }

  // Thenable — permite usar `await query` diretamente
  then<T>(
    resolve: (result: { data: unknown; error: { message: string } | null }) => T,
    reject?: (reason: unknown) => T
  ): Promise<T> {
    return this.exec().then(resolve, reject);
  }
}
