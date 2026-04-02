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
  signInMember: (nome: string, celulaId: string) => Promise<{ success: boolean; message?: string }>;
  updateReadingTime: (seconds: number, livro: string, capitulo: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<KefelProfile | null>>;
  deleteProfile: (id: string) => Promise<{ success: boolean }>;
  promoteToLeader: (userId: string, celulaId: string) => Promise<{ success: boolean }>;
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
          
          // Tentar recuperar dados do localStorage se for um usuário anônimo "perdido"
          const savedData = localStorage.getItem('kefel_member_data');
          if (savedData && (session.user as any).is_anonymous) {
            const { nome, celula_id } = JSON.parse(savedData);
            // Re-vincular o perfil se necessário (isso ajuda se o perfil não foi criado corretamente)
            const { data: recoveredProfile } = await supabase
              .from("kefel_profiles")
              .upsert({
                id: session.user.id,
                nome,
                role: 'membro',
                celula_id,
                email: `anon_${session.user.id}@kefel.com`,
                tempo_leitura_total: 0
              })
              .select("*")
              .single();
            if (recoveredProfile) setUser(recoveredProfile as KefelProfile);
          }
        } else {
          // Salvar no localStorage para persistência se for membro
          if (profile.role === 'membro' && profile.celula_id) {
            localStorage.setItem('kefel_member_data', JSON.stringify({
              nome: profile.nome,
              celula_id: profile.celula_id
            }));
          }
          setUser(profile);

          // Sincronizar OneSignal
          try {
            (window as any).OneSignal?.push(() => {
              (window as any).OneSignal.setExternalUserId(profile.id);
              (window as any).OneSignal.sendTag("role", profile.role);
              if (profile.celula_id) {
                (window as any).OneSignal.sendTag("celula_id", profile.celula_id);
              }
            });
          } catch (e) {
            console.warn("Erro OneSignal Tags:", e);
          }
        }
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
    localStorage.removeItem('kefel_member_data');
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
  
  // ── Login de Membro (Anônimo) ──────────────────────────────────
  const signInMember = async (nome: string, celulaId: string): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    try {
      // 1. Verificar duplicidade de nome na mesma célula
      const { data: existingData } = await supabase
        .from("kefel_profiles")
        .select("id")
        .eq("nome", nome)
        .eq("celula_id", celulaId)
        .limit(1);
      
      const existing = existingData as any[] | null;
      
      if (existing && existing.length > 0) {
        setLoading(false);
        return { success: false, message: "Já existe alguém com este nome nesta célula. Se você já tem conta, procure seu líder." };
      }

      // 2. Login Anônimo
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error("Erro Auth Anônimo:", error);
        if (error.status === 406) {
          return { success: false, message: "O login anônimo está desativado no painel do Supabase. Master, verifique em: Authentication > Providers > Anonymous." };
        }
        throw error;
      }
      
      if (data.user) {
        // Pequeno delay para propagação do ID no Supabase
        await new Promise(r => setTimeout(r, 1000));

        const dummyEmail = `anon_${data.user.id}@kefel.com`;
        const { data: profile, error: profileError } = await supabase
          .from("kefel_profiles")
          .upsert({
            id: data.user.id,
            nome,
            role: 'membro',
            celula_id: (celulaId && celulaId.length > 10) ? celulaId : null, // Garante que seja um UUID válido ou nulo
            email: dummyEmail,
            tempo_leitura_total: 0
          })
          .select("*")
          .single();
          
        if (profileError) {
          console.error("Erro ao criar perfil após login anônimo:", profileError);
          throw profileError;
        }
        
        // Persistência local para membros anônimos
        localStorage.setItem('kefel_member_data', JSON.stringify({ nome, celula_id: celulaId }));
        
        setUser(profile as KefelProfile);
      }
      
      return { success: true };
    } catch (err: any) {
      console.error("Erro fatal no Login Membro:", err);
      return { success: false, message: "Falha ao criar perfil: " + (err.message || "Erro de conexão") };
    } finally {
      setLoading(false);
    }
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

  // ── Deletar Perfil (Master) ──────────────────────────────────
  const deleteProfile = async (id: string) => {
    const { error } = await supabase.from("kefel_profiles").delete().eq("id", id);
    if (error) {
      console.error("Erro ao deletar perfil:", error);
      return { success: false };
    }
    return { success: true };
  };

  // ── Promover a Líder (Master) ────────────────────────────────
  const promoteToLeader = async (userId: string, celulaId: string) => {
    // 1. Atualiza o papel do usuário para líder
    const { error: profileError } = await supabase
      .from("kefel_profiles")
      .update({ role: 'lider', celula_id: celulaId })
      .eq("id", userId);

    if (profileError) {
      console.error("Erro ao atualizar papel:", profileError);
      return { success: false };
    }

    // 2. Vincula o líder à célula na tabela de celulas
    const { error: cellError } = await supabase
      .from("kefel_celulas")
      .update({ lider_id: userId })
      .eq("id", celulaId);

    if (cellError) {
      console.error("Erro ao vincular líder à célula:", cellError);
      return { success: false };
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      register, 
      signInMember, 
      updateReadingTime, 
      refreshProfile, 
      setUser,
      deleteProfile,
      promoteToLeader
    }}>
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
