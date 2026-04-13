import React, { useState, useEffect } from "react";
import { User, Settings, LogOut, Users, Clock, Loader2, Camera, ChevronRight, Star, FileText, X, Trash2, Moon, Sun, Award, BookOpen, Send, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase, type KefelCelula, type KefelProfile, type KefelFavorito } from "@/lib/supabase";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

// ── Mapa completo de selos ────────────────────────────────────────
const BADGE_MAP: Record<string, { label: string; img: string; color: string; desc: string }> = {
  culto:        { label: "Culto",        img: "/badge_culto.png",        color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200",  desc: "Presença registrada no culto dominical" },
  celula:       { label: "Célula",       img: "/badge_celula.png",       color: "bg-slate-50 dark:bg-slate-800 border-slate-200",     desc: "Presença registrada na célula" },
  cursao:       { label: "Cursão",       img: "/badge_cursao.png",       color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200",  desc: "Concluiu o Cursão de Teologia" },
  ctl:          { label: "CTL",          img: "/badge_ctl.png",          color: "bg-slate-100 dark:bg-slate-700 border-slate-300",    desc: "Completou o treinamento CTL" },
  lider:        { label: "Líder",        img: "/badge_lider.png",        color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200",  desc: "Líder de Célula" },
  discipulador: { label: "Discipulador", img: "/badge_discipulador.png", color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200",    desc: "Discipulador de novos membros" },
  equipe:       { label: "Equipe",       img: "/badge_equipe.png",       color: "bg-slate-100 dark:bg-slate-700 border-slate-300",   desc: "Membro da equipe de serviço" },
  biblia:       { label: "Bíblia",       img: "/badge_biblia.png",       color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200", desc: "Capítulos lidos na Bíblia" },
};

export function Profile() {
  const { id } = useParams();
  const { user: currentUser, setUser, logout, showToast } = useAuth();
  const { isDark, toggleDark } = useDarkMode();
  
  const [profile, setProfile] = useState<KefelProfile | null>(null);
  const [meuGrupo, setMeuGrupo] = useState<KefelCelula | null>(null);
  const [favorites, setFavorites] = useState<KefelFavorito[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReportCenter, setShowReportCenter] = useState(false);
  const [newName, setNewName] = useState(currentUser?.nome || "");
  const [newPhone, setNewPhone] = useState(currentUser?.telefone || "");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [meusRelatorios, setMeusRelatorios] = useState<any[]>([]);
  const [allRelatorios, setAllRelatorios] = useState<any[]>([]);
  const [loadingAllRels, setLoadingAllRels] = useState(false);
  const [activeBadge, setActiveBadge] = useState<string | null>(null);
  const [badgeRequests, setBadgeRequests] = useState<Record<string, string>>({}); // key -> status
  const [requesting, setRequesting] = useState<string | null>(null);

  const isOwnProfile = !id || id === currentUser?.id;

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const targetId = id || currentUser?.id;
      if (!targetId) return;

      const [profRes, favRes, relRes, reqRes] = await Promise.all([
        supabase.from("kefel_profiles").select("*").eq("id", targetId).single(),
        supabase.from("kefel_favoritos").select("*").eq("user_id", targetId).order('created_at', { ascending: false }),
        (currentUser?.role === 'master' || currentUser?.role === 'lider') 
          ? supabase.from("kefel_relatorios").select("*").eq("lider_id", targetId).order('data', { ascending: false }).limit(10)
          : Promise.resolve({ data: [] }),
        // Carrega solicitações existentes do próprio usuário
        supabase.from("kefel_badge_requests").select("badge_key, status").eq("user_id", targetId)
      ]);

      if (profRes.data) {
        const profData = profRes.data as KefelProfile;
        setProfile(profData);
        setFavorites(favRes.data as KefelFavorito[] || []);
        setMeusRelatorios(relRes.data || []);
        setNewName(profData.nome);
        
        if (profData.celula_id) {
          const { data: celData } = await supabase.from("kefel_celulas").select("*").eq("id", profData.celula_id).single();
          setMeuGrupo(celData as KefelCelula);
        }
      }

      // Mapeia status das solicitações
      if (reqRes.data) {
        const map: Record<string, string> = {};
        (reqRes.data as any[]).forEach(r => { map[r.badge_key] = r.status; });
        setBadgeRequests(map);
      }

      setLoading(false);
    }
    loadProfile();
  }, [id, currentUser?.id, currentUser?.role]);

  async function fetchAllReports() {
    if (currentUser?.role !== 'master') return;
    setLoadingAllRels(true);
    const { data, error } = await supabase
      .from("kefel_relatorios")
      .select("*, kefel_profiles(nome, avatar_url), kefel_celulas(nome, imagem_url)")
      .order('data', { ascending: false });
    
    if (!error) setAllRelatorios(data || []);
    setLoadingAllRels(false);
  }

  const handleRequestBadge = async (badgeKey: 'lider' | 'discipulador') => {
    if (!currentUser || requesting) return;
    setRequesting(badgeKey);
    const { error } = await supabase.from("kefel_badge_requests").insert({
      user_id: currentUser.id,
      badge_key: badgeKey,
      status: 'pendente'
    });
    if (!error) {
      setBadgeRequests(prev => ({ ...prev, [badgeKey]: 'pendente' }));
      showToast("✅ Solicitação enviada! Aguarde aprovação do Discipulador.");
    } else {
      showToast("Você já possui uma solicitação pendente.", "error");
    }
    setRequesting(null);
  };

  const formatPhone = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 2) return clean;
    if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  const handleUpdateProfile = async () => {
    if (!profile || !newName) return;
    const telClean = (newPhone || "").replace(/\D/g, "");
    
    const { data, error } = await supabase
      .from("kefel_profiles")
      .update({ nome: newName.trim(), telefone: telClean || null })
      .eq("id", profile.id)
      .select("*")
      .single();
    
    if (!error && data) {
      const updated = data as KefelProfile;
      setProfile(updated);
      if (isOwnProfile) setUser(updated);
      setShowSettings(false);
      showToast("Perfil atualizado!");
    } else {
      showToast("Erro ao atualizar", "error");
    }
  };

  const togglePush = async (enabled: boolean) => {
    setPushEnabled(enabled);
    try {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal) await OneSignal.setPushDisabled(!enabled);
    } catch (e) {
      console.error("Erro toggle push:", e);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);
      const { data: updated, error: updateError } = await supabase.from("kefel_profiles").update({ avatar_url: urlData.publicUrl }).eq("id", currentUser.id).select("*").single();
      if (updateError) throw updateError;
      setUser(updated as KefelProfile);
      setProfile(updated as KefelProfile);
      showToast("Foto de perfil atualizada!");
    } catch {
      showToast("Falha no upload", "error");
    }
    setUploading(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0min";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}min`;
  };

  // Badges que o usuário tem: automáticos por role + badges customizados
  const getEffectiveBadges = (p: KefelProfile): string[] => {
    const badges: string[] = [...(p.badges || [])];
    if (p.role === 'lider' && !badges.includes('lider')) badges.push('lider');
    if (p.role === 'master' && !badges.includes('discipulador')) badges.push('discipulador');
    return badges;
  };

  if (loading) {
     return (
       <div className="flex flex-col items-center justify-center h-screen gap-4 dark:bg-slate-900">
          <Loader2 className="animate-spin text-[#1B3B6B] dark:text-blue-400" />
          <p className="text-gray-400 font-bold uppercase italic text-[10px]">Carregando Perfil...</p>
       </div>
     );
  }

  if (!profile) return null;

  const effectiveBadges = getEffectiveBadges(profile);

  return (
    <div className="flex flex-col min-h-screen bg-transparent pt-14 pb-28 px-6 overflow-y-auto">
      <header className="mb-8 pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white italic uppercase">{isOwnProfile ? 'Meu Perfil' : 'Perfil'}</h1>
          <div className="h-1.5 w-12 bg-[#1B3B6B] dark:bg-blue-500 rounded-full mt-1"></div>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Dark Mode */}
          {isOwnProfile && (
            <button
              onClick={toggleDark}
              className="glass-panel p-3.5 rounded-2xl text-[#1B3B6B] dark:text-amber-300 active:scale-95 transition-transform shadow-sm"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
          {isOwnProfile && (
            <button onClick={() => setShowSettings(true)} className="glass-panel p-3.5 rounded-2xl text-[#1B3B6B] dark:text-white active:scale-95 transition-transform shadow-sm">
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Hero Card do Perfil */}
      <div className="flex flex-col items-center gap-6 py-10 glass-panel dark:bg-slate-800/80 rounded-[3.5rem] shadow-premium shadow-[#1B3B6B]/5 mb-8 relative border-white/50 dark:border-white/10 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -mr-10 -mt-10 blur-2xl" />
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#1B3B6B] to-[#4F93F5] rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition-soft"></div>
          <div className="relative w-32 h-32 bg-white dark:bg-slate-700 rounded-[2.8rem] shadow-xl border-4 border-white dark:border-slate-600 flex items-center justify-center overflow-hidden transition-soft group-hover:scale-105">
            {uploading ? <Loader2 className="animate-spin text-[#1B3B6B]" />
              : profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" />
              : <User size={56} className="text-indigo-100" />}
          </div>
          {isOwnProfile && (
            <label className="absolute -bottom-2 -right-2 bg-black text-white p-3.5 rounded-2xl shadow-xl cursor-pointer active:scale-90 transition-soft hover:bg-[#1B3B6B]">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
          )}
        </div>
        <div className="text-center px-4">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white italic uppercase tracking-tighter leading-tight">{profile.nome}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
             <div className="h-0.5 w-4 bg-[#1B3B6B] opacity-20" />
             <p className="text-[10px] font-black text-[#1B3B6B] dark:text-blue-400 uppercase tracking-[0.2em]">{profile.role}</p>
             <div className="h-0.5 w-4 bg-[#1B3B6B] opacity-20" />
          </div>
          {meuGrupo && (
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">📍 {meuGrupo.nome}</p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass-panel dark:bg-slate-800/80 dark:border-white/10 p-5 rounded-[2rem] shadow-sm flex flex-col gap-2">
           <div className="w-9 h-9 bg-[#1B3B6B]/10 dark:bg-blue-400/10 rounded-xl flex items-center justify-center text-[#1B3B6B] dark:text-blue-400">
             <Clock size={18} />
           </div>
           <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tempo Lido</p>
           <p className="text-xl font-black text-gray-900 dark:text-white italic tracking-tighter">{formatTime(Number(profile.tempo_leitura_total))}</p>
        </div>
        <div className="glass-panel dark:bg-slate-800/80 dark:border-white/10 p-5 rounded-[2rem] shadow-sm flex flex-col gap-2">
           <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
             <Award size={18} />
           </div>
           <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Presença Culto</p>
           <p className="text-xl font-black text-gray-900 dark:text-white italic tracking-tighter">{profile.cultos_presenca ?? 0}x</p>
        </div>
        <div className="glass-panel dark:bg-slate-800/80 dark:border-white/10 p-5 rounded-[2rem] shadow-sm flex flex-col gap-2">
           <div className="w-9 h-9 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
             <Users size={18} />
           </div>
           <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Presença Célula</p>
           <p className="text-xl font-black text-gray-900 dark:text-white italic tracking-tighter">{profile.celulas_presenca ?? 0}x</p>
        </div>
        <div className="glass-panel dark:bg-slate-800/80 dark:border-white/10 p-5 rounded-[2rem] shadow-sm flex flex-col gap-2">
           <div className="w-9 h-9 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-500 dark:text-rose-400">
             <Star size={18} />
           </div>
           <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Vers. Favoritos</p>
           <p className="text-xl font-black text-gray-900 dark:text-white italic tracking-tighter">{favorites.length}</p>
        </div>
      </div>

      {/* Seção de Badges / Conquistas */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Award size={18} className="text-amber-500" />
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-widest">Conquistas</h3>
        </div>

        {/* Badges já conquistados */}
        {effectiveBadges.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {effectiveBadges.map((badgeKey) => {
              const badge = BADGE_MAP[badgeKey];
              if (!badge) return null;
              return (
                <button
                  key={badgeKey}
                  onClick={() => setActiveBadge(activeBadge === badgeKey ? null : badgeKey)}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-[1.5rem] border-2 transition-all active:scale-95 ${badge.color} ${activeBadge === badgeKey ? 'scale-105 shadow-lg' : ''}`}
                >
                  <div className="w-14 h-14 relative overflow-hidden rounded-xl">
                    <img src={badge.img} alt={badge.label} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[9px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest leading-none text-center">{badge.label}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Solicitações de Badge (lider / discipulador) — apenas no próprio perfil */}
        {isOwnProfile && (['lider', 'discipulador'] as const).map((badgeKey) => {
          const hasBadge = effectiveBadges.includes(badgeKey);
          if (hasBadge) return null;
          const status = badgeRequests[badgeKey];
          const badge = BADGE_MAP[badgeKey];
          return (
            <div key={badgeKey} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 mb-3">
              <img src={badge.img} className="w-10 h-10 object-cover rounded-xl opacity-50" />
              <div className="flex-1">
                <p className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">{badge.label}</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{badge.desc}</p>
              </div>
              {status === 'pendente' ? (
                <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-full uppercase tracking-widest">Aguardando</span>
              ) : status === 'rejeitado' ? (
                <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-full uppercase tracking-widest">Recusado</span>
              ) : (
                <button
                  onClick={() => handleRequestBadge(badgeKey)}
                  disabled={requesting === badgeKey}
                  className="flex items-center gap-1.5 text-[9px] font-black text-[#1B3B6B] dark:text-blue-400 bg-[#1B3B6B]/10 dark:bg-blue-400/10 px-3 py-1.5 rounded-full uppercase tracking-widest active:scale-95 transition-soft disabled:opacity-50"
                >
                  {requesting === badgeKey ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                  Solicitar
                </button>
              )}
            </div>
          );
        })}

        {/* Badge tooltip */}
        <AnimatePresence>
            {activeBadge && BADGE_MAP[activeBadge] && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-3 bg-black dark:bg-slate-700 p-4 rounded-2xl text-white flex items-center gap-3"
              >
                <img src={BADGE_MAP[activeBadge].img} className="w-10 h-10 object-cover rounded-xl" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{BADGE_MAP[activeBadge].label}</p>
                  <p className="text-xs font-bold text-white/90 mt-0.5">{BADGE_MAP[activeBadge].desc}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      {/* Versículos Favoritos */}
      {profile.role !== 'master' && favorites.length > 0 && (
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center gap-3">
             <Star className="text-amber-500" size={18} fill="currentColor" />
             <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-widest">Versículos Favoritos</h3>
          </div>
          <div className="flex flex-col gap-4">
             {favorites.map(fav => (
               <div key={fav.id} className="glass-panel dark:bg-slate-800/80 dark:border-white/10 p-6 rounded-[2rem] border-white/30 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-[#1B3B6B]/5 dark:bg-blue-500/10 px-4 py-2 rounded-bl-2xl">
                     <p className="text-[10px] font-black text-[#1B3B6B] dark:text-blue-400 uppercase italic tracking-tighter">
                        {fav.livro} {fav.capitulo}:{fav.versiculo}
                     </p>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4 line-clamp-4 group-hover:line-clamp-none transition-all duration-300">"{fav.texto}"</p>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* Histórico de Relatórios */}
      {(profile.role === 'master' || profile.role === 'lider') && meusRelatorios.length > 0 && (
        <div className="flex flex-col gap-8 mb-10">
           <div className="flex items-center gap-3">
              <FileText className="text-[#1B3B6B] dark:text-blue-400" size={18} />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-widest">Histórico de Relatórios</h3>
           </div>
           <div className="space-y-12">
              {(() => {
                const groupedByMonth: Record<string, any[]> = {};
                meusRelatorios.forEach(rel => {
                  const date = new Date(rel.data);
                  const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  if (!groupedByMonth[monthName]) groupedByMonth[monthName] = [];
                  groupedByMonth[monthName].push(rel);
                });
                return Object.entries(groupedByMonth).map(([month, reports]) => (
                  <div key={month} className="space-y-4">
                    <h4 className="text-[10px] font-black text-[#1B3B6B] dark:text-blue-400 uppercase tracking-[0.3em] ml-4 bg-[#1B3B6B]/5 dark:bg-blue-500/10 py-2 px-4 rounded-full w-fit italic">{month}</h4>
                    <div className="grid gap-3">
                      {reports.map((rel) => {
                        const d = new Date(rel.data);
                        const weekNum = Math.ceil(d.getDate() / 7);
                        return (
                          <div key={rel.id} className="glass-panel dark:bg-slate-800/80 dark:border-white/10 p-5 rounded-[2rem] flex items-center justify-between border-white/50 relative overflow-hidden">
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1B3B6B]/10 dark:bg-blue-500/30" />
                             <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rel.tipo === 'culto' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                   <p className="text-[10px] font-black italic">W{weekNum}</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none truncate">Semana {weekNum} • {rel.tipo}</p>
                                  <p className="font-bold text-gray-900 dark:text-white text-sm mt-1">{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Presença</p>
                                <p className="text-lg font-black text-[#1B3B6B] dark:text-blue-400 italic tabular-nums">{rel.presentes}</p>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
           </div>
        </div>
      )}

      {/* Ações do próprio perfil */}
      {isOwnProfile && (
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden flex flex-col mb-10">
          {(currentUser.role === 'master' || currentUser.role === 'lider') && (
            <Link to="/celulas" className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-50 dark:border-white/5">
               <div className="flex items-center gap-4">
                  <Users className="text-[#1B3B6B] dark:text-blue-400" size={20} />
                  <span className="font-bold text-gray-900 dark:text-white text-sm">Gerenciar Minha Célula</span>
               </div>
               <ChevronRight className="text-gray-200 dark:text-gray-600" size={16} />
            </Link>
          )}
          {currentUser.role === 'master' && (
            <button onClick={() => { setShowReportCenter(true); fetchAllReports(); }} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-50 dark:border-white/5 w-full text-left">
               <div className="flex items-center gap-4">
                  <FileText className="text-[#1B3B6B] dark:text-blue-400" size={20} />
                  <span className="font-bold text-gray-900 dark:text-white text-sm">Central de Relatórios Master</span>
               </div>
               <ChevronRight className="text-gray-200 dark:text-gray-600" size={16} />
            </button>
          )}
          {currentUser.role === 'master' && (
            <Link to="/usuarios" className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-50 dark:border-white/5">
               <div className="flex items-center gap-4">
                  <Users className="text-[#1B3B6B] dark:text-blue-400" size={20} />
                  <span className="font-bold text-gray-900 dark:text-white text-sm">Lista de Usuários Cadastrados</span>
               </div>
               <ChevronRight className="text-gray-200 dark:text-gray-600" size={16} />
            </Link>
          )}
          <button onClick={logout} className="p-6 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-950 active:bg-red-100 transition-colors w-full text-left">
            <div className="flex items-center gap-4">
                <LogOut className="text-red-500" size={20} />
                <span className="font-bold text-red-600 dark:text-red-400 text-sm">Sair da Conta</span>
            </div>
          </button>
        </div>
      )}

      {/* Modal Central de Relatórios Master */}
      <AnimatePresence>
        {showReportCenter && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-end">
             <div className="bg-white dark:bg-slate-900 w-full h-[90vh] rounded-t-[4rem] p-8 overflow-y-auto pb-32 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                   <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic">Central Master</h2>
                      <p className="text-[10px] font-black uppercase text-[#1B3B6B] dark:text-blue-400 tracking-[0.2em]">{allRelatorios.length} Envios Totais</p>
                   </div>
                   <button onClick={() => setShowReportCenter(false)} className="glass-panel dark:bg-slate-800 p-3 rounded-full"><X size={20} className="dark:text-white" /></button>
                </div>
                {loadingAllRels ? (
                  <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-[#1B3B6B]" /></div>
                ) : (
                  <div className="space-y-12">
                    {(() => {
                      const groupedByMonth: Record<string, any[]> = {};
                      allRelatorios.forEach(rel => {
                        const date = new Date(rel.data);
                        const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                        if (!groupedByMonth[monthName]) groupedByMonth[monthName] = [];
                        groupedByMonth[monthName].push(rel);
                      });
                      return Object.entries(groupedByMonth).map(([month, reports]) => (
                        <div key={month} className="space-y-4">
                          <h4 className="text-[10px] font-black text-[#1B3B6B] dark:text-blue-400 uppercase tracking-[0.3em] ml-4 bg-[#1B3B6B]/5 dark:bg-blue-500/10 py-2 px-6 rounded-full w-fit italic">{month}</h4>
                          <div className="grid gap-4">
                            {reports.map(rel => {
                              const d = new Date(rel.data);
                              const weekNum = Math.ceil(d.getDate() / 7);
                              return (
                                <div key={rel.id} className="glass-panel dark:bg-slate-800/80 dark:border-white/10 p-6 rounded-[2.5rem] border-white/50 relative overflow-hidden flex flex-col gap-4">
                                   <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1B3B6B] dark:bg-blue-500" />
                                   <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 bg-gray-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-[#1B3B6B] dark:text-blue-400 font-black italic text-[10px]">W{weekNum}</div>
                                         <div>
                                            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Semana {weekNum} • {rel.tipo}</p>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm mt-1">{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                                         </div>
                                      </div>
                                      <div className="bg-[#1B3B6B] dark:bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-lg flex items-center gap-4">
                                         <div className="text-right">
                                            <p className="text-[9px] font-black uppercase opacity-60 leading-none">Presença</p>
                                            <p className="text-sm font-black italic mt-0.5">{rel.presentes}</p>
                                         </div>
                                         <button
                                            onClick={async () => {
                                              if (confirm("Deseja realmente excluir este relatório?")) {
                                                const { error } = await supabase.from("kefel_relatorios").delete().eq("id", rel.id);
                                                if (!error) { showToast("Relatório excluído!"); fetchAllReports(); }
                                                else showToast("Erro ao excluir", "error");
                                              }
                                            }}
                                            className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors"
                                         >
                                            <Trash2 size={16} className="text-white/80" />
                                         </button>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-4 bg-gray-50/50 dark:bg-slate-700/50 p-4 rounded-2xl border border-dashed border-gray-100 dark:border-white/10">
                                      <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-600 p-0.5">
                                         {rel.kefel_celulas?.imagem_url ? <img src={rel.kefel_celulas.imagem_url} className="w-full h-full object-cover rounded-lg" /> : <User className="w-full h-full p-2 text-gray-200" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                         <p className="text-[12px] font-black text-gray-900 dark:text-white uppercase italic leading-none truncate">{rel.kefel_celulas?.nome || "Culto / Cel. Avulsa"}</p>
                                         <p className="text-[9px] text-[#1B3B6B] dark:text-blue-400 font-black uppercase tracking-widest mt-1.5 opacity-60">Líder: {rel.kefel_profiles?.nome || "Desconhecido"}</p>
                                      </div>
                                   </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
             </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Configurações */}
      {showSettings && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-end">
           <div className="bg-white dark:bg-slate-900 w-full rounded-t-[3.5rem] p-10 space-y-8 shadow-2xl">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">Configurações</h2>
                 <button onClick={() => setShowSettings(false)} className="glass-panel dark:bg-slate-800 p-2 rounded-full"><X size={20} className="dark:text-white" /></button>
              </div>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4">Editar Nome</p>
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Seu Nome" className="w-full bg-gray-50 dark:bg-slate-800 dark:text-white p-5 rounded-2xl font-bold outline-none italic uppercase" />
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4">WhatsApp</p>
                    <input type="tel" value={formatPhone(newPhone)} onChange={e => setNewPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full bg-gray-50 dark:bg-slate-800 dark:text-white p-5 rounded-2xl font-bold outline-none italic" />
                 </div>
                 <div className="flex items-center justify-between p-2">
                    <div>
                       <p className="font-black text-gray-900 dark:text-white uppercase italic text-sm">Tema Escuro</p>
                       <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">Modo noturno</p>
                    </div>
                    <button onClick={toggleDark} className={`w-14 h-8 rounded-full transition-colors relative ${isDark ? 'bg-[#1B3B6B]' : 'bg-gray-200'}`}>
                       <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${isDark ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                 </div>
                 <div className="flex items-center justify-between p-2">
                    <div>
                       <p className="font-black text-gray-900 dark:text-white uppercase italic text-sm">Notificações Push</p>
                       <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">Ativar lembretes e alertas</p>
                    </div>
                    <button onClick={() => togglePush(!pushEnabled)} className={`w-14 h-8 rounded-full transition-colors relative ${pushEnabled ? 'bg-[#1B3B6B]' : 'bg-gray-200'}`}>
                       <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${pushEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                 </div>
                 <button onClick={handleUpdateProfile} className="w-full bg-[#1B3B6B] text-white py-5 rounded-[2rem] font-black uppercase italic tracking-widest shadow-lg active:scale-95 transition-soft">
                    Salvar Alterações
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
