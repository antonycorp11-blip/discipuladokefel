import { Trophy, Medal, Crown, Loader2, User, Clock, ChevronRight, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface RankUser {
  id: string;
  nome: string;
  avatar_url: string;
  tempo_leitura_total: number;
  cultos_presenca: number;
}

interface RankCell {
  id: string;
  nome: string;
  imagem_url?: string;
  tempoTotal: number;
}

export function Ranking() {
  const { showToast } = useAuth();
  const [individualRanking, setIndividualRanking] = useState<RankUser[]>([]);
  const [cellRanking, setCellRanking] = useState<RankCell[]>([]);
  const [activeTab, setActiveTab] = useState<'individual' | 'celulas'>('individual');
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    fetchRanking();
  }, []);

  const getSundayOfCurrentWeek = () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return sevenDaysAgo.toISOString();
  };

  async function fetchRanking() {
    setLoading(true);
    const sunday = getSundayOfCurrentWeek();

    const [logsRes, profilesRes, celulaRes] = await Promise.all([
      supabase.from("kefel_leitura_logs").select("user_id, tempo_segundos").gte("created_at", sunday),
      supabase.from("kefel_profiles").select("id, nome, avatar_url, celula_id, cultos_presenca, tempo_leitura_total"),
      supabase.from("kefel_celulas").select("id, nome, imagem_url")
    ]);

    const logs = (logsRes.data as any[]) || [];
    const profiles = (profilesRes.data as any[]) || [];
    const celulas = (celulaRes.data as any[]) || [];

    if (logsRes.error) {
       console.error("Erro ao buscar logs:", logsRes.error.message);
    }

    // Somar tempos dos logs da semana por usuário
    const userTimesFromLogs: Record<string, number> = {};
    logs.forEach(log => {
      userTimesFromLogs[log.user_id] = (userTimesFromLogs[log.user_id] || 0) + Number(log.tempo_segundos || 0);
    });

    // Se há logs válidos esta semana, usa logs. Senão, usa tempo_leitura_total do perfil (fallback histórico)
    const hasUsersWithLogs = logs.length > 0 && Object.keys(userTimesFromLogs).some(uid => userTimesFromLogs[uid] > 0);
    setUsingFallback(!hasUsersWithLogs);

    const individualStats: RankUser[] = profiles
      .map(p => ({
        id: p.id,
        nome: p.nome,
        avatar_url: p.avatar_url,
        tempo_leitura_total: hasUsersWithLogs
          ? (userTimesFromLogs[p.id] || 0)
          : (p.tempo_leitura_total || 0),
        cultos_presenca: p.cultos_presenca
      }))
      .filter(p => p.tempo_leitura_total > 0)
      .sort((a, b) => b.tempo_leitura_total - a.tempo_leitura_total);

    // Soma tempos por célula com o mesmo critério
    const cellTimes: Record<string, number> = {};
    profiles.forEach(p => {
      if (p.celula_id) {
        const tempo = hasUsersWithLogs
          ? (userTimesFromLogs[p.id] || 0)
          : (p.tempo_leitura_total || 0);
        cellTimes[p.celula_id] = (cellTimes[p.celula_id] || 0) + tempo;
      }
    });

    const cellStats: RankCell[] = celulas.map((cel: any) => ({
      id: cel.id,
      nome: cel.nome,
      imagem_url: cel.imagem_url,
      tempoTotal: cellTimes[cel.id] || 0
    })).sort((a: RankCell, b: RankCell) => b.tempoTotal - a.tempoTotal);

    setIndividualRanking(individualStats.slice(0, 50));
    setCellRanking(cellStats.slice(0, 50));
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
      <header className="mb-6 pt-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white italic uppercase">Ranking da Semana</h1>
              <div className="h-1.5 w-12 bg-[#1B3B6B] dark:bg-blue-500 rounded-full mt-1"></div>
              <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2 px-0">
                {usingFallback ? "Exibindo total histórico" : "Últimos 7 dias · Reseta todo domingo"}
              </p>
          </div>
          <div className="bg-black p-3.5 rounded-[1.5rem] shadow-xl text-white transform -rotate-3 hover:rotate-0 transition-transform"><Trophy size={22} className="text-amber-400" /></div>
        </div>

        {usingFallback && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-amber-500 text-lg">⚠️</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 leading-relaxed">
              Ranking semanal sendo inicializado. Exibindo total histórico de leituras.
            </p>
          </div>
        )}

        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl w-full">
          <button 
            onClick={() => setActiveTab('individual')} 
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'individual' ? 'bg-white dark:bg-slate-700 text-[#1B3B6B] dark:text-blue-400 shadow-sm' : 'text-gray-400'}`}
          >
            Individual
          </button>
          <button 
            onClick={() => setActiveTab('celulas')} 
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'celulas' ? 'bg-white dark:bg-slate-700 text-[#1B3B6B] dark:text-blue-400 shadow-sm' : 'text-gray-400'}`}
          >
            Células
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-[#1B3B6B] dark:text-blue-400" /></div>
      ) : (
        <div className="grid gap-5 pb-10">
          
          {activeTab === 'individual' && individualRanking.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Nenhuma leitura registrada ainda.</p>
            </div>
          )}

          {activeTab === 'celulas' && cellRanking.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Nenhuma leitura de células nesta semana.</p>
            </div>
          )}

          {activeTab === 'individual' && individualRanking.map((user, index) => {
            const style = getRankStyle(index);
            const isTop3 = index < 3;
            
            return (
              <Link 
                key={user.id} 
                to={`/perfil/${user.id}`}
                className={`group p-5 rounded-[2.5rem] shadow-sm border border-white/50 dark:border-white/10 flex items-center gap-5 transition-all active:scale-[0.98] relative overflow-hidden ${style.bg} ${isTop3 ? 'ring-1 ring-black/5 dark:ring-white/5 scale-[1.02] -mx-1' : ''}`}
              >
                {index === 0 && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400/30 blur-md" />}
                
                <div className="flex-shrink-0 w-10 flex justify-center z-10">{style.icon}</div>
                
                <div className={`relative flex-shrink-0 ${isTop3 ? 'w-16 h-16' : 'w-12 h-12'} bg-white dark:bg-slate-700 rounded-[1.8rem] shadow-lg border-2 border-white dark:border-slate-600 flex items-center justify-center overflow-hidden z-10 transition-all group-hover:scale-105 p-0.5`}>
                   {user.avatar_url ? (
                     <img src={user.avatar_url} className="w-full h-full object-cover rounded-2xl" />
                   ) : (
                     <User className={isTop3 ? "text-[#1B3B6B]/20" : "text-gray-200"} size={isTop3 ? 28 : 22} />
                   )}
                </div>

                <div className="flex-1 min-w-0 z-10">
                   <h3 className={`font-black text-gray-900 dark:text-white truncate uppercase italic tracking-tight ${isTop3 ? 'text-base' : 'text-sm'}`}>
                     {user.nome || "Anônimo"}
                   </h3>
                   <div className="flex items-center gap-2 mt-1">
                     <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/10 w-fit px-2 py-0.5 rounded-lg border border-white/80 dark:border-white/5">
                        <Clock size={11} className="text-[#1B3B6B] dark:text-blue-400" />
                        <p className="text-[11px] font-black text-[#1B3B6B] dark:text-blue-400 tabular-nums uppercase">{formatTime(user.tempo_leitura_total)}</p>
                     </div>
                     {(user.cultos_presenca ?? 0) > 0 && (
                       <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-900">
                         <Award size={10} className="text-amber-500" />
                         <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 tabular-nums">{user.cultos_presenca}x</p>
                       </div>
                     )}
                   </div>
                </div>

                <ChevronRight className="text-gray-200/50 dark:text-gray-600 group-hover:text-[#1B3B6B] dark:group-hover:text-white transition-colors" size={16} />

                {isTop3 && (
                  <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform">
                    <Trophy size={80} />
                  </div>
                )}
              </Link>
            );
          })}

          {activeTab === 'celulas' && cellRanking.map((cell, index) => {
            const style = getRankStyle(index);
            const isTop3 = index < 3;
            
            return (
              <div 
                key={cell.id} 
                className={`group p-5 rounded-[2.5rem] shadow-sm border border-white/50 dark:border-white/10 flex items-center gap-5 transition-all relative overflow-hidden ${style.bg} ${isTop3 ? 'ring-1 ring-black/5 dark:ring-white/5 scale-[1.02] -mx-1' : ''}`}
              >
                {index === 0 && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400/30 blur-md" />}
                
                <div className="flex-shrink-0 w-10 flex justify-center z-10">{style.icon}</div>

                <div className={`relative flex-shrink-0 ${isTop3 ? 'w-16 h-16' : 'w-12 h-12'} bg-white dark:bg-slate-700 rounded-[1.8rem] shadow-lg border-2 border-white dark:border-slate-600 flex items-center justify-center overflow-hidden z-10 transition-all group-hover:scale-105 p-0.5`}>
                   {cell.imagem_url ? (
                     <img src={cell.imagem_url} className="w-full h-full object-cover rounded-2xl" />
                   ) : (
                     <User className={isTop3 ? "text-[#1B3B6B]/20" : "text-gray-200"} size={isTop3 ? 28 : 22} />
                   )}
                </div>

                <div className="flex-1 min-w-0 z-10">
                   <h3 className={`font-black text-gray-900 dark:text-white truncate uppercase italic tracking-tight ${isTop3 ? 'text-base' : 'text-sm'}`}>
                     {cell.nome}
                   </h3>
                   <div className="flex items-center gap-2 mt-1">
                     <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/10 w-fit px-2 py-0.5 rounded-lg border border-white/80 dark:border-white/5">
                        <Clock size={11} className="text-[#1B3B6B] dark:text-blue-400" />
                        <p className="text-[11px] font-black text-[#1B3B6B] dark:text-blue-400 tabular-nums uppercase">{formatTime(cell.tempoTotal)}</p>
                     </div>
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
