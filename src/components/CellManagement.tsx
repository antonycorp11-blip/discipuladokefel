import React, { useState, useEffect } from "react";
import { 
  Users, Plus, X, 
  Loader2, Trash2, Shield, User,
  Camera, CheckCircle, Clock, ChevronRight, Home
} from "lucide-react";
import { supabase, type KefelCelula } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

export function CellManagement() {
  const { user, deleteProfile, promoteToLeader, showToast } = useAuth();
  const [celulas, setCelulas] = useState<KefelCelula[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [expandedCellId, setExpandedCellId] = useState<string | null>(null);

  // Form states
  const [nome, setNome] = useState("");
  const [diaSemana, setDiaSemana] = useState("Terça-feira");
  const [liderId, setLiderId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File|null>(null);
  const [imagePreview, setImagePreview] = useState<string|null>(null);

  // Relatorios State (Dashboard Master)
  const [dataAlvo, setDataAlvo] = useState(new Date().toISOString().split('T')[0]);
  const [relatoriosData, setRelatoriosData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [celRes, userRes, profileRes] = await Promise.all([
        supabase.from("kefel_celulas").select("*, lider:lider_id(id, nome, avatar_url)").order("nome", { ascending: true }),
        supabase.from("kefel_profiles").select("id, nome").order("nome", { ascending: true }),
        supabase.from("kefel_profiles").select("id, nome, avatar_url, celula_id, role").order("nome", { ascending: true })
      ]);
      
      if (celRes.error) throw celRes.error;
      setCelulas((celRes.data || []) as KefelCelula[]);

      if (userRes.error) throw userRes.error;
      setUsuarios(userRes.data || []);

      if (profileRes.error) throw profileRes.error;
      setMembers(profileRes.data || []);
    } catch (err: any) {
      console.error("Falha na requisição:", err);
      showToast("Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.from("kefel_relatorios")
      .select("*")
      .eq("data", dataAlvo)
      .then(({data}) => setRelatoriosData(data || []));
  }, [dataAlvo]);

  async function handleAddCell(e: React.FormEvent) {
    e.preventDefault();
    if (!user || (user.role !== "master" && user.role !== "lider")) return;
    setSaving(true);

    try {
      let imageUrl = "";
      if (imageFile) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `cell_${Date.now()}.${fileExt}`;
          const { data: upData, error: upErr } = await supabase.storage.from("kefel-eventos").upload(fileName, imageFile);
          if (upErr) throw upErr;
          
          if (upData) {
              const { data: urlData } = supabase.storage.from("kefel-eventos").getPublicUrl(upData.path);
              imageUrl = urlData.publicUrl;
          }
      }

      const { error } = await supabase.from("kefel_celulas").insert({
        nome,
        dia_semana: diaSemana,
        lider_id: liderId || null,
        imagem_url: imageUrl,
        criado_por: user.id
      });

      if (error) throw error;

      setShowAddForm(false);
      resetForm();
      fetchData();
      showToast("Célula criada com sucesso!");
    } catch (err: any) {
      console.error("Erro ao criar célula:", err);
      showToast("Falha ao criar célula", "error");
    } finally {
      setSaving(false);
    }
  }

  const resetForm = () => {
    setNome(""); setLiderId(null); setImageFile(null); setImagePreview(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir esta célula?")) return;
    const { error } = await supabase.from("kefel_celulas").delete().eq("id", id);
    if (!error) fetchData();
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm("Deseja excluir este membro permanentemente?")) return;
    const { success } = await deleteProfile(id);
    if (success) {
      showToast("Membro removido");
      fetchData();
    }
    else showToast("Erro ao excluir membro", "error");
  };

  const handlePromote = async (memberId: string, cellId: string) => {
    if (!window.confirm("Deseja promover este membro a líder desta célula?")) return;
    const { success } = await promoteToLeader(memberId, cellId);
    if (success) {
      showToast("Membro promovido a líder!");
      fetchData();
    } else {
      showToast("Erro ao promover membro", "error");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  if (user?.role !== "master" && user?.role !== "lider") return null;

  return (
    <div className="flex flex-col h-screen bg-transparent pt-14 pb-24 px-6 overflow-y-auto">
      <header className="flex justify-between items-center pt-4">
        <div>
           <h1 className="text-2xl font-black text-gray-900 italic uppercase">Visão Geral</h1>
           <div className="h-1.5 w-12 bg-[#1B3B6B] rounded-full mt-1"></div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{celulas.length} Células Ativas</p>
        </div>
        {(user?.role === 'master' || user?.role === 'lider') && (
          <button onClick={() => setShowAddForm(true)} className="bg-black text-white p-3.5 rounded-2xl shadow-premium shadow-black/10 active:scale-95 transition-soft">
            <Plus size={20} />
          </button>
        )}
      </header>

      {user?.role === 'master' && (
        <div className="mt-6 mb-8 space-y-4">
          <div className="bg-white rounded-[2rem] p-4 border border-gray-100 shadow-sm flex flex-col relative z-20">
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60 text-gray-500 ml-2">Filtrar Relatórios por Data</p>
            <input 
              type="date" 
              value={dataAlvo} 
              onChange={e => setDataAlvo(e.target.value)}
              className="w-full bg-gray-50 p-4 rounded-2xl font-black italic text-gray-900 uppercase text-xs outline-none border border-transparent focus:border-[#1B3B6B]/20 transition-soft" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-[#1B3B6B] rounded-[2rem] p-5 shadow-lg shadow-[#1B3B6B]/20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 relative z-10">Total Célula</p>
                <div className="flex items-center gap-2 relative z-10">
                   <Home size={18} className="opacity-80"/>
                   <span className="text-3xl font-black">{relatoriosData.filter(r => r.tipo === 'celula').reduce((acc, r) => acc + (r.presentes || 0), 0)}</span>
                </div>
             </div>
             <div className="bg-indigo-600 rounded-[2rem] p-5 shadow-lg shadow-indigo-600/20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 relative z-10">Total Culto</p>
                <div className="flex items-center gap-2 relative z-10">
                   <Users size={18} className="opacity-80"/>
                   <span className="text-3xl font-black">{relatoriosData.filter(r => r.tipo === 'culto').reduce((acc, r) => acc + (r.presentes || 0), 0)}</span>
                </div>
             </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-[#1B3B6B]" /></div>
      ) : (
        <div className="grid gap-6 pb-10">
          {celulas.map(c => {
            const cellMembers = members.filter(m => m.celula_id === c.id);
            const isExpanded = expandedCellId === c.id;

            return (
              <div key={c.id} className={`glass-panel p-6 rounded-[2.5rem] shadow-sm flex flex-col gap-5 border-white/50 transition-soft group ${isExpanded ? 'ring-2 ring-[#1B3B6B]/20 bg-white/80' : ''}`}>
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedCellId(isExpanded ? null : c.id)}>
                   <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-white rounded-[1.8rem] overflow-hidden shadow-sm flex-shrink-0 flex items-center justify-center text-indigo-100 border border-gray-50 p-1 group-hover:scale-110 transition-soft">
                         {c.imagem_url ? <img src={c.imagem_url} className="w-full h-full object-cover rounded-2xl" /> : <Users size={28} />}
                                        <div>
                         <h3 className="font-black text-gray-900 uppercase italic text-base leading-tight">{c.nome}</h3>
                         <div className="flex items-center gap-4 mt-1.5">
                            <div className="flex items-center gap-1">
                               <Users size={10} className="text-[#1B3B6B]" />
                               <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest">{cellMembers.length} {cellMembers.length === 1 ? 'membro' : 'membros'}</p>
                            </div>
                            <div className="flex items-center gap-1">
                               <Clock size={10} className="text-rose-500" />
                               <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest">{c.dia_semana}</p>
                            </div>
                         </div>
                      </div>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                     <div className="flex gap-2">
                       {(() => {
                         const relCel = relatoriosData.find(r => r.lider_id === c.lider_id && r.tipo === 'celula');
                         const relCul = relatoriosData.find(r => r.lider_id === c.lider_id && r.tipo === 'culto');
                         if (user?.role !== 'master') return null;
                         
                         return (
                           <div className="flex flex-col gap-1 items-end mr-2">
                             <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${relCel ? 'bg-green-100 text-green-700' : 'bg-rose-50 text-rose-500'}`}>
                               <Home size={8}/> {relCel ? `${relCel.presentes} P` : 'Pendente'}
                             </div>
                             <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${relCul ? 'bg-green-100 text-green-700' : 'bg-rose-50 text-rose-500'}`}>
                               <Users size={8}/> {relCul ? `${relCul.presentes} P` : 'Pendente'}
                             </div>
                           </div>
                         );
                       })()}
                     </div>
                     <div className="flex items-center gap-3">
                       {user?.role === 'master' && (
                         <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="bg-rose-50 text-rose-500 p-2 rounded-xl active:scale-90 transition-soft hover:bg-rose-100"><Trash2 size={16} /></button>
                       )}
                       <div className={`p-2 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-[#1B3B6B]' : 'text-gray-300'}`}>
                          <ChevronRight size={20} />
                       </div>
                     </div>
                   </div>      </div>
                </div>

                <AnimatePresence>
                   {isExpanded && (
                     <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4 pt-2"
                     >
                        <div className="h-px bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
                        <div className="grid grid-cols-1 gap-3">
                           {cellMembers.length === 0 ? (
                             <p className="text-center py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Nenhum membro cadastrado</p>
                           ) : (
                             cellMembers.map(m => (
                               <div key={m.id} className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl border border-white/80">
                                  <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                                     {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-gray-200" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <p className="text-xs font-black text-gray-800 uppercase italic truncate">{m.nome}</p>
                                     <p className="text-[9px] font-black text-[#1B3B6B]/40 uppercase tracking-widest">
                                       {m.role === 'lider' ? 'Líder de Célula' : m.role === 'master' ? 'Discipulador' : 'Membro Ativo'}
                                     </p>
                                  </div>
                                  {user?.role === 'master' && (
                                    <div className="flex items-center gap-2">
                                      {m.role === 'membro' && (
                                        <button 
                                          onClick={() => handlePromote(m.id, c.id)}
                                          title="Promover a Líder"
                                          className="p-2.5 bg-indigo-50 text-[#1B3B6B] rounded-xl active:scale-90 transition-soft hover:bg-indigo-100"
                                        >
                                          <Shield size={14} />
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => handleDeleteMember(m.id)}
                                        title="Excluir Membro"
                                        className="p-2.5 bg-rose-50 text-rose-500 rounded-xl active:scale-90 transition-soft hover:bg-rose-100"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                               </div>
                             ))
                           )}
                        </div>
                     </motion.div>
                   )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar Células */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end">
            <motion.div 
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               exit={{ y: "100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="bg-white w-full h-[85vh] rounded-t-[3.5rem] p-8 flex flex-col shadow-2xl pb-32"
            >
               <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 italic uppercase">Nova Célula</h2>
                    <div className="h-1.5 w-12 bg-[#1B3B6B] rounded-full mt-1"></div>
                  </div>
                  <button onClick={() => setShowAddForm(false)} className="glass-panel p-3 rounded-full"><X size={20} /></button>
               </div>

               <form onSubmit={handleAddCell} className="space-y-8 flex-1 overflow-y-auto pr-2">
                  <div className="space-y-3">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Identidade Visual</p>
                     <div className="relative h-40 w-40 mx-auto rounded-[3rem] bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center transition-soft hover:border-indigo-300 group">
                        {imagePreview ? (
                          <>
                            <img src={imagePreview} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-soft flex items-center justify-center text-white"><X size={24}/></button>
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center">
                             <div className="p-4 bg-white rounded-2xl shadow-sm text-indigo-100 mb-2 group-hover:scale-110 transition-soft">
                                <Camera size={32} />
                             </div>
                             <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                          </label>
                        )}
                     </div>
                  </div>

                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Como se chama?</p>
                     <input required placeholder="EX: CÉLULA FILIPENSES" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[2rem] font-black italic uppercase text-xs outline-none focus:bg-[#1B3B6B]/5 border border-transparent focus:border-indigo-100 transition-soft" />
                  </div>

                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Dia do Encontro</p>
                     <select value={diaSemana} onChange={e => setDiaSemana(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[2rem] font-black italic uppercase text-xs outline-none h-[74px] focus:bg-[#1B3B6B]/5 border border-transparent focus:border-indigo-100 transition-soft appearance-none">
                        {["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"].map(d => (
                           <option key={d} value={d}>{d}</option>
                        ))}
                     </select>
                  </div>

                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Quem é o Líder?</p>
                     <select value={liderId || ""} onChange={e => setLiderId(e.target.value || null)} className="w-full bg-gray-50 p-6 rounded-[2rem] font-black italic uppercase text-xs outline-none h-[74px] focus:bg-[#1B3B6B]/5 border border-transparent focus:border-indigo-100 transition-soft appearance-none">
                        <option value="">SELECIONE UM LÍDER...</option>
                        {usuarios.map(u => (
                           <option key={u.id} value={u.id}>{u.nome}</option>
                        ))}
                     </select>
                  </div>

                  <button disabled={saving} type="submit" className="w-full bg-[#1B3B6B] text-white py-7 rounded-[2.5rem] font-black shadow-premium shadow-indigo-600/20 uppercase italic tracking-widest active:scale-95 transition-soft disabled:opacity-50">
                     {saving ? <Loader2 className="animate-spin mx-auto" /> : "Consagrar Nova Célula"}
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
