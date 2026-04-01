import { Trophy, Medal, Award, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { supabase, type KefelProfile } from "@/lib/supabase";

export function Ranking() {
  const { user: currentUser } = useAuth();
  const [ranking, setRanking] = useState<KefelProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      const { data } = await supabase
        .from("kefel_profiles")
        .select("*")
        .order("tempo_leitura_total", { ascending: false })
        .limit(50);

      const users = (data || []) as KefelProfile[];
      // Garante que o usuário atual está incluído (mesmo se tiver 0)
      const hasCurrentUser = currentUser && users.some((u) => u.id === currentUser.id);
      if (currentUser && !hasCurrentUser) {
        users.push(currentUser);
      }
      // Atualiza tempo do user atual com valor mais recente
      const merged = users.map((u) =>
        u.id === currentUser?.id ? { ...u, tempo_leitura_total: currentUser.tempo_leitura_total } : u
      );
      setRanking(merged.sort((a, b) => b.tempo_leitura_total - a.tempo_leitura_total));
      setLoading(false);
    };
    fetchRanking();
  }, [currentUser]);

  const formatTime = (seconds: number) => {
    if (!seconds) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  // Ordem: 2º | 1º | 3º
  const podium = top3.length >= 2
    ? [top3[1], top3[0], top3[2]].filter(Boolean)
    : top3;

  return (
    <div className="space-y-6 pb-10">
      <header>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Ranking de Leitura</h1>
        <p className="text-gray-400 text-sm font-medium">Tempo acumulado de leitura bíblica.</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : ranking.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Trophy className="w-16 h-16 text-gray-200" />
          <p className="text-gray-400 text-center text-sm font-medium">
            Nenhuma leitura registrada ainda.{"\n"}Comece a ler a Bíblia!
          </p>
        </div>
      ) : (
        <>
          {/* Pódio */}
          {top3.length > 0 && (
            <div className="flex justify-center items-end gap-5 py-6">
              {podium.map((u) => {
                const pos = top3.findIndex((x) => x.id === u.id);
                const isFirst = pos === 0;
                const isSecond = pos === 1;
                const isMe = u.id === currentUser?.id;

                return (
                  <div key={u.id} className={cn("flex flex-col items-center gap-2", isFirst && "-translate-y-4")}>
                    <div className="relative">
                      <div className={cn(
                        "rounded-full flex items-center justify-center overflow-hidden border-4",
                        isFirst ? "w-20 h-20 bg-amber-50 border-amber-400"
                        : isSecond ? "w-16 h-16 bg-gray-100 border-gray-300"
                        : "w-16 h-16 bg-orange-50 border-orange-300",
                        isMe && "ring-2 ring-blue-500 ring-offset-2"
                      )}>
                        <User className={cn("text-gray-400", isFirst ? "w-10 h-10" : "w-8 h-8")} />
                      </div>
                      {isFirst && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <Trophy className="w-8 h-8 text-amber-500 drop-shadow" />
                        </div>
                      )}
                      <div className={cn(
                        "absolute -bottom-2 -right-2 rounded-full border-2 border-white flex items-center justify-center",
                        isFirst ? "w-9 h-9 bg-amber-400"
                        : isSecond ? "w-7 h-7 bg-gray-300"
                        : "w-7 h-7 bg-orange-300"
                      )}>
                        {isFirst
                          ? <span className="text-white font-black text-base">1</span>
                          : isSecond
                          ? <Medal className="w-4 h-4 text-gray-600" />
                          : <Award className="w-4 h-4 text-orange-700" />
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <p className={cn("font-bold text-gray-900", isFirst ? "text-base" : "text-sm")}>
                        {u.nome.split(" ")[0]}{isMe ? " (Eu)" : ""}
                      </p>
                      <p className={cn("font-bold text-xs", isFirst ? "text-amber-600" : "text-gray-400")}>
                        {formatTime(u.tempo_leitura_total)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lista */}
          {rest.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {rest.map((u, idx) => {
                const isMe = u.id === currentUser?.id;
                return (
                  <div
                    key={u.id}
                    className={cn(
                      "flex items-center justify-between p-4",
                      idx < rest.length - 1 && "border-b border-gray-50",
                      isMe && "bg-blue-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-bold text-sm w-5">{idx + 4}</span>
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", isMe ? "bg-blue-100" : "bg-gray-100")}>
                        <User className={cn("w-5 h-5", isMe ? "text-blue-500" : "text-gray-400")} />
                      </div>
                      <p className="font-bold text-gray-900 text-sm">
                        {u.nome}{isMe ? " (Eu)" : ""}
                      </p>
                    </div>
                    <p className="font-bold text-gray-500 text-sm">{formatTime(u.tempo_leitura_total)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
