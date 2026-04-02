import { BookOpen, Users, Calendar, Trophy, ArrowRight, Bell, Loader2, CheckCircle2, QrCode, AlertCircle, X, User, Share2, MapPin, Clock, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { supabase, type KefelEvento, type KefelCelula } from "@/lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { SocialFeed } from "./SocialFeed";

const VERSES = [
  { text: "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.", ref: "Salmos 119:105" },
  { text: "O que diz a palavra de Deus não volta vazia, mas cumpre o seu propósito.", ref: "Isaías 55:11" },
  { text: "Posso todas as coisas naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "O Senhor é o meu pastor, nada me faltará.", ref: "Salmos 23:1" },
];

const VERSE = VERSES[Math.floor(Math.random() * VERSES.length)];

export function Home() {
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [meuGrupo, setMeuGrupo] = useState<KefelCelula | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [inscribedIds, setInscribedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const now = new Date().toISOString();
    setLoading(true);
    const { data: eventsData } = await supabase.from("kefel_eventos").select("*").gte("data_hora", now).order("data_hora", { ascending: true }).limit(3);
    const { data: inscData } = await supabase.from("kefel_eventos_inscritos").select("evento_id").eq("user_id", user?.id);
    const { data: celData } = user?.celula_id ? await supabase.from("kefel_celulas").select("*").eq("id", user.celula_id).single() : { data: null };

    setUpcomingEvents((eventsData || []) as any[]);
    setInscribedIds(((inscData as any[]) || []).map((i: any) => i.evento_id));
    setMeuGrupo(celData as KefelCelula);
    setLoading(false);
  };

  const handleInscribe = async () => {
    if (!user || !selectedEvent || subscribing) return;
    setSubscribing(true);
    const { error } = await supabase.from("kefel_eventos_inscritos").insert({
      evento_id: selectedEvent.id,
      user_id: user.id
    });
    if (!error) {
      setInscribedIds(prev => [...prev, selectedEvent.id]);
      setSelectedEvent(null);
    } else {
      alert("Erro: " + error.message);
    }
    setSubscribing(false);
  };

  const shareVerse = () => {
    const msg = `Versículo do Dia:\n\n"${VERSE.text}"\n(${VERSE.ref})\n\nLido no Kefel App`;
    if (navigator.share) navigator.share({ text: msg });
    else { navigator.clipboard.writeText(msg); alert("Copiado!"); }
  };

  return (
    <div className="min-h-screen bg-transparent pt-14 pb-20 px-6 overflow-y-auto">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white p-1 rounded-2xl shadow-premium shadow-black/5 ring-1 ring-white/50 flex items-center justify-center overflow-hidden transition-soft hover:scale-105">
             {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover rounded-xl" /> : <User className="text-[#1B3B6B]" size={28} />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight italic uppercase tracking-tighter">Olá, {user?.nome?.split(' ')[0]}</h1>
            <div className="flex items-center gap-1.5 opacity-60">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Membro Ativo</p>
            </div>
          </div>
        </div>
        <button className="glass-panel p-3.5 rounded-2xl shadow-sm relative transition-soft active:scale-90">
          <Bell size={20} className="text-[#1B3B6B]" />
          <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm" />
        </button>
      </header>

      {/* Card da Palavra - Ultra Premium */}
      <div className="relative group mb-10">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-rose-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition-soft" />
        <div className="relative bg-black rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden min-h-[220px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#1B3B6B]/50/20 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/10 rounded-full -ml-20 -mb-20 blur-3xl" />
          
          <div className="relative z-10 flex justify-between items-start">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <BookOpen size={24} className="text-[#1B3B6B]" />
            </div>
            <button onClick={shareVerse} className="bg-white/10 p-3 rounded-2xl backdrop-blur-md hover:bg-white/20 transition-soft active:scale-90">
               <Share2 size={18} />
            </button>
          </div>

          <div className="relative z-10 space-y-4">
            <p className="text-2xl font-black leading-tight italic tracking-tight">"{VERSE.text}"</p>
            <div className="flex items-center gap-3">
              <div className="h-0.5 w-8 bg-[#1B3B6B]/50" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1B3B6B]">{VERSE.ref}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Atalhos para Líderes (Novo) - Corrigido para mostrar só para Líderes/Master */}
      {(user?.role === 'lider' || user?.role === 'master' || user?.email === 'aquilles@kefel.com') && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-6 px-2">
             <div className="w-2 h-6 bg-[#1B3B6B] rounded-full" />
             <h2 className="text-xl font-black text-gray-900 italic uppercase tracking-tighter">Gestão</h2>
          </div>
          <Link to="/relatorios" className="bg-white p-6 rounded-[2.8rem] shadow-sm border-2 border-dashed border-[#1B3B6B]/20 flex items-center justify-between group active:scale-95 transition-soft hover:border-[#1B3B6B]/50 hover:bg-[#1B3B6B]/5">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-[#1B3B6B] text-white rounded-2xl flex items-center justify-center shadow-premium shadow-[#1B3B6B]/20 group-hover:rotate-6 transition-soft">
                   <FileText size={24} />
                </div>
                <div>
                   <h3 className="font-black text-gray-900 uppercase italic text-base leading-tight">Enviar Relatório</h3>
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Célula ou Culto</p>
                </div>
             </div>
             <ArrowRight size={20} className="text-[#1B3B6B] group-hover:translate-x-2 transition-soft" />
          </Link>
        </section>
      )}

      {/* Rede Social */}
      <SocialFeed />

      {/* Eventos */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
             <div className="w-2 h-6 bg-[#1B3B6B] rounded-full" />
             <h2 className="text-xl font-black text-gray-900 italic uppercase tracking-tighter">Agenda</h2>
          </div>
          <Link to="/eventos" className="text-[#1B3B6B] text-[10px] font-black uppercase tracking-widest bg-[#1B3B6B]/5 px-4 py-2 rounded-full active:scale-90 transition-soft">Ver tudo</Link>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#1B3B6B]" /></div>
        ) : (
          <div className="space-y-6">
            {upcomingEvents.map(event => {
              const date = new Date(event.data_hora);
              const isInscribed = inscribedIds.includes(event.id);
              return (
                <div key={event.id} className="glass-panel p-5 rounded-[2.5rem] shadow-sm flex gap-5 items-center transition-soft hover:shadow-xl hover:shadow-[#1B3B6B]/5 group border-white/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#1B3B6B]/5 rounded-full -mr-12 -mt-12 blur-2xl opacity-0 group-hover:opacity-100 transition-soft" />
                  
                  <div className="w-16 h-16 bg-white rounded-[1.8rem] shadow-sm flex flex-col items-center justify-center overflow-hidden relative border border-gray-100 flex-shrink-0 transition-soft group-hover:scale-105 p-0.5">
                    {event.imagem_url ? (
                      <img src={event.imagem_url} className="absolute inset-0 w-full h-full object-cover rounded-[1.7rem]" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase text-[#1B3B6B]">{date.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                        <span className="text-2xl font-black text-gray-900 tracking-tighter leading-none mt-0.5">{date.getDate()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                       <span className="text-[9px] font-black uppercase text-[#1B3B6B] bg-[#1B3B6B]/5 px-2.5 py-1 rounded-full border border-[#1B3B6B]/10 tracking-widest leading-none">
                          {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                       </span>
                    </div>
                    <h4 className="font-black text-gray-900 truncate uppercase text-sm tracking-tight italic leading-tight">{event.titulo}</h4>
                    <div className="flex items-center gap-2 opacity-40 mt-1">
                      <MapPin size={10} className="text-rose-500" />
                      <p className="text-[9px] truncate uppercase font-black tracking-widest">{event.endereco}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedEvent(event)} 
                    className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-soft active:scale-90 border-2 ${isInscribed ? 'bg-green-50 border-green-200 text-green-600 shadow-inner' : 'bg-black border-black text-white shadow-premium shadow-black/10 hover:bg-white hover:text-black'}`}
                  >
                    {isInscribed ? <CheckCircle2 size={20} /> : <ArrowRight size={20} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Célula */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-6 px-2">
           <div className="w-2 h-6 bg-rose-500 rounded-full" />
           <h2 className="text-xl font-black text-gray-900 italic uppercase tracking-tighter">Minha Célula</h2>
        </div>
        
        {meuGrupo ? (
          <div className="glass-panel p-6 rounded-[3rem] shadow-sm border-white/50 flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#1B3B6B]/50/5 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-rose-500 rounded-[1.8rem] flex items-center justify-center text-white shadow-lg transition-soft group-hover:scale-110 group-hover:rotate-3">
               <Users size={28} />
            </div>
            <div className="relative z-10 flex-1">
              <h4 className="font-black text-gray-900 uppercase italic text-lg tracking-tighter leading-tight">{meuGrupo.nome}</h4>
              <div className="flex items-center gap-2 mt-1">
                 <Clock size={10} className="text-rose-500" />
                 <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Toda {meuGrupo.dia_semana}</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-gray-200 group-hover:text-[#1B3B6B] transition-soft group-hover:translate-x-2" />
          </div>
        ) : (
          <div className="glass-panel p-10 rounded-[3rem] shadow-sm border-white/50 text-center flex flex-col items-center gap-4 border-dashed border-2">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200">
               <Users size={28} />
            </div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Sem célula vinculada</p>
            <button className="text-[#1B3B6B] text-[10px] font-black uppercase tracking-widest underline underline-offset-4">Vincular Agora</button>
          </div>
        )}
      </section>

      {/* Modal Inscrição - Premium Custom */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end">
            <motion.div 
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               exit={{ y: "100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="bg-white w-full rounded-t-[4rem] p-10 space-y-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-100 rounded-full mt-4" />
              
              <div className="flex justify-between items-start pt-2">
                <div className="space-y-1">
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-[#1B3B6B] bg-[#1B3B6B]/5 px-3 py-1 rounded-full tracking-widest">{selectedEvent.tipo}</span>
                      {selectedEvent.tipo === 'pago' && <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-3 py-1 rounded-full tracking-widest">R$ {selectedEvent.preco}</span>}
                   </div>
                   <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-tight mt-2">{selectedEvent.titulo}</h3>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="glass-panel p-3 rounded-full active:scale-90 transition-soft"><X size={20} /></button>
              </div>
              
              <div className="space-y-6">
                <p className="text-sm text-gray-500 font-medium leading-relaxed italic">"{selectedEvent.descricao}"</p>
                
                {selectedEvent.tipo === 'pago' && selectedEvent.pix_key && (
                  <div className="bg-black p-6 rounded-[2.5rem] flex items-center gap-5 shadow-xl shadow-black/10 border border-white/10 group">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md transition-soft group-hover:scale-110">
                       <QrCode size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Chave Pix</p>
                      <p className="text-sm font-black text-white select-all mt-0.5">{selectedEvent.pix_key}</p>
                    </div>
                  </div>
                )}
                
                {selectedEvent.tipo === 'cota' && selectedEvent.cota_desc && (
                  <div className="bg-amber-50 p-6 rounded-[2.5rem] border-2 border-amber-100 flex items-center gap-5">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                       <AlertCircle size={24} />
                    </div>
                    <div className="flex-1">
                       <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">O que trazer?</p>
                       <p className="text-xs font-black text-amber-900 italic tracking-tight leading-tight mt-1">"{selectedEvent.cota_desc}"</p>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleInscribe} 
                disabled={subscribing} 
                className="w-full bg-[#1B3B6B] text-white py-7 rounded-[2.5rem] font-black shadow-premium shadow-indigo-600/20 uppercase italic tracking-[0.1em] active:scale-95 transition-soft disabled:opacity-50"
              >
                {subscribing ? <Loader2 className="animate-spin mx-auto" /> : "Garantir minha vaga"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
