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
    if (index === 0) return { bg: 'bg-amber-50', text: 'text-amber-600', icon: <Crown size={24} className="text-amber-500" /> };
    if (index === 1) return { bg: 'bg-gray-50', text: 'text-gray-400', icon: <Medal size={24} className="text-gray-400" /> };
    if (index === 2) return { bg: 'bg-orange-50', text: 'text-orange-400', icon: <Medal size={24} className="text-orange-400" /> };
    return { bg: 'bg-white', text: 'text-gray-300', icon: <span className="font-bold text-xs">{index + 1}</span> };
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFD] pt-14 pb-24 px-6 overflow-y-auto">
      <header className="mb-8 pt-4 flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 italic uppercase underline decoration-blue-600 decoration-4">Ranking</h1>
           <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Dedicados à Palavra</p>
        </div>
        <div className="bg-blue-600 p-3 rounded-2xl shadow-xl text-white"><Trophy size={20} /></div>
      </header>

      {loading ? <Loader2 className="animate-spin mx-auto text-blue-600" /> : (
        <div className="grid gap-4">
          {ranking.map((user, index) => {
            const style = getRankStyle(index);
            return (
              <div key={user.id} className={`p-4 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 transition-transform active:scale-[0.98] ${style.bg}`}>
                <div className="flex-shrink-0 w-8 flex justify-center">{style.icon}</div>
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border-2 border-white flex items-center justify-center overflow-hidden">
                   {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <User className="text-blue-200" />}
                </div>
                <div className="flex-1 min-w-0">
                   <h3 className="font-bold text-gray-900 truncate uppercase italic">{user.nome}</h3>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock size={10} className="text-blue-600" />
                      <p className="text-[10px] font-black text-blue-600 tabular-nums uppercase">{formatTime(user.tempo_leitura_total)}</p>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
