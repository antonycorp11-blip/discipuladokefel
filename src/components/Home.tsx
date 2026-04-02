import { BookOpen, Users, Calendar, Trophy, ArrowRight, Bell, Loader2, CheckCircle2, QrCode, AlertCircle, X, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { supabase, type KefelEvento, type KefelCelula } from "@/lib/supabase";

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

    setUpcomingEvents(eventsData || []);
    setInscribedIds((inscData || []).map((i: any) => i.evento_id));
    setMeuGrupo(celData as any);
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

  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-20 px-6 overflow-y-auto">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
             {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <User className="text-blue-600" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Olá, {user?.nome?.split(' ')[0]}</h1>
            <p className="text-gray-400 text-xs font-medium">Bom te ver novamente!</p>
          </div>
        </div>
        <button className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-gray-400">
          <Bell size={20} />
        </button>
      </header>

      {/* Card da Palavra */}
      <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-200 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10 space-y-4">
          <BookOpen size={24} className="text-blue-200" />
          <p className="text-xl font-medium leading-relaxed italic">"{VERSE.text}"</p>
          <span className="inline-block bg-blue-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{VERSE.ref}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link to="/biblia" className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-3 active:scale-95 transition-transform">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><BookOpen size={20} /></div>
          <span className="font-bold text-gray-900">Ler Bíblia</span>
        </Link>
        <Link to="/ranking" className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-3 active:scale-95 transition-transform">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600"><Trophy size={20} /></div>
          <span className="font-bold text-gray-900">Ranking</span>
        </Link>
      </div>

      {/* Eventos */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" /> Agenda
          </h2>
          <Link to="/eventos" className="text-blue-600 text-xs font-bold">Ver todos</Link>
        </div>

        {loading ? <Loader2 className="animate-spin mx-auto text-blue-600" /> : (
          <div className="space-y-4">
            {upcomingEvents.map(event => {
              const date = new Date(event.data_hora);
              const isInscribed = inscribedIds.includes(event.id);
              return (
                <div key={event.id} className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex gap-4 items-center">
                  <div className="w-14 h-14 bg-gray-50 rounded-xl flex flex-col items-center justify-center text-gray-400 overflow-hidden relative border border-gray-100">
                    {event.imagem_url ? (
                      <img src={event.imagem_url} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        <span className="text-[10px] font-bold uppercase">{date.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                        <span className="text-lg font-bold text-gray-900">{date.getDate()}</span>
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate">{event.titulo}</h4>
                    <p className="text-gray-400 text-[10px] truncate">{event.endereco}</p>
                  </div>
                  <button onClick={() => setSelectedEvent(event)} disabled={isInscribed} className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${isInscribed ? 'bg-green-50 text-green-600' : 'bg-blue-600 text-white shadow-lg active:scale-95'}`}>
                    {isInscribed ? <CheckCircle2 size={16} /> : 'Confirmar'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Célula */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={18} className="text-blue-600" /> Minha Célula
        </h2>
        {meuGrupo ? (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600"><Users size={24} /></div>
            <div>
              <h4 className="font-bold text-gray-900">{meuGrupo.nome}</h4>
              <p className="text-gray-400 text-xs">Toda {meuGrupo.dia_semana}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 text-center">
            <p className="text-gray-400 text-xs font-medium">Sem célula vinculada</p>
          </div>
        )}
      </section>

      {/* Modal Inscrição */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end animate-in fade-in">
          <div className="bg-white w-full rounded-t-[2.5rem] p-8 space-y-6 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">{selectedEvent.titulo}</h3>
              <button onClick={() => setSelectedEvent(null)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            {selectedEvent.tipo === 'pago' && (
              <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-4 border border-blue-100">
                <QrCode className="text-blue-600" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-blue-400 uppercase">Chave Pix</p>
                  <p className="text-sm font-bold text-blue-900 select-all">{selectedEvent.pix_key}</p>
                </div>
              </div>
            )}
            {selectedEvent.tipo === 'cota' && (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-3">
                <AlertCircle className="text-amber-600 shrink-0" />
                <p className="text-xs font-medium text-amber-900">{selectedEvent.cota_desc}</p>
              </div>
            )}
            <button onClick={handleInscribe} disabled={subscribing} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold shadow-xl active:scale-95 transition-transform disabled:opacity-50">
              {subscribing ? <Loader2 className="animate-spin mx-auto" /> : "Confirmar Presença"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
