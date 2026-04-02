import React, { useState, useEffect } from "react";
import { 
  Plus, Calendar, MapPin, Clock, 
  X, Camera, Loader2, Image as ImageIcon, Trash2, Tag, QrCode, AlertCircle, Users, User, ChevronRight, ArrowRight, CheckCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  data_hora: string;
  preco: number;
  endereco: string;
  imagem_url: string;
  tipo: "gratuito" | "pago" | "cota";
  banner_pos_y?: number;
  pix_key?: string;
  cota_desc?: string;
  criado_por: string;
  kefel_eventos_inscritos?: any[];
}

export default function Events() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showInscriptions, setShowInscriptions] = useState<string | null>(null);
  const [inscribedUsers, setInscribedUsers] = useState<any[]>([]);
  const [loadingInsc, setLoadingInsc] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [endereco, setEndereco] = useState("");
  const [preco, setPreco] = useState(0);
  const [tipo, setTipo] = useState<"gratuito" | "pago" | "cota">("gratuito");
  const [pixKey, setPixKey] = useState("");
  const [cotaDesc, setCotaDesc] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [bannerPosY, setBannerPosY] = useState(50);
  const [editId, setEditId] = useState<string | null>(null);

  const [celulasRepo, setCelulasRepo] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchCellsRepo();
  }, []);

  async function fetchCellsRepo() {
     const { data } = await supabase.from("kefel_celulas").select("id, nome");
     setCelulasRepo(data || []);
  }

  async function fetchEvents() {
    setLoading(true);
    const { data: eventsData, error } = await supabase.from("kefel_eventos").select("*, kefel_eventos_inscritos(id)").order("data_hora", { ascending: true });
    if (!error) setEventos((eventsData || []) as Evento[]);
    setLoading(false);
  }

  async function fetchInscriptions(eventId: string) {
    setLoadingInsc(true);
    try {
       const { data, error } = await supabase
         .from("kefel_eventos_inscritos")
         .select(`
            id,
            confirmado_em,
            user_id,
            kefel_profiles (
               id,
               nome,
               avatar_url,
               celula_id
            )
         `)
         .eq("evento_id", eventId);
       
       if (error) throw error;
       setInscribedUsers(data || []);
    } catch (err) {
       console.error("Erro fetch inscritos:", err);
    } finally {
       setLoadingInsc(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este evento?")) return;
    const { error } = await supabase.from("kefel_eventos").delete().eq("id", id);
    if (!error) fetchEvents();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data: upData, error: upErr } = await supabase.storage.from("kefel-eventos").upload(fileName, imageFile);
        if (upErr) throw upErr;
        
        const { data: urlData } = supabase.storage.from("kefel-eventos").getPublicUrl(upData.path);
        finalImageUrl = urlData.publicUrl;
      }

      const eventData = {
        titulo,
        descricao,
        data_hora: new Date(`${data}T${hora}`).toISOString(),
        endereco,
        preco: tipo === 'pago' ? preco : 0,
        tipo,
        pix_key: tipo === 'pago' ? pixKey : null,
        cota_desc: tipo === 'cota' ? cotaDesc : null,
        imagem_url: finalImageUrl,
        banner_pos_y: bannerPosY,
        criado_por: user.id
      };

      if (editId) {
        const { error } = await supabase.from("kefel_eventos").update(eventData).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("kefel_eventos").insert(eventData);
        if (error) throw error;
      }

      setShowForm(false);
      fetchEvents();
      resetForm();
    } catch (err: any) {
      alert("Erro ao salvar evento: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const handleEdit = (event: Evento) => {
    const d = new Date(event.data_hora);
    setEditId(event.id);
    setTitulo(event.titulo);
    setDescricao(event.descricao);
    setData(d.toISOString().split('T')[0]);
    setHora(d.toTimeString().split(' ')[0].substring(0, 5));
    setEndereco(event.endereco);
    setPreco(event.preco);
    setTipo(event.tipo);
    setPixKey(event.pix_key || "");
    setCotaDesc(event.cota_desc || "");
    setImageUrl(event.imagem_url);
    setBannerPosY(event.banner_pos_y || 50);
    setShowForm(true);
  };

  const resetForm = () => {
    setTitulo(""); setDescricao(""); setData(""); setHora(""); 
    setEndereco(""); setPreco(0); setTipo("gratuito"); setPixKey(""); setCotaDesc("");
    setImageFile(null); setImagePreview(null); setImageUrl(""); setBannerPosY(50); setEditId(null);
  };

  return (
    <div className="flex flex-col h-screen bg-transparent pt-14 pb-24 px-6 overflow-y-auto">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
           <h1 className="text-2xl font-black text-gray-900 italic uppercase">Agenda</h1>
           <div className="h-1.5 w-12 bg-[#1B3B6B] rounded-full mt-1"></div>
        </div>
        {(user?.role === 'master' || user?.role === 'lider') && (
          <button onClick={() => setShowForm(true)} className="bg-black text-white p-3.5 rounded-2xl shadow-premium shadow-black/10 active:scale-95 transition-soft">
            <Plus size={20} />
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-[#1B3B6B]" /></div>
      ) : (
        <div className="grid gap-6 pb-10">
          {eventos.map(event => {
            const date = new Date(event.data_hora);
            return (
              <div key={event.id} className="glass-panel p-6 rounded-[2.5rem] shadow-sm flex flex-col gap-5 transition-soft group border-white/50 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#1B3B6B]/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                 
                 <div className="relative h-48 w-full rounded-[2rem] overflow-hidden shadow-inner bg-gray-50 border border-black/5">
                    {event.imagem_url ? (
                      <img 
                        src={event.imagem_url} 
                        className="w-full h-full object-cover transition-soft group-hover:scale-105" 
                        style={{ objectPosition: `center ${event.banner_pos_y || 50}%` }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-white text-[#1B3B6B]/20">
                         <ImageIcon size={48} />
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4 flex gap-2 z-20">
                        {(user?.role === 'master' || user?.role === 'lider' || user?.id === event.criado_por) && (
                          <button onClick={() => { setShowInscriptions(event.id); fetchInscriptions(event.id); }} className="bg-[#1B3B6B] p-3 rounded-2xl text-white shadow-xl active:scale-90 transition-soft flex items-center gap-2">
                            <Users size={18} />
                            <span className="text-[10px] font-black uppercase">{event.kefel_eventos_inscritos?.length || 0}</span>
                          </button>
                        )}
                        {(user?.role === 'master' || user?.id === event.criado_por) && (
                          <>
                            <button onClick={() => handleEdit(event)} className="bg-white/90 backdrop-blur p-3 rounded-2xl text-amber-500 shadow-xl active:scale-90 transition-soft">
                               <ImageIcon size={18} />
                            </button>
                            <button onClick={() => handleDelete(event.id)} className="bg-white/90 backdrop-blur p-3 rounded-2xl text-rose-500 shadow-xl active:scale-90 transition-soft">
                               <Trash2 size={18} />
                            </button>
                          </>
                        )}
                    </div>

                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex flex-col items-center min-w-[60px] border border-white/10 z-20">
                       <span className="text-[10px] font-black uppercase text-[#1B3B6B]">{date.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                       <span className="text-xl font-black text-white tracking-tighter leading-none mt-0.5">{date.getDate()}</span>
                    </div>
                 </div>

                  <div className="px-1 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                       <h3 className="text-xl font-black text-gray-900 italic uppercase tracking-tighter leading-tight flex-1">{event.titulo}</h3>
                       <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${event.tipo === 'pago' ? 'bg-[#1B3B6B]/5 text-[#1B3B6B]' : 'bg-green-50 text-green-600'}`}>
                          {event.tipo}
                       </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 opacity-60">
                       <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-[#1B3B6B]" />
                          <span className="text-[10px] font-black uppercase">{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                       <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin size={12} className="text-rose-500" />
                          <span className="text-[10px] font-black uppercase truncate">{event.endereco}</span>
                       </div>
                    </div>

                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed italic">"{event.descricao}"</p>

                    {/* Status de Inscrição e Botão para Usuário */}
                    {(() => {
                        const isInscribed = event.kefel_eventos_inscritos?.some((i: any) => i.id === user?.id || (i.user_id && i.user_id === user?.id));
                        
                        if (isInscribed) {
                          return (
                            <div className="w-full bg-green-50 text-green-600 py-4 rounded-2xl flex items-center justify-center gap-2 border border-green-100 mb-2">
                               <CheckCircle size={18} />
                               <span className="text-[10px] font-black uppercase tracking-widest">Sua Presença Confirmada!</span>
                            </div>
                          );
                        }

                        return (
                          <button 
                            onClick={async () => {
                               if (!user) return alert("Faça login para se inscrever!");
                               const { error } = await supabase.from("kefel_eventos_inscritos").insert({ evento_id: event.id, user_id: user.id });
                               if (!error) {
                                  alert("Inscrição confirmada! 🚀");
                                  fetchEvents();
                               } else {
                                  alert("Erro ao se inscrever: " + error.message);
                               }
                            }}
                            className="w-full bg-black text-white py-5 rounded-[2rem] flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-soft mb-2 group"
                          >
                             <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-[#1B3B6B] transition-soft">
                                <Plus size={16} />
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest italic">Quero Participar</span>
                          </button>
                        );
                    })()}

                    {/* Botão de Gestão Master/Líder - Mais visível */}
                    {(user?.role === 'master' || user?.role === 'lider') && (
                      <button 
                        onClick={() => { setShowInscriptions(event.id); fetchInscriptions(event.id); }} 
                        className="w-full mt-2 bg-gray-50 border border-dashed border-[#1B3B6B]/20 py-4 rounded-2xl flex items-center justify-center gap-3 text-[#1B3B6B] hover:bg-[#1B3B6B]/5 transition-soft active:scale-95"
                      >
                         <Users size={18} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Relatório: {event.kefel_eventos_inscritos?.length || 0} Inscritos</span>
                      </button>
                    )}
                 </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Relatório de Inscrições */}
      <AnimatePresence>
        {showInscriptions && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-end">
            <motion.div 
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               exit={{ y: "100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="bg-white w-full h-[85vh] rounded-t-[4.5rem] p-8 flex flex-col shadow-2xl"
            >
               <div className="flex justify-between items-center mb-8 px-2">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 italic uppercase">Inscritos</h2>
                    <p className="text-[10px] font-black uppercase text-[#1B3B6B] tracking-widest">{inscribedUsers.length} Participantes Confirmados</p>
                  </div>
                  <button onClick={() => setShowInscriptions(null)} className="glass-panel p-3 rounded-full"><X size={20} /></button>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-8 pb-32 pr-2">
                  {loadingInsc ? (
                    <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-[#1B3B6B]" /></div>
                   ) : inscribedUsers.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                       <Users size={48} className="mx-auto text-gray-100" />
                       <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Ninguém inscrito ainda</p>
                    </div>
                  ) : (
                    // Agrupar por Célula (lidando com nulos e perfis ausentes)
                    Array.from(new Set(inscribedUsers.map(i => i.kefel_profiles?.celula_id || 'sem-celula'))).map(celId => {
                       const celName = celulasRepo.find(c => c.id === celId)?.nome || "Membros sem Célula / Visitantes";
                       const membersInCel = inscribedUsers.filter(i => (i.kefel_profiles?.celula_id || 'sem-celula') === celId);

                       if (membersInCel.length === 0) return null;

                       return (
                          <div key={String(celId)} className="space-y-4">
                             <div className="flex items-center justify-between bg-gray-50/80 px-6 py-4 rounded-[2rem] border border-gray-100 border-dashed">
                                <h4 className="text-[11px] font-black text-gray-900 uppercase italic tracking-tighter">{celName}</h4>
                                <span className="text-[10px] font-black text-[#1B3B6B] bg-white px-3 py-1 rounded-full shadow-sm">{membersInCel.length}</span>
                             </div>
                             
                             <div className="grid gap-3">
                                {membersInCel.map(insc => (
                                  <div key={insc.id} className="flex items-center gap-4 p-4 glass-panel rounded-[2rem] border-white/80 shadow-sm ml-2">
                                    <div className="w-12 h-12 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm p-0.5">
                                       {insc.kefel_profiles?.avatar_url ? <img src={insc.kefel_profiles.avatar_url} className="w-full h-full object-cover rounded-xl" /> : <User className="w-full h-full p-2 text-gray-200" />}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-black text-gray-800 uppercase italic text-xs leading-none">{insc.kefel_profiles?.nome || "Usuário"}</p>
                                      <p className="text-[9px] text-[#1B3B6B]/40 font-black uppercase tracking-widest mt-1.5">{new Date(insc.confirmado_em).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="bg-green-50 text-green-600 p-2 rounded-xl">
                                       <CheckCircle size={14} />
                                    </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                       );
                    })
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Criar/Editar Evento */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-end">
            <motion.div 
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               exit={{ y: "100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="bg-white w-full h-[92vh] rounded-t-[3.5rem] p-8 overflow-y-auto shadow-2xl pb-32"
            >
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h2 className="text-2xl font-black text-gray-900 italic uppercase">{editId ? "Editar Evento" : "Novo Evento"}</h2>
                    <div className="h-1.5 w-12 bg-[#1B3B6B] rounded-full mt-1"></div>
                 </div>
                 <button onClick={() => setShowForm(false)} className="glass-panel p-3 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">Banner Principal</p>
                  <div className="relative h-56 rounded-[3rem] bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center transition-soft hover:border-indigo-300 group">
                    {(imagePreview || imageUrl) ? (
                      <>
                        <img src={imagePreview || imageUrl} className="w-full h-full object-cover" style={{ objectPosition: `center ${bannerPosY}%` }} />
                        <button type="button" onClick={() => {setImageFile(null); setImagePreview(null); setImageUrl("");}} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-xl backdrop-blur-md z-10"><X size={16}/></button>
                      </>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center p-10 text-center">
                         <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#1B3B6B]/20 mb-4 group-hover:scale-110 transition-soft">
                            <Camera size={32} />
                         </div>
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Escolher Foto do Banner</span>
                         <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                      </label>
                    )}
                  </div>

                  {(imagePreview || imageUrl) && (
                    <div className="space-y-4 px-4">
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] font-black text-[#1B3B6B] uppercase tracking-widest italic">Ajustar enquadramento vertical</p>
                        <span className="text-[9px] font-black text-gray-400">{bannerPosY}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={bannerPosY} 
                        onChange={(e) => setBannerPosY(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">O que vai acontecer?</p>
                  <input required placeholder="TÍTULO DO EVENTO" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.8rem] font-black italic uppercase text-xs outline-none focus:bg-[#1B3B6B]/5 border border-transparent focus:border-indigo-100 transition-soft" />
                </div>

                <textarea placeholder="DESCRIÇÃO COMPLETA..." value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full bg-gray-50 p-7 rounded-[2rem] text-sm h-40 outline-none focus:bg-[#1B3B6B]/5 border border-transparent focus:border-indigo-100 transition-soft" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">Data</p>
                    <input required type="date" value={data} onChange={e => setData(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.8rem] font-bold text-xs outline-none" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">Horário</p>
                    <input required type="time" value={hora} onChange={e => setHora(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.8rem] font-bold text-xs outline-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">Localização</p>
                  <input required placeholder="ENDEREÇO OU LINK" value={endereco} onChange={e => setEndereco(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.8rem] font-black italic uppercase text-xs outline-none" />
                </div>
                
                <div className="bg-gray-50 p-6 rounded-[2.5rem] space-y-6">
                   <div className="flex gap-3">
                      {['gratuito', 'pago', 'cota'].map(t => (
                        <button key={t} type="button" onClick={() => setTipo(t as any)} className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase transition-soft ${tipo === t ? 'bg-black text-white shadow-xl shadow-black/20' : 'bg-white text-gray-300 hover:text-gray-500'}`}>{t}</button>
                      ))}
                   </div>
                   
                   <AnimatePresence mode="wait">
                    {tipo === 'pago' && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4">
                        <input type="number" placeholder="VALOR POR PESSOA R$" value={preco} onChange={e => setPreco(Number(e.target.value))} className="w-full bg-white p-6 rounded-2xl font-black italic text-sm outline-none" />
                        <input placeholder="CHAVE PIX PARA PAGAMENTO" value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full bg-white p-6 rounded-2xl font-black text-xs uppercase outline-none" />
                      </motion.div>
                    )}
                    {tipo === 'cota' && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-3">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest text-center px-4">Instruções sobre o que cada um deve levar</p>
                        <textarea placeholder="EX: HOMENS LEVAM REFRIGERANTE, MULHERES LEVAM SALGADO..." value={cotaDesc} onChange={e => setCotaDesc(e.target.value)} className="w-full bg-white p-6 rounded-2xl font-bold text-xs h-28 outline-none" />
                      </motion.div>
                    )}
                   </AnimatePresence>
                </div>

                <button disabled={saving} type="submit" className="w-full bg-[#1B3B6B] text-white py-7 rounded-[2rem] font-black shadow-premium shadow-indigo-600/20 uppercase italic tracking-widest active:scale-95 transition-soft disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin mx-auto" /> : (editId ? "Salvar Alterações" : "Publicar Evento na Agenda")}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
