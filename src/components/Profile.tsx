import React, { useState, useEffect } from "react";
import { User, Settings, LogOut, Users, Clock, Loader2, Camera, ChevronRight, Star, FileText, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase, type KefelCelula, type KefelProfile, type KefelFavorito } from "@/lib/supabase";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export function Profile() {
  const { id } = useParams();
  const { user: currentUser, setUser, logout } = useAuth();
  
  const [profile, setProfile] = useState<KefelProfile | null>(null);
  const [meuGrupo, setMeuGrupo] = useState<KefelCelula | null>(null);
  const [favorites, setFavorites] = useState<KefelFavorito[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReportCenter, setShowReportCenter] = useState(false);
  const [newName, setNewName] = useState(currentUser?.nome || "");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [meusRelatorios, setMeusRelatorios] = useState<any[]>([]);
  const [allRelatorios, setAllRelatorios] = useState<any[]>([]);
  const [loadingAllRels, setLoadingAllRels] = useState(false);

  const isOwnProfile = !id || id === currentUser?.id;

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const targetId = id || currentUser?.id;
      if (!targetId) return;

      const [profRes, favRes, relRes] = await Promise.all([
        supabase.from("kefel_profiles").select("*").eq("id", targetId).single(),
        supabase.from("kefel_favoritos").select("*").eq("user_id", targetId).order('created_at', { ascending: false }),
        (currentUser?.role === 'master' || currentUser?.role === 'lider') 
          ? supabase.from("kefel_relatorios").select("*").eq("lider_id", targetId).order('data', { ascending: false }).limit(10)
          : Promise.resolve({ data: [] })
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
      setLoading(false);
    }
    loadProfile();
  }, [id, currentUser?.id, currentUser?.role]);

  async function fetchAllReports() {
    if (currentUser?.role !== 'master') return;
    setLoadingAllRels(true);
    const { data, error } = await supabase
      .from("kefel_relatorios")
      .select("*, kefel_profiles(nome, avatar_url), kefel_celulas(nome)")
      .order('data', { ascending: false });
    
    if (!error) setAllRelatorios(data || []);
    setLoadingAllRels(false);
  }

  const handleUpdateName = async () => {
    if (!profile || !newName) return;
    const { data, error } = await supabase
      .from("kefel_profiles")
      .update({ nome: newName })
      .eq("id", profile.id)
      .select("*")
      .single();
    
    if (!error && data) {
      setProfile(data as KefelProfile);
      if (isOwnProfile) setUser(data as KefelProfile);
      setShowSettings(false);
      alert("Nome atualizado!");
    }
  };

  const togglePush = async (enabled: boolean) => {
    setPushEnabled(enabled);
    try {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal) {
        await OneSignal.setPushDisabled(!enabled);
      }
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
      const publicUrl = urlData.publicUrl;

      const { data: updated, error: updateError } = await supabase.from("kefel_profiles").update({ avatar_url: publicUrl }).eq("id", currentUser.id).select("*").single();
      if (updateError) throw updateError;

      setUser(updated as KefelProfile);
      setProfile(updated as KefelProfile);
      alert("Foto de perfil atualizada!");
    } catch (err: any) {
      alert("Falha no upload: " + err.message);
    }
    setUploading(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0min";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}min`;
  };

  if (loading) {
     return (
       <div className="flex flex-col items-center justify-center h-screen gap-4">
          <Loader2 className="animate-spin text-[#1B3B6B]" />
          <p className="text-gray-400 font-bold uppercase italic text-[10px]">Carregando Perfil...</p>
       </div>
     );
  }

  if (!profile) return null;

  return (
    <div className="flex flex-col min-h-screen bg-transparent pt-14 pb-28 px-6 overflow-y-auto">
      <header className="mb-8 pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 italic uppercase">{isOwnProfile ? 'Meu Perfil' : 'Perfil'}</h1>
          <div className="h-1.5 w-12 bg-[#1B3B6B] rounded-full mt-1"></div>
        </div>
        {isOwnProfile && (
          <button onClick={() => setShowSettings(true)} className="glass-panel p-3.5 rounded-2xl text-[#1B3B6B] active:scale-95 transition-transform shadow-sm"><Settings className="w-5 h-5" /></button>
        )}
      </header>

      <div className="flex flex-col items-center gap-6 py-10 glass-panel rounded-[3.5rem] shadow-premium shadow-[#1B3B6B]/5 mb-8 relative border-white/50">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1B3B6B]/50/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#1B3B6B] to-[#4F93F5] rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition-soft"></div>
          <div className="relative w-32 h-32 bg-white rounded-[2.8rem] shadow-xl border-4 border-white flex items-center justify-center overflow-hidden transition-soft group-hover:scale-105">
            {uploading ? (
              <Loader2 className="animate-spin text-[#1B3B6B]" />
            ) : profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <User size={56} className="text-indigo-100" />
            )}
          </div>
          {isOwnProfile && (
            <label className="absolute -bottom-2 -right-2 bg-black text-white p-3.5 rounded-2xl shadow-xl cursor-pointer active:scale-90 transition-soft hover:bg-[#1B3B6B]">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
          )}
        </div>
        <div className="text-center px-4">
          <h2 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter leading-tight">{profile.nome}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
             <div className="h-0.5 w-4 bg-[#1B3B6B] opacity-20" />
             <p className="text-[10px] font-black text-[#1B3B6B] uppercase tracking-[0.2em]">{profile.role}</p>
             <div className="h-0.5 w-4 bg-[#1B3B6B] opacity-20" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8">
        <div className="glass-panel p-6 rounded-[2.5rem] shadow-sm border-white/50 flex flex-col gap-3 transition-soft hover:shadow-lg">
           <div className="w-10 h-10 bg-[#1B3B6B]/5 rounded-xl flex items-center justify-center text-[#1B3B6B] shadow-sm"><Clock size={20} /></div>
           <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tempo Lido</p>
              <p className="text-xl font-black text-gray-900 italic tracking-tighter">{formatTime(Number(profile.tempo_leitura_total))}</p>
           </div>
        </div>
        <div className="glass-panel p-6 rounded-[2.5rem] shadow-sm border-white/50 flex flex-col gap-3 transition-soft hover:shadow-lg">
           <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shadow-sm"><Users size={20} /></div>
           <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Célula</p>
              <p className="text-sm font-black text-gray-900 truncate italic tracking-tighter">{meuGrupo?.nome || "Sem Célula"}</p>
           </div>
        </div>
      </div>

      {/* Seção de Favoritos (Ocultar para Master) */}
      {profile.role !== 'master' && favorites.length > 0 && (
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center gap-3">
             <Star className="text-amber-500" size={18} fill="currentColor" />
             <h3 className="text-sm font-black text-gray-900 uppercase italic tracking-widest">Versículos Favoritos</h3>
          </div>
          <div className="flex flex-col gap-4">
             {favorites.map(fav => (
               <div key={fav.id} className="glass-panel p-6 rounded-[2rem] border-white/30 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-[#1B3B6B]/5 px-4 py-2 rounded-bl-2xl">
                     <p className="text-[10px] font-black text-[#1B3B6B] uppercase italic tracking-tighter">
                        {fav.livro} {fav.capitulo}:{fav.versiculo}
                     </p>
                  </div>
                  <p className="text-gray-700 leading-relaxed mt-4 line-clamp-4 group-hover:line-clamp-none transition-all duration-300">"{fav.texto}"</p>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* Meus Relatórios (Líder / Master) - Agrupados por Semana */}
      {(profile.role === 'master' || profile.role === 'lider') && meusRelatorios.length > 0 && (
        <div className="flex flex-col gap-8 mb-10">
           <div className="flex items-center gap-3">
              <FileText className="text-[#1B3B6B]" size={18} />
              <h3 className="text-sm font-black text-gray-900 uppercase italic tracking-widest">Histórico de Relatórios</h3>
           </div>
           
           <div className="space-y-12">
              {(() => {
                // Agrupar por Mês
                const groupedByMonth: Record<string, any[]> = {};
                meusRelatorios.forEach(rel => {
                  const date = new Date(rel.data);
                  const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  if (!groupedByMonth[monthName]) groupedByMonth[monthName] = [];
                  groupedByMonth[monthName].push(rel);
                });

                return Object.entries(groupedByMonth).map(([month, reports]) => (
                  <div key={month} className="space-y-4">
                    <h4 className="text-[10px] font-black text-[#1B3B6B] uppercase tracking-[0.3em] ml-4 bg-[#1B3B6B]/5 py-2 px-4 rounded-full w-fit italic">{month}</h4>
                    
                    <div className="grid gap-3">
                      {reports.map((rel, idx) => {
                        const d = new Date(rel.data);
                        const weekNum = Math.ceil(d.getDate() / 7);
                        return (
                          <div key={rel.id} className="glass-panel p-5 rounded-[2rem] flex items-center justify-between border-white/50 relative overflow-hidden">
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1B3B6B]/10" />
                             <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rel.tipo === 'culto' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                   <p className="text-[10px] font-black italic">W{weekNum}</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none truncate">Semana {weekNum} • {rel.tipo}</p>
                                  <p className="font-bold text-gray-900 text-sm mt-1">{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Presença</p>
                                <p className="text-lg font-black text-[#1B3B6B] italic tabular-nums">{rel.presentes}</p>
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

      {isOwnProfile && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col mb-10">
          {(currentUser.role === 'master' || currentUser.role === 'lider') && (
            <Link to="/celulas" className="p-6 flex items-center justify-between hover:bg-gray-50 border-b border-gray-50">
               <div className="flex items-center gap-4">
                  <Users className="text-[#1B3B6B]" size={20} />
                  <span className="font-bold text-gray-900 text-sm">Gerenciar Minha Célula</span>
               </div>
               <ChevronRight className="text-gray-200" size={16} />
            </Link>
          )}
          {currentUser.role === 'master' && (
            <button onClick={() => { setShowReportCenter(true); fetchAllReports(); }} className="p-6 flex items-center justify-between hover:bg-gray-50 border-b border-gray-50">
               <div className="flex items-center gap-4">
                  <FileText className="text-[#1B3B6B]" size={20} />
                  <span className="font-bold text-gray-900 text-sm">Central de Relatórios Master</span>
               </div>
               <ChevronRight className="text-gray-200" size={16} />
            </button>
          )}
          <button onClick={logout} className="p-6 flex items-center justify-between hover:bg-red-50 active:bg-red-100 transition-colors">
            <div className="flex items-center gap-4">
                <LogOut className="text-red-500" size={20} />
                <span className="font-bold text-red-600 text-sm">Sair da Conta</span>
            </div>
          </button>
        </div>
      )}

      {/* Modal Central de Relatórios Master */}
      <AnimatePresence>
        {showReportCenter && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-end">
             <div className="bg-white w-full h-[90vh] rounded-t-[4rem] p-8 overflow-y-auto pb-32 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                   <div>
                      <h2 className="text-2xl font-black text-gray-900 uppercase italic">Central Master</h2>
                      <p className="text-[10px] font-black uppercase text-[#1B3B6B] tracking-[0.2em]">{allRelatorios.length} Envios Totais</p>
                   </div>
                   <button onClick={() => setShowReportCenter(false)} className="glass-panel p-3 rounded-full"><X size={20} /></button>
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
                          <h4 className="text-[10px] font-black text-[#1B3B6B] uppercase tracking-[0.3em] ml-4 bg-[#1B3B6B]/5 py-2 px-6 rounded-full w-fit italic">{month}</h4>
                          <div className="grid gap-4">
                            {reports.map(rel => {
                              const d = new Date(rel.data);
                              const weekNum = Math.ceil(d.getDate() / 7);
                              return (
                                <div key={rel.id} className="glass-panel p-6 rounded-[2.5rem] border-white/50 relative overflow-hidden flex flex-col gap-4">
                                   <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1B3B6B]" />
                                   
                                   <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-[#1B3B6B] font-black italic text-[10px]">W{weekNum}</div>
                                         <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Semana {weekNum} • {rel.tipo}</p>
                                            <p className="font-bold text-gray-900 text-sm mt-1">{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                                         </div>
                                      </div>
                                      <div className="bg-[#1B3B6B] text-white px-4 py-2 rounded-2xl shadow-lg">
                                         <p className="text-[9px] font-black uppercase opacity-60 leading-none">Presença</p>
                                         <p className="text-sm font-black italic mt-0.5">{rel.presentes}</p>
                                      </div>
                                   </div>

                                   <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-dashed border-gray-100">
                                      <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm bg-white p-0.5">
                                         {rel.kefel_profiles?.avatar_url ? <img src={rel.kefel_profiles.avatar_url} className="w-full h-full object-cover rounded-lg" /> : <User className="w-full h-full p-2 text-gray-200" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                         <p className="text-[12px] font-black text-gray-900 uppercase italic leading-none truncate">{rel.kefel_celulas?.nome || "Culto / Cel. Avulsa"}</p>
                                         <p className="text-[9px] text-[#1B3B6B] font-black uppercase tracking-widest mt-1.5 opacity-60">Líder: {rel.kefel_profiles?.nome || "Desconhecido"}</p>
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
           <div className="bg-white w-full rounded-t-[3.5rem] p-10 space-y-8 shadow-2xl">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-black text-gray-900 uppercase italic">Configurações</h2>
                 <button onClick={() => setShowSettings(false)} className="glass-panel p-2 rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Editar Nome</p>
                    <input 
                      value={newName} 
                      onChange={e => setNewName(e.target.value)}
                      className="w-full bg-gray-50 p-5 rounded-2xl font-bold outline-none" 
                    />
                 </div>

                 <div className="flex items-center justify-between p-2">
                    <div>
                       <p className="font-black text-gray-900 uppercase italic text-sm">Notificações Push</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Ativar lembretes e alertas</p>
                    </div>
                    <button 
                      onClick={() => togglePush(!pushEnabled)}
                      className={`w-14 h-8 rounded-full transition-colors relative ${pushEnabled ? 'bg-[#1B3B6B]' : 'bg-gray-200'}`}
                    >
                       <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${pushEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                 </div>

                 <button onClick={handleUpdateName} className="w-full bg-[#1B3B6B] text-white py-5 rounded-[2rem] font-black uppercase italic tracking-widest shadow-lg active:scale-95 transition-soft">
                    Salvar Alterações
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
