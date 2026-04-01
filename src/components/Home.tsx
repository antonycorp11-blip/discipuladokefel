import { BookOpen, Users, Calendar, Trophy, ArrowRight, Bell, Loader2 } from "lucide-react";
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
  const [upcomingEvents, setUpcomingEvents] = useState<KefelEvento[]>([]);
  const [meuGrupo, setMeuGrupo] = useState<KefelCelula | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const now = new Date().toISOString();

      const [{ data: eventsData }, { data: celulaData }] = await Promise.all([
        supabase
          .from("kefel_eventos")
          .select("*")
          .gte("data_hora", now)
          .order("data_hora", { ascending: true })
          .limit(3),
        user.celula_id
          ? supabase.from("kefel_celulas").select("*").eq("id", user.celula_id).single()
          : Promise.resolve({ data: null }),
      ]);

      setUpcomingEvents((eventsData || []) as KefelEvento[]);
      setMeuGrupo(celulaData as KefelCelula | null);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return {
      dia: date.getDate(),
      mes: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      hora: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  return (
    <div className="space-y-7 pb-10">
      {/* Header */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Kefel" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 leading-tight">Kefel</h1>
            <p className="text-gray-400 text-sm font-medium leading-tight">
              Olá, {user?.nome?.split(" ")[0]}!{" "}
              {user?.role === "master" && (
                <span className="text-blue-700 font-bold text-[10px] bg-blue-50 px-1.5 py-0.5 rounded-full">
                  Discipulador
                </span>
              )}
              {user?.role === "lider" && (
                <span className="text-green-700 font-bold text-[10px] bg-green-50 px-1.5 py-0.5 rounded-full">
                  Líder
                </span>
              )}
            </p>
          </div>
        </div>
        <button className="relative bg-gray-100 p-3 rounded-2xl text-gray-500 active:scale-95 transition-transform">
          <Bell className="w-5 h-5" />
        </button>
      </header>

      {/* Versículo do Dia */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group mb-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-125 transition-transform duration-700" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
              <span className="text-sm">📖</span>
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Versículo do Dia</span>
          </div>
          
          <p className="text-lg font-medium leading-relaxed italic">
            "{VERSE_OF_THE_DAY.text}"
          </p>
          
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm font-bold opacity-90">{VERSE_OF_THE_DAY.ref}</span>
            <button className="text-[10px] bg-white/20 px-3 py-1.5 rounded-full font-black uppercase tracking-wider backdrop-blur-md active:scale-95 transition-transform">
              Compartilhar
            </button>
          </div>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/biblia"
          className="bg-blue-600 p-5 rounded-3xl text-white shadow-xl shadow-blue-100 flex flex-col gap-3 active:scale-95 transition-transform"
        >
          <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">Bíblia</h3>
            <p className="text-blue-200 text-xs">66 livros completos</p>
          </div>
        </Link>

        <Link
          to="/ranking"
          className="bg-amber-500 p-5 rounded-3xl text-white shadow-xl shadow-amber-100 flex flex-col gap-3 active:scale-95 transition-transform"
        >
          <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">Ranking</h3>
            <p className="text-amber-100 text-xs">Ver posições</p>
          </div>
        </Link>
      </div>

      {/* Próximos eventos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Próximos Eventos</h2>
          <Link to="/eventos" className="text-blue-600 text-xs font-bold flex items-center gap-1">
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
            <Calendar className="w-7 h-7 text-gray-200 mx-auto mb-1.5" />
            <p className="text-gray-400 text-sm font-medium">Nenhum evento próximo.</p>
            {(user?.role === "master" || user?.role === "lider") && (
              <Link to="/eventos" className="text-blue-600 font-bold text-xs mt-1 inline-block">
                Criar evento →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingEvents.map((event) => {
              const { dia, mes, hora } = formatDate(event.data_hora);
              return (
                <div key={event.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-3 items-center">
                  <div className="w-14 h-14 bg-blue-50 rounded-xl flex-shrink-0 flex flex-col items-center justify-center text-blue-600">
                    <span className="text-[9px] font-bold uppercase">{mes}</span>
                    <span className="text-xl font-black leading-tight">{dia}</span>
                    <span className="text-[9px] text-blue-400">{hora}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm truncate">{event.titulo}</h4>
                    <p className="text-gray-400 text-xs truncate">{event.endereco}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                    event.tipo === "gratuito" ? "text-green-700 bg-green-50" : "text-blue-700 bg-blue-50"
                  }`}>
                    {event.tipo === "gratuito" ? "Grátis" : `R$ ${Number(event.preco).toFixed(2)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Minha Célula */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Minha Célula</h2>
          {(user?.role === "master" || user?.role === "lider") && (
            <Link to="/celulas" className="text-blue-600 text-xs font-bold flex items-center gap-1">
              Gerenciar <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {meuGrupo ? (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="bg-green-50 w-11 h-11 rounded-2xl flex items-center justify-center text-green-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">{meuGrupo.nome}</h4>
              <p className="text-gray-400 text-xs">{meuGrupo.dia_semana}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
            <Users className="w-7 h-7 text-gray-200 mx-auto mb-1.5" />
            <p className="text-gray-400 text-sm font-medium">
              {user?.role === "master"
                ? "Crie células na aba Células."
                : "Você ainda não está numa célula."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
