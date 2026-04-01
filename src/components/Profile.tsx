import { User, Settings, LogOut, Shield, Users, BookOpen, Clock, Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { supabase, type KefelCelula } from "@/lib/supabase";
import { Link } from "react-router-dom";

export function Profile() {
  const { user, logout } = useAuth();
  const [meuGrupo, setMeuGrupo] = useState<KefelCelula | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.celula_id) return;
    setLoading(true);
    supabase
      .from("kefel_celulas")
      .select("*")
      .eq("id", user.celula_id)
      .single()
      .then(({ data }) => {
        setMeuGrupo(data as KefelCelula | null);
        setLoading(false);
      });
  }, [user?.celula_id]);

  if (!user) return null;

  const formatTime = (seconds: number) => {
    if (!seconds) return "0min";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}min`;
  };

  const roleLabel: Record<string, string> = {
    master: "Discipulador",
    lider: "Líder",
    membro: "Membro",
  };

  const roleColor: Record<string, string> = {
    master: "bg-purple-50 text-purple-700",
    lider: "bg-green-50 text-green-700",
    membro: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Meu Perfil</h1>
        <button className="bg-gray-100 p-3 rounded-2xl text-gray-400 active:scale-95 transition-transform">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="relative">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
            {user.role === "master"
              ? <Crown className="w-12 h-12 text-amber-500" />
              : <User className="w-12 h-12 text-blue-400" />
            }
          </div>
          <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">{user.nome}</h2>
          <p className="text-gray-400 text-sm">{user.email}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${roleColor[user.role] || "bg-gray-100 text-gray-600"}`}>
          {roleLabel[user.role] || user.role}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="bg-blue-50 w-10 h-10 rounded-2xl flex items-center justify-center text-blue-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Leitura Total</p>
            <p className="text-lg font-black text-gray-900">{formatTime(user.tempo_leitura_total)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="bg-green-50 w-10 h-10 rounded-2xl flex items-center justify-center text-green-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Minha Célula</p>
            <p className="text-base font-black text-gray-900 truncate">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : meuGrupo ? meuGrupo.nome : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {(user.role === "master" || user.role === "lider") && (
          <Link
            to="/celulas"
            className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="bg-purple-50 w-10 h-10 rounded-2xl flex items-center justify-center text-purple-600">
                <Crown className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-gray-900">
                {user.role === "master" ? "Painel de Células" : "Minha Célula"}
              </h4>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        <button className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-orange-50 w-10 h-10 rounded-2xl flex items-center justify-center text-orange-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900">Histórico de Leitura</h4>
          </div>
          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-purple-50 w-10 h-10 rounded-2xl flex items-center justify-center text-purple-600">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900">Privacidade</h4>
          </div>
          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center justify-between p-5 hover:bg-red-50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-red-50 w-10 h-10 rounded-2xl flex items-center justify-center text-red-500 group-hover:bg-red-100">
              <LogOut className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 group-hover:text-red-600">Sair da Conta</h4>
          </div>
        </button>
      </div>
    </div>
  );
}
