import React, { useState, useEffect } from "react";
import { 
  UserPlus, Star, Heart, BookOpen, 
  Trophy, MessageCircle, Share2, Loader2, UserCircle, Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SocialFeed() {
  const [activities, setActivities] = useState<any[]>([]);
  const [topReaders, setTopReaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSocialData();
  }, []);

  async function fetchSocialData() {
    setLoading(true);
    try {
      // 1. Recent Joiners (Profiles)
      const { data: profiles } = await supabase
        .from("kefel_profiles")
        .select("id, nome, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // 2. Recent Favorites
      const { data: favorites } = await supabase
        .from("kefel_favoritos")
        .select("id, user_id, livro, capitulo, versiculo, texto, created_at, profile:user_id(nome, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(5);

      // 3. Top Readers (Stars)
      const { data: readers } = await supabase
        .from("kefel_profiles")
        .select("id, nome, avatar_url, tempo_leitura_total")
        .order("tempo_leitura_total", { ascending: false })
        .limit(3);

      const allActivities: any[] = [
        ...((profiles as any[]) || []).map(p => ({ 
          type: 'join', 
          id: p.id, 
          nome: p.nome, 
          avatar_url: p.avatar_url, 
          created_at: p.created_at 
        })),
        ...((favorites as any[]) || []).map(f => ({ 
          type: 'favorite', 
          id: f.id, 
          nome: (f.profile as any)?.nome || 'Membro', 
          avatar_url: (f.profile as any)?.avatar_url, 
          book: f.livro, 
          chapter: f.capitulo, 
          verse: f.versiculo,
          text: f.texto,
          created_at: f.created_at 
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(allActivities.slice(0, 10));
      setTopReaders(readers || []);
    } catch (err) {
      console.error("Erro social feed:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#1B3B6B]" /></div>;

  return (
    <div className="space-y-10 mb-20">
      {/* Top Readers (Stars) */}
      <section>
        <div className="flex items-center gap-2 mb-6 px-2">
           <div className="w-2 h-6 bg-amber-400 rounded-full" />
           <h2 className="text-xl font-black text-gray-900 dark:text-white italic uppercase tracking-tighter">Destaques da Semana</h2>
        </div>
        <div className="flex justify-center items-end gap-4 px-4 py-6 overflow-hidden">
           {topReaders.map((reader, index) => {
              return (
                <Link
                  to={`/perfil/${reader.id}`}
                  key={reader.id}
                >
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex-1 glass-panel p-4 rounded-[2.5rem] flex flex-col items-center justify-center relative ${index === 0 ? 'bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-200 dark:ring-amber-900' : 'bg-white/50 dark:bg-slate-800/50 shadow-sm border-white/50 dark:border-white/10'}`}
                  >
                     {index === 0 && <Star key="star" className="absolute -top-3 text-amber-500 animate-bounce fill-amber-500" size={24} />}
                     <div className="w-14 h-14 bg-white dark:bg-slate-700 p-1 rounded-2xl shadow-premium shadow-black/5 ring-1 ring-white/50 flex items-center justify-center overflow-hidden mb-3">
                        {reader.avatar_url ? <img src={reader.avatar_url} className="w-full h-full object-cover rounded-xl" /> : <UserCircle className="text-gray-200" size={32} />}
                     </div>
                     <p className="text-[9px] font-black uppercase text-center truncate w-full text-gray-900 dark:text-white leading-none">{reader.nome.split(' ')[0]}</p>
                     <div className="flex items-center gap-1 mt-2">
                         <Clock size={8} className="text-gray-400 dark:text-gray-500" />
                         <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{Math.floor(reader.tempo_leitura_total / 60)} min</span>
                     </div>
                  </motion.div>
                </Link>
              );
           })}
        </div>
      </section>

      {/* Atividades Recentes */}
      <section>
        <div className="flex items-center gap-2 mb-6 px-2">
           <div className="w-2 h-6 bg-blue-500 rounded-full" />
           <h2 className="text-xl font-black text-gray-900 dark:text-white italic uppercase tracking-tighter">O que está acontecendo</h2>
        </div>
        
        <div className="space-y-6">
          {activities.map((act, i) => (
            <motion.div 
              key={act.id + i}
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="flex gap-4 items-start"
            >
               <Link to={`/perfil/${act.id}`} className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex-shrink-0 flex items-center justify-center border border-gray-100 dark:border-white/10 p-1 active:scale-95 transition-soft">
                  {act.avatar_url ? <img src={act.avatar_url} className="w-full h-full object-cover rounded-xl" /> : <UserCircle className="text-gray-100" size={28} />}
               </Link>
               <div className="flex-1 space-y-1">
                 <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase italic">
                      {act.type === 'join' ? (
                        <Link to={`/perfil/${act.id}`} className="flex items-center gap-1 active:opacity-70">
                          <UserPlus size={10} className="text-green-500" />
                          {act.nome} entrou na família
                        </Link>
                      ) : (
                        <Link to={`/perfil/${act.id}`} className="flex items-center gap-1 active:opacity-70">
                          <Heart size={10} className="text-rose-500 fill-rose-500" />
                          {act.nome} favoritou um versículo
                        </Link>
                      )}
                    </p>
                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                 </div>
                 
                 {act.type === 'favorite' ? (
                    <div className="bg-gray-50/80 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-white/10">
                       <p className="text-xs text-gray-600 dark:text-gray-400 italic tracking-tight leading-relaxed">"{act.text}"</p>
                       <p className="text-[9px] font-black text-[#1B3B6B] dark:text-blue-400 uppercase tracking-widest mt-2">{act.book} {act.chapter}:{act.verse}</p>
                    </div>
                 ) : (
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic pt-1">Bem-vindo à nossa comunidade! 🎉</p>
                 )}
               </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
