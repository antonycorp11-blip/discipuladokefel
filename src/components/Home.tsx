import { BookOpen, Users, Calendar, Trophy, ArrowRight, Bell, Loader2, CheckCircle2, QrCode, AlertCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { supabase, type KefelEvento, type KefelCelula } from "@/lib/supabase";

const VERSES = [
  { text: "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.", ref: "Salmos 119:105" },
  { text: "O que diz a palavra de Deus não volta vazia, mas cumpre o seu propósito.", ref: "Isaías 55:11" },
  { text: "Posso todas as coisas naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "O Senhor é o meu pastor, nada me faltará.", ref: "Salmos 23:1" },
  { text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.", ref: "Salmos 46:1" }
];

const VERSE_OF_THE_DAY = VERSES[Math.floor(Math.random() * VERSES.length)];

export function Home() {
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [meuGrupo, setMeuGrupo] = useState<KefelCelula | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal de Inscrição
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

    const [eventsRes, inscresRes, celulaRes] = await Promise.all([
      supabase.from("kefel_eventos").select("*").gte("data_hora", now).order("data_hora", { ascending: true }).limit(3),
      supabase.from("kefel_eventos_inscritos").select("evento_id").eq("user_id", user?.id),
      user?.celula_id ? supabase.from("kefel_celulas").select("*").eq("id", user.celula_id).single() : Promise.resolve({ data: null })
    ]);

    setUpcomingEvents(eventsRes.data as any[] || []);
    setInscribedIds(((inscresRes.data as any[]) || []).map((i: any) => i.evento_id));
    setMeuGrupo(celulaRes.data as KefelCelula | null);
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
      alert("Falha na inscrição: " + error.message);
    }
    setSubscribing(false);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return {
      dia: date.getDate(),
      mes: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      hora: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFD] pt-14 pb-24 px-6 overflow-y-auto">
      {/* Header com Safe Area */}
      <header className="flex items-center justify-between mb-8 pt-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Kefel" className="w-10 h-10 object-contain shadow-2xl rounded-2xl" />
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 leading-tight italic uppercase tracking-tighter">Kefel</h1>
            <p className="text-gray-400 text-[10px] font-black uppercase italic tracking-widest">
              Bem-vindo, {user?.nome?.split(" ")[0]}
            </p>
          </div>
        </div>
        <button className="bg-gray-100 p-3 rounded-2xl text-gray-500 active:scale-95">
          <Bell className="w-5 h-5 text-blue-600" />
        </button>
      </header>

      {/* Versículo do Dia Estilizado */}
      <div className="bg-black rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group border border-gray-800">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-xs">📖</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Palavra do Dia</span>
          </div>
          <p className="text-xl font-medium leading-relaxed italic tracking-tight italic">
            "{VERSE_OF_THE_DAY.text}"
          </p>
          <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-tighter italic text-gray-400">{VERSE_OF_THE_DAY.ref}</span>
            <button className="text-[9px] bg-white text-black px-4 py-2 rounded-full font-black uppercase tracking-widest active:scale-95 transition-transform italic">
              Enviar
            </button>
          </div>
        </div>
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/biblia" className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-2xl active:scale-95 flex flex-col gap-4 group">
          <div className="bg-white/20 w-11 h-11 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-all">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-widest italic">Leitura</h3>
            <p className="text-blue-200 text-[10px] font-bold uppercase italic mt-1">66 Livros Offline</p>
          </div>
        </Link>
        <Link to="/ranking" className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl active:scale-95 flex flex-col gap-4 group">
          <div className="bg-amber-100 w-11 h-11 rounded-2xl flex items-center justify-center text-amber-600 group-hover:-rotate-12 transition-all">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
             <h3 className="font-black text-xs uppercase tracking-widest italic text-gray-900">Ranking</h3>
             <p className="text-gray-400 text-[10px] font-bold uppercase italic mt-1">Ver Posições</p>
          </div>
        </Link>
      </div>

      {/* Eventos Próximos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-900 uppercase italic underline decoration-blue-600 decoration-2">Agenda Próxima</h2>
          <Link to="/eventos" className="text-blue-600 text-[10px] font-black uppercase italic flex items-center gap-1">
            Ver Todos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-blue-600 animate-spin" /></div>
        ) : upcomingEvents.length === 0 ? (
          <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-gray-100 text-center">
            <p className="text-gray-400 text-[10px] font-black uppercase italic tracking-widest">Sem eventos agendados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingEvents.map((event) => {
              const { dia, mes, hora } = formatDate(event.data_hora);
              const isInscribed = inscribedIds.includes(event.id);
              return (
                <div key={event.id} className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-xl flex gap-4 items-center">
                  <div className="w-14 h-14 bg-black rounded-2xl flex-shrink-0 flex flex-col items-center justify-center text-white">
                    <span className="text-[8px] font-black uppercase text-blue-400">{mes}</span>
                    <span className="text-xl font-black leading-tight italic">{dia}</span>
                    <span className="text-[7px] text-gray-400 uppercase tracking-widest">{hora}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-900 text-[11px] uppercase truncate italic">{event.titulo}</h4>
                    <p className="text-gray-400 text-[9px] font-bold uppercase truncate italic">{event.endereco}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedEvent(event)}
                    disabled={isInscribed}
                    className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase italic transition-all ${isInscribed ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white shadow-lg active:scale-95'}`}
                  >
                    {isInscribed ? 'Confirmado' : 'Inscrever'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Minha Célula */}
      <section className="space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase italic">Minha Célula</h2>
        {meuGrupo ? (
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl flex items-center gap-5">
            <div className="bg-green-100 w-12 h-12 rounded-2xl flex items-center justify-center text-green-600">
              <Users className="w-10 h-10" />
            </div>
            <div>
              <h4 className="font-black text-lg text-gray-900 italic uppercase underline decoration-green-600 decoration-2">{meuGrupo.nome}</h4>
              <p className="text-gray-400 text-[10px] font-black uppercase italic tracking-widest mt-1">{meuGrupo.dia_semana}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-dashed border-gray-100 text-center">
            <p className="text-gray-400 text-[10px] font-black uppercase italic">Sem célula vinculada</p>
          </div>
        )}
      </section>

      {/* Modal de Inscrição */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end animate-in fade-in">
          <div className="bg-white w-full h-[60vh] rounded-t-[3.5rem] p-8 flex flex-col space-y-6 animate-in slide-in-from-bottom duration-500">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black italic uppercase italic underline decoration-blue-600 decoration-4">Confirmar Presença</h2>
                <button onClick={() => setSelectedEvent(null)} className="bg-gray-100 p-3 rounded-full"><X size={20} /></button>
             </div>

             <div className="flex-1 space-y-4">
               <div className="bg-gray-50 p-6 rounded-[2rem] space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest">Resumo do Evento</p>
                  <h3 className="text-xl font-black italic uppercase text-gray-900">{selectedEvent.titulo}</h3>
                  <div className="flex gap-4 pt-4 border-t border-gray-200">
                     <span className="text-[10px] font-black uppercase text-blue-600 italic">Preço: {selectedEvent.tipo === 'pago' ? `R$ ${selectedEvent.preco.toFixed(2)}` : 'Grátis'}</span>
                     {selectedEvent.tipo === 'cota' && <span className="text-[10px] font-black uppercase text-amber-600 italic">Levar: Cota</span>}
                  </div>
               </div>

               {selectedEvent.tipo === 'pago' && selectedEvent.pix_key && (
                 <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-center gap-4">
                   <QrCode className="text-blue-600" />
                   <div>
                     <p className="text-[9px] font-black uppercase text-blue-400 tracking-widest">Chave Pix</p>
                     <p className="text-xs font-black text-blue-900">{selectedEvent.pix_key}</p>
                   </div>
                 </div>
               )}

               {selectedEvent.tipo === 'cota' && selectedEvent.cota_desc && (
                 <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex items-center gap-4">
                   <AlertCircle className="text-amber-600" />
                   <div>
                     <p className="text-[9px] font-black uppercase text-amber-400 tracking-widest">O que trazer?</p>
                     <p className="text-xs font-black text-amber-900 italic uppercase leading-none">{selectedEvent.cota_desc}</p>
                   </div>
                 </div>
               )}
             </div>

             <button 
               onClick={handleInscribe}
               disabled={subscribing}
               className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest italic disabled:opacity-50 active:scale-95"
             >
                {subscribing ? <Loader2 className="animate-spin" /> : "Confirmar Agora"}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
