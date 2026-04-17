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
  const [topCells, setTopCells] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedItems, setLikedItems] = useState<string[]>([]); // Array de item_ids curtidos pelo user atual
  const [interactions, setInteractions] = useState<any[]>([]); // Todas interações para contagem

  const { user, showToast } = useAuth();

  const toggleLike = async (itemId: string, itemType: string, interactionType: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;

    const isLiked = likedItems.includes(itemId);
    
    // Otimista
    if (isLiked) {
      setLikedItems(prev => prev.filter(i => i !== itemId));
    } else {
      setLikedItems(prev => [...prev, itemId]);
    }

    try {
      if (isLiked) {
        await supabase.from("kefel_feed_interactions")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", itemId)
          .eq("interaction_type", interactionType);
      } else {
        await supabase.from("kefel_feed_interactions")
          .insert({
            user_id: user.id,
            item_id: itemId,
            item_type: itemType,
            interaction_type: interactionType
          });
      }
      fetchInteractions();
    } catch (err) {
      console.error("Erro ao interagir:", err);
    }
  };

  async function fetchInteractions() {
    const { data } = await supabase.from("kefel_feed_interactions").select("*");
    setInteractions(data || []);
    if (user) {
      setLikedItems((data || []).filter((i: any) => i.user_id === user.id).map((i: any) => i.item_id));
    }
  }

  useEffect(() => {
    fetchSocialData();
  }, []);

  const getSundayOfCurrentWeek = () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return sevenDaysAgo.toISOString();
  };

  async function fetchSocialData() {
    setLoading(true);
    try {
      const sunday = getSundayOfCurrentWeek();

      const [profilesRes, favoritesRes, logsRes, oracaoRes, celulasRes] = await Promise.all([
        supabase.from("kefel_profiles").select("id, nome, avatar_url, created_at, celula_id"),
        supabase.from("kefel_favoritos").select("id, user_id, livro, capitulo, versiculo, texto, created_at, profile:user_id(nome, avatar_url)").order("created_at", { ascending: false }).limit(15),
        supabase.from("kefel_leitura_logs").select("user_id, tempo_segundos").gte("created_at", sunday),
        supabase.from("kefel_oracao").select("id, user_id, texto, created_at, profile:user_id(nome, avatar_url)").order("created_at", { ascending: false }).limit(10),
        supabase.from("kefel_celulas").select("*")
      ]);

      fetchInteractions();

      const snapshots: any[] = [
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

      const profilesList = (profilesRes.data as any[]) || [];
      const logsList = (logsRes.data as any[]) || [];
      const celulas = (celulasRes.data as any[]) || [];

      const userTimes: Record<string, number> = {};
      logsList.forEach(log => {
        userTimes[log.user_id] = (userTimes[log.user_id] || 0) + Number(log.tempo_segundos || 0);
      });

      const topWeeklyReaders = profilesList
        .filter(p => userTimes[p.id] && userTimes[p.id] > 0)
        .map(p => ({
          id: p.id,
          nome: p.nome,
          avatar_url: p.avatar_url,
          tempo_leitura_total: userTimes[p.id] || 0
        }))
        .sort((a, b) => b.tempo_leitura_total - a.tempo_leitura_total)
        .slice(0, 3);

      // Top Células
      const cellTimes: Record<string, number> = {};
      profilesList.forEach(p => {
        if (p.celula_id && userTimes[p.id]) {
          cellTimes[p.celula_id] = (cellTimes[p.celula_id] || 0) + userTimes[p.id];
        }
      });

      const topWeeklyCells = celulas
        .map(c => ({
          id: c.id,
          nome: c.nome,
          imagem_url: c.imagem_url,
          tempoTotal: cellTimes[c.id] || 0
        }))
        .filter(c => c.tempoTotal > 0)
        .sort((a, b) => b.tempoTotal - a.tempoTotal)
        .slice(0, 3);

      setActivities(snapshots);
      setTopReaders(topWeeklyReaders);
      setTopCells(topWeeklyCells);
    } catch (err) {
      console.error("Erro social feed:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#1B3B6B]" /></div>;

  return (
    <div className="space-y-10 mb-20 px-5">
      {/* Highlights Toggle */}
      <section>
        <div className="flex items-center gap-2 mb-5">
           <div className="w-2 h-5 bg-amber-400 rounded-full" />
           <h2 className="text-base font-bold text-white tracking-tight">Destaques da Semana</h2>
        </div>
        
        {/* Readers */}
        <div className="flex justify-between items-end gap-3 py-4 mb-4">
           {topReaders.length > 0 ? topReaders.map((reader, index) => (
             <Link to={`/perfil/${reader.id}`} key={reader.id} className="flex-1">
               <motion.div 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: index * 0.1 }}
                 className={`bg-[#1C1C1E] p-4 rounded-[20px] flex flex-col items-center justify-center relative ${index === 0 ? 'ring-1 ring-amber-500/50 scale-110' : 'scale-95 opacity-80'}`}
               >
                  {index === 0 && <Star className="absolute -top-3 text-amber-400 fill-amber-400" size={18} />}
                  <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center bg-[#2C2C2E] mb-2 border border-white/5">
                    {reader.avatar_url ? <img src={reader.avatar_url} className="w-full h-full object-cover" /> : <UserCircle className="text-gray-600" size={24} />}
                  </div>
                  <p className="text-[9px] font-black text-white text-center truncate w-full uppercase italic">{reader.nome.split(' ')[0]}</p>
                  <p className="text-[8px] font-bold text-amber-500 mt-0.5">{Math.floor(reader.tempo_leitura_total / 60)}m</p>
               </motion.div>
             </Link>
           )) : <p className="text-[10px] text-white/20 italic text-center w-full py-4">Nenhuma leitura ainda...</p>}
        </div>

        {/* Cells */}
        <div className="flex justify-between items-end gap-3 py-4 border-t border-white/5">
           {topCells.length > 0 ? topCells.map((cell, index) => (
             <div key={cell.id} className="flex-1 opacity-80 scale-95">
               <motion.div 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: index * 0.1 + 0.3 }}
                 className="bg-[#1C1C1E] p-4 rounded-[20px] flex flex-col items-center justify-center"
               >
                  <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center bg-[#2C2C2E] mb-2 border border-blue-500/20">
                    {cell.imagem_url ? <img src={cell.imagem_url} className="w-full h-full object-cover" /> : <Users className="text-gray-600" size={24} />}
                  </div>
                  <p className="text-[9px] font-black text-white text-center truncate w-full uppercase italic">{cell.nome}</p>
                  <p className="text-[8px] font-bold text-blue-400 mt-0.5">{Math.floor(cell.tempoTotal / 60)}m</p>
               </motion.div>
             </div>
           )) : null}
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
                       <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                         <button 
                           onClick={(e) => toggleLike(act.id, 'favorite', 'like', e)}
                           className={`flex items-center gap-1.5 active:scale-95 transition-all text-[10px] font-bold uppercase ${likedItems.includes(act.id) ? 'text-rose-400' : 'text-white/40 hover:text-rose-400'}`}
                         >
                           <Heart size={12} className={likedItems.includes(act.id) ? "fill-rose-400" : ""} />
                           <span className="tabular-nums">{interactions.filter(i => i.item_id === act.id && i.interaction_type === 'like').length || ''}</span>
                           {likedItems.includes(act.id) ? 'Curtiu' : 'Curtir'}
                         </button>
                       </div>
                    </div>
                 )}
                 {act.type === 'oracao' && (
                    <div className="bg-[#1C1C1E] border border-purple-500/20 p-3 rounded-2xl rounded-tl-none">
                       <p className="text-xs text-white/70 leading-relaxed">{act.text}</p>
                       <div className="flex items-center gap-4 mt-3 pt-3 border-t border-purple-500/10">
                         <button 
                           onClick={(e) => toggleLike(act.id, 'oracao', 'prayer', e)}
                           className={`flex items-center gap-1.5 active:scale-95 transition-all text-[10px] font-bold uppercase ${likedItems.includes(act.id) ? 'text-purple-400' : 'text-white/40 hover:text-purple-400'}`}
                         >
                           <HandMetal size={12} className={likedItems.includes(act.id) ? "fill-purple-400" : ""} />
                           <span className="tabular-nums">{interactions.filter(i => i.item_id === act.id && i.interaction_type === 'prayer').length || ''}</span>
                           {likedItems.includes(act.id) ? 'Orando' : 'Estou orando'}
                         </button>
                       </div>
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
