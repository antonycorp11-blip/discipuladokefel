import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, ChevronRight, BookOpen, Clock, 
  Share2, Loader2, Star, X, CheckCircle2
} from "lucide-react";
import { BIBLE_BOOKS, fetchBibleChapter, BibleVerse } from "@/data/bible";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function BibleReader() {
  const { user, showToast } = useAuth();
  const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS.find(b => b.id === '1') || BIBLE_BOOKS[0]);
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [selectorStep, setSelectorStep] = useState<'book' | 'chapter' | 'verse'>('book');
  
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const sessionRef = useRef(0);
  const timerId = useRef<NodeJS.Timeout|null>(null);
  const isInitialLoad = useRef(true);

  // Carrega posição inicial do usuário
  useEffect(() => {
    if (user?.last_bible_reading && isInitialLoad.current) {
        const { bookId, chapter: savedChapter } = user.last_bible_reading as { bookId: string, chapter: number };
        const book = BIBLE_BOOKS.find(b => b.id === bookId);
        if (book) setSelectedBook(book);
        if (savedChapter) setChapter(savedChapter);
        
        // Pequeno delay para garantir que o estado do capítulo foi refletido antes de liberar o salvamento
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 1000);
    } else if (user && !user.last_bible_reading) {
      isInitialLoad.current = false;
    }
  }, [user?.id]);

  // Salva posição sempre que mudar (APENAS após o load inicial)
  useEffect(() => {
    if (!user || isInitialLoad.current) return;
    
    const saveProgress = async () => {
        console.log("Salvando progresso da Bíblia:", selectedBook.nome, chapter);
        await supabase
            .from("kefel_profiles")
            .update({ 
                last_bible_reading: { bookId: selectedBook.id, chapter: chapter } 
            })
            .eq("id", user.id);
    };
    saveProgress();
  }, [selectedBook.id, chapter, user?.id]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [bibleData, favsData] = await Promise.all([
        fetchBibleChapter(selectedBook.id, chapter),
        user ? supabase.from("kefel_favoritos").select("versiculo").eq("user_id", user.id).eq("livro", selectedBook.nome).eq("capitulo", chapter) : Promise.resolve({ data: [] })
      ]);
      
      setVerses(bibleData);
      setFavorites(((favsData.data as any[]) || []).map((f: any) => f.versiculo));
      setSelectedVerses([]);
      setLoading(false);
    }
    load();
  }, [selectedBook, chapter]);

  useEffect(() => {
    // Sincroniza a cada 10 segundos para maior precisão (feedback do usuário)
    timerId.current = setInterval(() => {
      setSessionSeconds(s => {
        const next = s + 1;
        sessionRef.current = next;
        if (next % 10 === 0) syncLeitura(10); 
        return next;
      });
    }, 1000);

    return () => {
      if (timerId.current) clearInterval(timerId.current);
      // Salva o tempo restante
      const remaining = sessionRef.current % 10;
      if (remaining > 0) syncLeitura(remaining);
    };
  }, []);

  const syncLeitura = async (secs: number) => {
    if (!user) return;
    
    // Log detalhado da leitura
    await supabase.from("kefel_leitura_logs").insert({
      user_id: user.id,
      livro: selectedBook.nome,
      capitulo: chapter,
      tempo_segundos: secs
    });

    // Atualiza o tempo total do perfil via RPC (agora que a função existe)
    await supabase.rpc('increment_reading_time', { 
      row_id: user.id, 
      increment_by: secs 
    });
  };

  const toggleVerse = (vNum: number) => {
    setSelectedVerses(prev => 
      prev.includes(vNum) ? prev.filter(v => v !== vNum) : [...prev, vNum]
    );
  };

  const toggleFavorite = async (v: BibleVerse) => {
    if (!user) return;
    const isFav = favorites.includes(v.verse);
    
    // Otimista
    setFavorites(prev => isFav ? prev.filter(f => f !== v.verse) : [...prev, v.verse]);

    try {
      if (isFav) {
        const { error } = await supabase.from("kefel_favoritos").delete().eq("user_id", user.id).eq("livro", selectedBook.nome).eq("capitulo", chapter).eq("versiculo", v.verse);
        if (error) throw error;
        showToast("Removido dos favoritos");
      } else {
        const { error } = await supabase.from("kefel_favoritos").insert({
          user_id: user.id,
          livro: selectedBook.nome,
          capitulo: chapter,
          versiculo: v.verse,
          texto: v.text
        });
        if (error) throw error;
        showToast("Versículo favoritado!");
      }
    } catch (error: any) {
      console.error("Erro ao favoritar:", error);
      showToast("Não foi possível salvar favorito", "error");
      // Reverter estado se falhar
      setFavorites(prev => isFav ? [...prev, v.verse] : prev.filter(f => f !== v.verse));
    }
  };

  const handleFinishChapter = async () => {
    if (!user) return;
    
    try {
      const chapterId = `${selectedBook.id}_${chapter}`;
      const currentProgress = (user as any).bible_progress || [];
      
      if (!currentProgress.includes(chapterId)) {
        const newProgress = [...currentProgress, chapterId];
        await supabase.from('kefel_profiles').update({ 
          bible_progress: newProgress,
          last_bible_reading: { bookId: selectedBook.id, chapter: chapter }
        }).eq('id', user.id);
        
        showToast("Capítulo concluído! 🏆", "success");
        
        // Se houver próximo capítulo, vai para ele
        if (chapter < selectedBook.capitulos) {
          setChapter(c => c + 1);
          window.scrollTo(0, 0);
        } else {
          showToast("Você terminou este livro! 🎉");
        }
      } else {
        showToast("Capítulo já lido", "info");
      }
    } catch (err) {
      showToast("Erro ao concluir", "error");
    }
  };

  const shareSelected = () => {
    const text = verses.filter(v => selectedVerses.includes(v.verse)).map(v => `${v.verse}. ${v.text}`).join('\n');
    const msg = `${selectedBook.nome} ${chapter}\n\n${text}\n\nLido no Kefel App`;
    if (navigator.share) navigator.share({ text: msg });
    else { navigator.clipboard.writeText(msg); showToast("Copiado!", "info"); }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFD] pt-14 pb-24 overflow-hidden">
      <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-gray-100 shadow-sm z-30">
        <button onClick={() => { setSelectorStep('book'); setShowSelector(true); }} className="bg-black text-white px-4 py-2 rounded-2xl flex items-center gap-2 active:scale-95 transition-transform shadow-xl">
          <BookOpen size={14} className="text-blue-400" />
          <span className="text-[10px] font-black uppercase italic tracking-widest">{selectedBook.nome} {chapter}</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-blue-50 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Clock size={12} className="text-[#1B3B6B]" />
            <span className="text-[10px] font-black text-[#1B3B6B] tabular-nums">{Math.floor(sessionSeconds/60)}:{(sessionSeconds%60).toString().padStart(2,'0')}</span>
          </div>
          {selectedVerses.length > 0 && (
            <button onClick={shareSelected} className="bg-[#1B3B6B] text-white p-2.5 rounded-xl shadow-lg animate-in zoom-in">
              <Share2 size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 scroll-smooth">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
             <Loader2 className="animate-spin text-[#1B3B6B]" />
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-4">
             {verses.map(v => (
              <div key={v.verse} id={`v-${v.verse}`} className={`p-4 rounded-3xl transition-all ${selectedVerses.includes(v.verse) ? 'bg-blue-50/50 ring-1 ring-blue-100' : 'active:bg-gray-50'}`}>
                <div className="flex gap-4">
                   <div className="flex flex-col items-center gap-3">
                      <span className="text-xs font-black text-gray-300 h-5 flex items-center justify-center">{v.verse}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(v); }} 
                        className={`p-2 rounded-xl transition-soft ${favorites.includes(v.verse) ? 'bg-amber-100 text-amber-500 scale-110 shadow-sm' : 'bg-gray-50 text-gray-200'}`}
                      >
                        <Star size={14} fill={favorites.includes(v.verse) ? "currentColor" : "none"} />
                      </button>
                   </div>
                   <p onClick={() => toggleVerse(v.verse)} className="text-lg text-gray-800 leading-relaxed tracking-tight flex-1">{v.text}</p>
                </div>
              </div>
            ))}

            {/* BOTÃO CONCLUIR CAPÍTULO */}
            <div className="pt-10 pb-20">
               <button 
                 onClick={handleFinishChapter}
                 className="w-full bg-black text-white p-8 rounded-[2.5rem] shadow-premium shadow-black/20 flex flex-col items-center gap-4 group active:scale-95 transition-soft"
               >
                 <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-soft">
                    <CheckCircle2 className="text-blue-400" size={32} />
                 </div>
                 <div className="text-center">
                    <p className="text-xl font-black italic uppercase tracking-tighter">Concluir Capítulo</p>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Marcar progresso na Bíblia</p>
                 </div>
               </button>
            </div>
          </div>
        )}
      </div>

      <nav className="p-6 grid grid-cols-2 gap-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
        <button disabled={chapter === 1} onClick={() => setChapter(c => c - 1)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-center"><ChevronLeft className="text-gray-400" /></button>
        <button disabled={chapter >= selectedBook.capitulos} onClick={() => setChapter(c => c + 1)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-center"><ChevronRight className="text-gray-400" /></button>
      </nav>

      {showSelector && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end">
          <div className="bg-white w-full h-[85vh] rounded-t-[3rem] p-8 flex flex-col space-y-6 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold italic uppercase underline decoration-blue-600 decoration-4">Bíblia</h2>
              <button onClick={() => setShowSelector(false)} className="bg-gray-100 p-3 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 pb-10">
              {selectorStep === 'book' && (
                <div className="grid grid-cols-2 gap-3">
                  {BIBLE_BOOKS.map(b => (
                    <button key={b.id} onClick={() => { setSelectedBook(b); setSelectorStep('chapter'); }} className={`p-5 rounded-[2rem] text-left border-2 transition-all ${selectedBook.id === b.id ? 'border-blue-600 bg-blue-50' : 'border-transparent bg-gray-50'}`}>
                       <p className="font-bold italic uppercase text-[10px]">{b.nome}</p>
                    </button>
                  ))}
                </div>
              )}
              {selectorStep === 'chapter' && (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: selectedBook.capitulos }, (_, i) => i + 1).map(c => (
                    <button key={c} onClick={() => { setChapter(c); setSelectorStep('verse'); }} className={`p-4 rounded-2xl font-bold text-sm ${chapter === c ? 'bg-[#1B3B6B] text-white' : 'bg-gray-50 text-gray-400'}`}>{c}</button>
                  ))}
                </div>
              )}
              {selectorStep === 'verse' && (
                <div className="grid grid-cols-4 gap-3">
                  {verses.map(v => (
                    <button key={v.verse} onClick={() => { setShowSelector(false); setTimeout(() => { document.getElementById(`v-${v.verse}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }} className="p-4 bg-gray-50 rounded-2xl font-bold text-sm text-gray-400">{v.verse}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
