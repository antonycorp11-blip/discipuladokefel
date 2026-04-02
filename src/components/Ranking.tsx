import { Trophy, Medal, Crown, Loader2, User, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface RankUser {
  id: string;
  nome: string;
  avatar_url: string;
  tempo_leitura_total: number;
}

export function Ranking() {
  const [ranking, setRanking] = useState<RankUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

  async function fetchRanking() {
    setLoading(true);
    const { data, error } = await supabase
      .from("kefel_profiles")
      .select("id, nome, avatar_url, tempo_leitura_total")
      .order("tempo_leitura_total", { ascending: false })
      .limit(20);
    
    if (!error) setRanking(data as RankUser[]);
    setLoading(false);
  }

  const formatTime = (seconds: number) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: 'glass-panel', text: 'text-amber-600', icon: <Crown size={24} className="text-amber-500" /> };
    if (index === 1) return { bg: 'glass-panel', text: 'text-gray-400', icon: <Medal size={24} className="text-gray-400" /> };
    if (index === 2) return { bg: 'glass-panel', text: 'text-orange-400', icon: <Medal size={24} className="text-orange-400" /> };
    return { bg: 'glass-panel', text: 'text-gray-300', icon: <span className="font-bold text-xs">{index + 1}</span> };
  };

  return (
    <div className="flex flex-col h-screen bg-transparent pt-14 pb-24 px-6 overflow-y-auto">
      <header className="mb-8 pt-4 flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-black text-gray-900 italic uppercase">Ranking</h1>
           <div className="h-1.5 w-12 bg-indigo-600 rounded-full mt-1"></div>
           <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">Dedicados à Palavra</p>
        </div>
        <div className="bg-black p-3.5 rounded-[1.5rem] shadow-xl text-white transform -rotate-3 hover:rotate-0 transition-transform"><Trophy size={22} className="text-indigo-400" /></div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid gap-5 pb-10">
          {ranking.map((user, index) => {
            const style = getRankStyle(index);
            const isTop3 = index < 3;
            
            return (
              <div 
                key={user.id} 
                className={`group p-5 rounded-[2.5rem] shadow-sm border border-white/50 flex items-center gap-5 transition-all active:scale-[0.98] relative overflow-hidden ${style.bg} ${isTop3 ? 'ring-1 ring-black/5 scale-[1.02] -mx-1' : ''}`}
              >
                {/* Efeito de brilho para Top 1 */}
                {index === 0 && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400/30 blur-md" />}
                
                <div className="flex-shrink-0 w-10 flex justify-center z-10">{style.icon}</div>
                
                <div className={`relative flex-shrink-0 ${isTop3 ? 'w-16 h-16' : 'w-12 h-12'} bg-white rounded-[1.8rem] shadow-lg border-2 border-white flex items-center justify-center overflow-hidden z-10 transition-all group-hover:scale-105 p-0.5`}>
                   {user.avatar_url ? (
                     <img src={user.avatar_url} className="w-full h-full object-cover rounded-2xl" />
                   ) : (
                     <User className={isTop3 ? "text-indigo-200" : "text-gray-200"} size={isTop3 ? 28 : 22} />
                   )}
                </div>

                <div className="flex-1 min-w-0 z-10">
                   <h3 className={`font-black text-gray-900 truncate uppercase italic tracking-tight ${isTop3 ? 'text-base' : 'text-sm'}`}>
                     {user.nome?.split(' ')[0] || "Anônimo"}
                   </h3>
                   <div className="flex items-center gap-1.5 mt-1 bg-white/50 w-fit px-2 py-0.5 rounded-lg border border-white/80">
                      <Clock size={11} className="text-indigo-600" />
                      <p className="text-[11px] font-black text-indigo-600 tabular-nums uppercase">{formatTime(user.tempo_leitura_total)}</p>
                   </div>
                </div>

                {isTop3 && (
                  <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform">
                    <Trophy size={80} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
