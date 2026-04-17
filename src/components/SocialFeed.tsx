import React, { useState, useEffect } from "react";
import { 
  UserPlus, Star, Heart, 
  Loader2, UserCircle, Clock, HandMetal
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
      const [profilesRes, favoritesRes, readersRes, oracaoRes] = await Promise.all([
        supabase.from("kefel_profiles").select("id, nome, avatar_url, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("kefel_favoritos").select("id, user_id, livro, capitulo, versiculo, texto, created_at, profile:user_id(nome, avatar_url)").order("created_at", { ascending: false }).limit(8),
        supabase.from("kefel_profiles").select("id, nome, avatar_url, tempo_leitura_total").order("tempo_leitura_total", { ascending: false }).limit(3),
        supabase.from("kefel_oracao").select("id, user_id, texto, created_at, profile:user_id(nome, avatar_url)").order("created_at", { ascending: false }).limit(8)
      ]);

      const allActivities: any[] = [
        ...((profilesRes.data as any[]) || []).map(p => ({
          type: 'join', id: p.id, nome: p.nome, avatar_url: p.avatar_url, created_at: p.created_at
        })),
        ...((favoritesRes.data as any[]) || []).map(f => ({
          type: 'favorite', id: f.id, profileId: f.user_id,
          nome: (f.profile as any)?.nome || 'Membro',
          avatar_url: (f.profile as any)?.avatar_url,
          book: f.livro, chapter: f.capitulo, verse: f.versiculo, text: f.texto,
          created_at: f.created_at
        })),
        ...((oracaoRes.data as any[]) || []).map(o => ({
          type: 'oracao', id: o.id, profileId: o.user_id,
          nome: (o.profile as any)?.nome || 'Membro',
          avatar_url: (o.profile as any)?.avatar_url,
          text: o.texto,
          created_at: o.created_at
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(allActivities.slice(0, 20));
      setTopReaders(readersRes.data || []);
    } catch (err) {
      console.error("Erro social feed:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#1B3B6B]" /></div>;

  return (
    <div className="space-y-10 mb-20 px-5">
      {/* Top Readers */}
      <section>
        <div className="flex items-center gap-2 mb-5">
           <div className="w-2 h-5 bg-amber-400 rounded-full" />
           <h2 className="text-base font-bold text-white tracking-tight">Destaques da Semana</h2>
        </div>
        <div className="flex justify-center items-end gap-3 py-4">
           {topReaders.map((reader, index) => (
             <Link to={`/perfil/${reader.id}`} key={reader.id}>
               <motion.div 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: index * 0.1 }}
                 className={`flex-1 bg-[#1C1C1E] p-4 rounded-[20px] flex flex-col items-center justify-center relative ${index === 0 ? 'ring-1 ring-amber-500/50' : ''}`}
               >
                  {index === 0 && <Star className="absolute -top-3 text-amber-400 fill-amber-400" size={20} />}
                  <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center bg-[#2C2C2E] mb-2">
                    {reader.avatar_url ? <img src={reader.avatar_url} className="w-full h-full object-cover" /> : <UserCircle className="text-gray-600" size={28} />}
                  </div>
                  <p className="text-[10px] font-bold text-white text-center truncate w-full">{reader.nome.split(' ')[0]}</p>
                  <div className="flex items-center gap-1 mt-1">
                      <Clock size={8} className="text-white/30" />
                      <span className="text-[9px] text-white/30">{Math.floor(reader.tempo_leitura_total / 60)} min</span>
                  </div>
               </motion.div>
             </Link>
           ))}
        </div>
      </section>

      {/* Atividades Recentes */}
      <section>
        <div className="flex items-center gap-2 mb-5">
           <div className="w-2 h-5 bg-blue-500 rounded-full" />
           <h2 className="text-base font-bold text-white tracking-tight">O que está acontecendo</h2>
        </div>
        <div className="space-y-5">
          {activities.map((act, i) => (
            <motion.div 
              key={act.id + i}
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="flex gap-3 items-start"
            >
               <Link to={`/perfil/${act.profileId || act.id}`} className="w-10 h-10 bg-[#2C2C2E] rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {act.avatar_url ? <img src={act.avatar_url} className="w-full h-full object-cover" /> : <UserCircle className="text-gray-600" size={22} />}
               </Link>
               <div className="flex-1 space-y-1">
                 <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-white/80">
                      {act.type === 'join' && (
                        <Link to={`/perfil/${act.id}`} className="flex items-center gap-1">
                          <UserPlus size={10} className="text-green-400" />
                          {act.nome} entrou na família
                        </Link>
                      )}
                      {act.type === 'favorite' && (
                        <Link to={`/perfil/${act.profileId}`} className="flex items-center gap-1">
                          <Heart size={10} className="text-rose-400 fill-rose-400" />
                          {act.nome} favoritou um versículo
                        </Link>
                      )}
                      {act.type === 'oracao' && (
                        <Link to={`/perfil/${act.profileId}`} className="flex items-center gap-1">
                          <HandMetal size={10} className="text-purple-400" />
                          {act.nome} pediu oração
                        </Link>
                      )}
                    </p>
                    <span className="text-[9px] text-white/20">
                      {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                 </div>
                 
                 {act.type === 'favorite' && (
                    <div className="bg-[#1C1C1E] p-3 rounded-2xl rounded-tl-none">
                       <p className="text-xs text-white/60 italic leading-relaxed">"{act.text}"</p>
                       <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-2">{act.book} {act.chapter}:{act.verse}</p>
                    </div>
                 )}
                 {act.type === 'oracao' && (
                    <div className="bg-[#1C1C1E] border border-purple-500/20 p-3 rounded-2xl rounded-tl-none">
                       <p className="text-xs text-white/70 leading-relaxed">{act.text}</p>
                    </div>
                 )}
                 {act.type === 'join' && (
                    <p className="text-[10px] text-white/30 italic">Bem-vindo à nossa comunidade! 🎉</p>
                 )}
               </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
