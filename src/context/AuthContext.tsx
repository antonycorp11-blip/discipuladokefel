import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase, type KefelProfile } from "@/lib/supabase";

// ── Email do master fixo (não precisa de convite) ──────────────
const MASTER_EMAIL = "aquilles@kefel.com";

interface AuthContextType {
  user: KefelProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  register: (nome: string, email: string, password: string, celulaId?: string) => Promise<{ success: boolean; message?: string }>;
  updateReadingTime: (seconds: number, livro: string, capitulo: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<KefelProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Carrega perfil do usuário autenticado
  const loadProfile = useCallback(async (userId: string): Promise<KefelProfile | null> => {
    const { data, error } = await supabase
      .from("kefel_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) return null;
    return data as KefelProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const profile = await loadProfile(authUser.id);
      setUser(profile);
    }
  }, [loadProfile]);

  // Escuta mudanças de sessão
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Garante que o perfil existe (pode ter sido criado pelo trigger)
        await new Promise((r) => setTimeout(r, 500));
        const profile = await loadProfile(session.user.id).catch(e => {
          console.error("Erro fatal ao carregar perfil:", e);
          return null;
        });
        if (!profile) {
          console.warn("Perfil não encontrado no banco para o ID:", session.user.id);
          // Fallback para o Master conseguir testar se o banco falhar na busca (debug)
          if (session.user.email === 'antonycorp11@gmail.com') {
            setUser({
              id: session.user.id,
              email: session.user.email,
              nome: "Aquilles (Master)",
              role: 'master',
              tempo_leitura_total: 0
            });
            setLoading(false);
            return;
          }
        }
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  // ── Login ──────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });

    if (error) {
      setLoading(false); // Só paramos o loading aqui se houver erro real
      if (error.message.includes("Invalid login")) return { success: false, message: "E-mail ou senha incorretos." };
      if (error.message.includes("Email not confirmed")) return { success: false, message: "Confirme seu e-mail antes de entrar." };
      return { success: false, message: error.message };
    }
    return { success: true };
  };

  // ── Logout ─────────────────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // ── Registro de membro comum ───────────────────────────────────
  const register = async (nome: string, email: string, password: string, celulaId?: string): Promise<{ success: boolean; message?: string }> => {
    const emailClean = email.trim().toLowerCase();

    const result = await supabase.auth.signUp({
      email: emailClean,
      password,
      options: {
        data: { nome },
        emailRedirectTo: window.location.origin,
      },
    });

    if (result.error) {
      if (result.error.message.includes("already registered")) return { success: false, message: "Este e-mail já está cadastrado." };
      return { success: false, message: result.error.message };
    }

    // Cria o perfil manualmente agora que o gatilho foi removido para evitar erro 500
    const newUserId = (result.data as any)?.user?.id || (result.data as any)?.id;
    if (newUserId) {
      const role = emailClean === 'antonycorp11@gmail.com' ? 'master' : 'membro';
      const { error: insErr } = await supabase
        .from("kefel_profiles")
        .insert({ 
          id: newUserId, 
          email: emailClean, 
          nome, 
          role, 
          tempo_leitura_total: 0,
          celula_id: celulaId || null 
        });
      
      if (insErr) {
        console.error("Erro ao criar perfil:", insErr);
      }
    }

    return { success: true };
  };

  // ── Salvar tempo de leitura ────────────────────────────────────
  const updateReadingTime = async (seconds: number, livro: string, capitulo: number) => {
    if (!user) return;

    // Atualiza estado local imediatamente
    const updated = { ...user, tempo_leitura_total: user.tempo_leitura_total + seconds };
    setUser(updated);

    // Persiste no banco
    await Promise.all([
      supabase
        .from("kefel_profiles")
        .update({ tempo_leitura_total: updated.tempo_leitura_total })
        .eq("id", user.id),
      supabase
        .from("kefel_leitura_logs")
        .insert({ user_id: user.id, livro, capitulo, tempo_segundos: seconds }),
    ]);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateReadingTime, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// ── Convidar líder (chama Supabase Auth invite) ────────────────
export async function inviteLeader(nome: string, email: string, masterId: string): Promise<{ success: boolean; message?: string }> {
  const emailClean = email.trim().toLowerCase();

  // 1) Registra o convite na tabela (trigger vai promovê-lo a lider no signup)
  const { error: inviteError } = await supabase
    .from("kefel_invites")
    .insert({ email: emailClean, nome, convidado_por: masterId });

  if (inviteError && !inviteError.message.includes("duplicate")) {
    return { success: false, message: "Erro ao registrar convite: " + inviteError.message };
  }

  // 2) Envia o e-mail de convite via Supabase Auth Admin
  const { error: authError } = await supabase.auth.admin.inviteUserByEmail(emailClean, {
    data: { nome },
    redirectTo: `${window.location.origin}/register`,
  });

  if (authError) {
    // Se já existe, tenta apenas o convite de email via magic link
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email: emailClean,
      options: {
        data: { nome },
        emailRedirectTo: `${window.location.origin}/register`,
        shouldCreateUser: true,
      },
    });
    if (magicError) return { success: false, message: "Erro ao enviar convite: " + magicError.message };
  }

  return { success: true };
}

// ── Busca todos perfis (master/lider) ─────────────────────────
export async function getAllKefelProfiles(): Promise<KefelProfile[]> {
  const { data } = await supabase.from("kefel_profiles").select("*").order("nome");
  return (data || []) as KefelProfile[];
}

export const MASTER_EMAIL_CONST = MASTER_EMAIL;
