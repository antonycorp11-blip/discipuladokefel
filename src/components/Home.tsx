import { BookOpen, Calendar, Bell, Loader2, QrCode, AlertCircle, X, Award, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { supabase, type KefelEvento, type KefelCelula } from "@/lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { SocialFeed } from "./SocialFeed";
import { BIBLE_BOOKS } from "@/data/bible";

const VERSES = [
  { text: "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.", ref: "Salmos 119:105" },
  { text: "O que diz a palavra de Deus não volta vazia, mas cumpre o seu propósito.", ref: "Isaías 55:11" },
  { text: "Posso todas as coisas naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "O Senhor é o meu pastor, nada me faltará.", ref: "Salmos 23:1" },
];

const VERSE = VERSES[Math.floor(Math.random() * VERSES.length)];

export function Home() {
  const { user, showToast, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [meuGrupo, setMeuGrupo] = useState<KefelCelula | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [inscribedIds, setInscribedIds] = useState<string[]>([]);
  const [canClaimCulto, setCanClaimCulto] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();

    // Lógica para Regate de Selo de Culto (Somente Domingo 20:00 até Seg 23:59)
    const checkClaimable = () => {
      const now = new Date();
      const day = now.getDay(); // 0 is Sunday, 1 is Monday
      const hours = now.getHours();

      let isWindow = false;
      if (day === 0 && hours >= 20) isWindow = true; // Domingo pos 20h
      if (day === 1) isWindow = true; // Segunda inteira
      
      // FOR TESTING, ALWAYS TRUE! Remove or comment out after testing:
      isWindow = true; 

      if (isWindow) {
        if (!user.last_culto_claim) {
          setCanClaimCulto(true);
        } else {
          const lastClaim = new Date(user.last_culto_claim);
          // Determine the start of THIS Sunday's window
          const sunday = new Date();
          sunday.setDate(sunday.getDate() - (sunday.getDay() === 0 ? 0 : sunday.getDay() === 1 ? 1 : sunday.getDay()));
          sunday.setHours(20, 0, 0, 0);
          
          if (lastClaim < sunday) {
             setCanClaimCulto(true);
          }
        }
      }
    };
    checkClaimable();
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
      showToast("Inscrição confirmada! 🚀");
    } else {
      showToast("Erro ao se inscrever", "error");
    }
    setSubscribing(false);
  };

  const handleClaimBadge = async () => {
    if (!user || claiming) return;
    setClaiming(true);
    const newCount = (user.cultos_presenca || 0) + 1;
    const now = new Date().toISOString();

    // Adiciona 'culto' ao array de badges se ainda não tiver
    const currentBadges: string[] = Array.isArray(user.badges) ? [...user.badges] : [];
    if (!currentBadges.includes('culto')) currentBadges.push('culto');

    const { error } = await supabase.from("kefel_profiles").update({
      cultos_presenca: newCount,
      last_culto_claim: now,
      badges: currentBadges
    }).eq("id", user.id);

    if (!error) {
      setCanClaimCulto(false);
      showToast("🪙 Selo do Culto resgatado!", "success");
      
      // Atualizar estado local imediatamente para feedback instantâneo
      const updatedUser = { ...user, cultos_presenca: newCount, last_culto_claim: now, badges: currentBadges };
      setUser(updatedUser);
      
    } else {
      console.error("Erro ao resgatar selo:", error);
      showToast("Erro ao resgatar selo", "error");
    }
    setClaiming(false);
  };

  const shareVerse = () => {
    const msg = `Versículo do Dia:\n\n"${VERSE.text}"\n(${VERSE.ref})\n\nLido no Kefel App`;
    if (navigator.share) navigator.share({ text: msg });
    else { navigator.clipboard.writeText(msg); showToast("Copiado!", "info"); }
  };

  const [activeTab, setActiveTab] = useState<'hoje' | 'comunidade'>('hoje');

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] pt-4 pb-24 transition-colors duration-500">
      <header className="px-5 pt-8 flex items-center justify-between border-b border-gray-200 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#121212] z-40 sticky top-0">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('hoje')}
            className={`pb-3 font-bold text-[15px] relative transition-colors ${activeTab === 'hoje' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            Hoje
            {activeTab === 'hoje' && <motion.div layoutId="hometab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-rose-500 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('feed')}
            className={`pb-3 font-bold text-[15px] relative transition-colors ${activeTab === 'feed' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            Feed
            {activeTab === 'feed' && <motion.div layoutId="hometab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-rose-500 rounded-t-full" />}
          </button>
        </div>
      </header>

      {activeTab === 'feed' ? (
        <div className="pt-4"><SocialFeed /></div>
      ) : (
        <div className="px-5 pt-6 pb-10 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight">Boa noite, {user?.nome?.split(' ')[0] || "Visitante"}</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-gray-900 dark:text-white font-semibold">
                <Sparkles size={16} className="text-gray-900 dark:text-white" />
                <span className="text-sm">{(user?.cultos_presenca || 0)}</span>
              </div>
              <button className="relative">
                <Bell size={20} className="text-gray-900 dark:text-white" />
                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-[#F8FAFC] dark:border-[#121212] flex items-center justify-center text-[8px] text-white font-bold">1</div>
              </button>
            </div>
          </div>

      {/* Banner de Gamificação: Resgate de Culto */}
      <AnimatePresence>
        {canClaimCulto && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-8"
          >
            <div className="relative bg-gradient-to-r from-amber-500 to-orange-600 rounded-[2rem] p-5 shadow-xl shadow-orange-500/30 text-white overflow-hidden flex items-center justify-between group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
              <div className="flex items-center gap-4 z-10">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                  <Award className="text-yellow-100" size={24} />
                </div>
                <div>
                  <h3 className="font-black italic uppercase tracking-tight leading-tight">Selo Disponível!</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-100 mt-1 flex items-center gap-1"><Sparkles size={10} /> Culto Dominical</p>
                </div>
              </div>
              <button 
                onClick={handleClaimBadge}
                disabled={claiming}
                className="z-10 bg-white text-orange-600 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-soft relative overflow-hidden"
              >
                {claiming ? <Loader2 size={16} className="animate-spin" /> : "Resgatar"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

          {/* Versículo Card Milimétrico */}
          <div className="relative rounded-[16px] overflow-hidden bg-gray-900 shadow-md">
            <div className="absolute inset-0 bg-gradient-to-b from-[#b77443]/90 to-gray-900/90 mix-blend-multiply z-0" />
            <div className="relative z-10 p-5 flex flex-col justify-between min-h-[300px]">
              <div>
                <p className="text-white/80 text-[11px] font-normal tracking-wide">Versículo do Dia</p>
                <p className="text-white font-bold text-sm mt-0.5">{VERSE.ref}</p>
                
                <p 
                  className="mt-6 text-white text-[28px] leading-[1.25] max-w-[280px]" 
                  style={{ fontFamily: "'Lora', 'Merriweather', 'PT Serif', serif" }}
                >
                  {VERSE.text}
                </p>
              </div>

              <div className="flex items-center justify-between mt-10 px-4 pb-4">
                <button className="flex flex-col items-center gap-1 text-white/90 active:scale-90 transition-transform">
                  <div className="p-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>
                </button>
                <div className="flex-1" />
                <button onClick={shareVerse} className="flex flex-col items-center gap-1 text-white/90 active:scale-90 transition-transform">
                  <div className="p-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg></div>
                </button>
              </div>
            </div>
          </div>

          {user?.last_bible_reading && (() => {
            const br = user.last_bible_reading as { bookId?: string; book?: string; chapter?: number };
            const bookName = br.bookId ? (BIBLE_BOOKS.find(b => b.id === br.bookId)?.nome ?? br.book ?? "") : (br.book ?? "");
            if (!bookName) return null;
            return (
              <Link to="/biblia-leitura" className="w-full bg-[#1A1A1A] p-4 rounded-[12px] flex items-center justify-between group active:bg-[#222]">
                <div className="flex flex-col">
                  <span className="text-white/60 text-[11px] font-medium tracking-wide flex items-center gap-1"><BookOpen size={10} /> Leitura Contínua</span>
                  <h4 className="font-bold text-white text-base mt-1">{bookName} {br.chapter ?? 1}</h4>
                  <span className="text-white/40 text-[11px] mt-1 flex items-center gap-1"><div className="w-2 h-2 fill-current">▶</div> Retomar</span>
                </div>
                <div className="w-14 h-14 bg-gray-800 rounded-[8px] flex items-center justify-center overflow-hidden">
                   <BookOpen size={24} className="text-white/20" />
                </div>
              </Link>
            );
          })()}



          {/* Agenda section - YouVersion layout */}
          <div className="space-y-4">
            {upcomingEvents.map((event, i) => {
              const date = new Date(event.data_hora);
              const isInscribed = inscribedIds.includes(event.id);
              return (
                <div key={event.id} onClick={() => setSelectedEvent(event)} className="w-full bg-[#1A1A1A] p-4 rounded-[12px] flex items-center justify-between cursor-pointer active:bg-[#222]">
                  <div className="flex flex-col pr-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-4 bg-gray-500/20 text-gray-400 rounded-sm flex items-center justify-center text-[9px]">💧</span>
                      <span className="text-white/60 text-[11px] font-medium tracking-wide">Agenda | {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.','')}</span>
                    </div>
                    <h4 className="font-bold text-white text-base mt-1 line-clamp-1">{event.titulo}</h4>
                    <span className="text-white/40 text-[11px] mt-1 flex items-center gap-1"><div className="text-[8px]">▶</div> {event.endereco}</span>
                  </div>
                  <div className="w-14 h-14 bg-[#232323] rounded-[8px] flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {event.imagem_url ? (
                      <img src={event.imagem_url} className="w-full h-full object-cover" />
                    ) : (
                      <Calendar size={20} className="text-white/30" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Inscrição */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end">
            <motion.div 
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               exit={{ y: "100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="bg-white dark:bg-slate-900 w-full rounded-t-[4rem] p-10 space-y-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full mt-4" />
              
              <div className="flex justify-between items-start pt-2">
                <div className="space-y-1">
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-[#1B3B6B] dark:text-blue-400 bg-[#1B3B6B]/5 dark:bg-blue-400/10 px-3 py-1 rounded-full tracking-widest">{selectedEvent.tipo}</span>
                      {selectedEvent.tipo === 'pago' && <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-400/10 px-3 py-1 rounded-full tracking-widest">R$ {selectedEvent.preco}</span>}
                   </div>
                   <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-tight mt-2">{selectedEvent.titulo}</h3>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="glass-panel dark:bg-slate-800 p-3 rounded-full active:scale-90 transition-soft"><X size={20} className="dark:text-white" /></button>
              </div>
              
              <div className="space-y-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed italic">"{selectedEvent.descricao}"</p>
                
                {selectedEvent.tipo === 'pago' && selectedEvent.pix_key && (
                  <div className="bg-black dark:bg-slate-800 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-xl shadow-black/10 border border-white/10 group">
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
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-[2.5rem] border-2 border-amber-100 dark:border-amber-900/50 flex items-center gap-5">
                    <div className="w-12 h-12 bg-white dark:bg-amber-900/50 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                       <AlertCircle size={24} />
                    </div>
                    <div className="flex-1">
                       <p className="text-[9px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest">O que trazer?</p>
                       <p className="text-xs font-black text-amber-900 dark:text-amber-100 italic tracking-tight leading-tight mt-1">"{selectedEvent.cota_desc}"</p>
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
