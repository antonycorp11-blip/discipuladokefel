import { Trophy, Medal, Award, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { supabase, type KefelProfile } from "@/lib/supabase";

export function Ranking() {
  const { user: currentUser } = useAuth();
  const [ranking, setRanking] = useState<KefelProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<'users' | 'cells'>('users');
  const [cellRanking, setCellRanking] = useState<{ id: string; nome: string; tempo: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // 1) Ranking de Usuários
      const { data: userData } = await supabase.from("kefel_profiles").select("*").order("tempo_leitura_total", { ascending: false }).limit(50);
      const users = (userData || []) as KefelProfile[];
      setRanking(users);

      // 2) Ranking de Células (Agregação)
      const { data: cellData } = await supabase.from("kefel_celulas").select("id, nome") as { data: { id: string; nome: string }[] | null };
      if (cellData) {
        const cellScores = cellData.map(c => {
          const total = users.filter(u => u.celula_id === c.id).reduce((acc, curr) => acc + curr.tempo_leitura_total, 0);
          return { id: c.id, nome: c.nome, tempo: total };
        });
        setCellRanking(cellScores.sort((a, b) => b.tempo - a.tempo));
      }
      setLoading(false);
    };
    fetchData();
  }, [currentUser]);

  const formatTime = (seconds: number) => {
    if (!seconds) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Ranking</h1>
          <p className="text-gray-400 text-sm font-medium">Os mais dedicados à Palavra.</p>
        </div>
        
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
          <button 
            onClick={() => setTab('users')}
            className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all", tab === 'users' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400")}
          >Pessoas</button>
          <button 
            onClick={() => setTab('cells')}
            className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all", tab === 'cells' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400")}
          >Células</button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : tab === 'users' ? (
        <div className="space-y-4">
           {ranking.map((u, i) => (
              <div key={u.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-gray-200 w-6">#{i+1}</span>
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                       <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="font-bold text-gray-900">{u.nome}</p>
                 </div>
                 <p className="font-black text-blue-600">{formatTime(u.tempo_leitura_total)}</p>
              </div>
           ))}
        </div>
      ) : (
        <div className="space-y-3">
          {cellRanking.map((c, i) => (
             <div key={c.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black", i===0 ? "bg-amber-400" : i===1 ? "bg-slate-300" : "bg-orange-300")}>
                      {i+1}
                   </div>
                   <div>
                      <h3 className="font-black text-gray-900 text-lg leading-none">{c.nome}</h3>
                      <p className="text-gray-400 text-xs font-bold uppercase mt-1">Tempo Total</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-xl font-black text-blue-600">{formatTime(c.tempo)}</p>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
