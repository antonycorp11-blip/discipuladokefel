import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ChevronLeft, ChevronRight, BookOpen, Clock, Star, X, Copy, Bookmark
} from "lucide-react";
import { BIBLE_BOOKS, fetchBibleChapter, BibleVerse } from "@/data/bible";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function BibleReader() {
  const { user, showToast, updateReadingTime } = useAuth();
  const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS.find(b => b.id === '1') || BIBLE_BOOKS[0]);
  const [chapter, setChapter] = useState(1);
  const [version, setVersion] = useState<'acf'|'ara'|'nvi'|'ntlh'>('acf');
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [selectorStep, setSelectorStep] = useState<'version' | 'book' | 'chapter' | 'verse'>('book');
  
  const VERSIONS = [
    { id: 'acf', name: 'ACF - Almeida Corrigida' },
    { id: 'ara', name: 'ARA - Almeida Rev. e Atualizada' },
    { id: 'nvi', name: 'NVI - Nova Versão Internacional' },
    { id: 'ntlh', name: 'NTLH - Linguagem de Hoje (A Mensagem)' }
  ];
  
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [highlights, setHighlights] = useState<Record<number, string>>({}); // verse -> color
  const HIGHLIGHT_COLORS = [
    { bg: '#FF9500', label: 'Laranja' },
    { bg: '#FFD60A', label: 'Amarelo' },
    { bg: '#32D74B', label: 'Verde' },
    { bg: '#5AC8FA', label: 'Azul' },
  ];
  
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const sessionRef = useRef(0);
  const timerId = useRef<NodeJS.Timeout|null>(null);
  const userRef = useRef(user);
  const isInitialLoad = useRef(true);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const hideWarning = localStorage.getItem('hideBibleReadingWarning');
    if (!hideWarning) setShowWarning(true);
  }, []);

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
        fetchBibleChapter(selectedBook.id, chapter, version),
        user ? supabase.from("kefel_favoritos").select("versiculo").eq("user_id", user.id).eq("livro", selectedBook.nome).eq("capitulo", chapter) : Promise.resolve({ data: [] })
      ]);
      
      setVerses(bibleData);
      setFavorites(((favsData.data as any[]) || []).map((f: any) => f.versiculo));
      setSelectedVerses([]);
      setLoading(false);
    }
    load();
  }, [selectedBook, chapter, version]);

  // Mantém ref do user sempre atualizada para o cleanup do useEffect
  useEffect(() => { userRef.current = user; }, [user]);

  const syncLeitura = useCallback(async (secs: number) => {
    if (secs <= 0) return;
    try {
      await updateReadingTime(secs, selectedBook.nome, chapter);
    } catch (e) {
      console.error("Erro ao sincronizar leitura", e);
    }
  }, [updateReadingTime, selectedBook.nome, chapter]);

  const syncLeituraRef = useRef(syncLeitura);
  useEffect(() => {
    syncLeituraRef.current = syncLeitura;
  }, [syncLeitura]);

  useEffect(() => {
    timerId.current = setInterval(() => {
      setSessionSeconds(s => { 
        const next = s + 1; 
        sessionRef.current = next; 
        if (next === 600) {
          showToast("🎖️ Parabéns! Meta de 10 minutos de leitura alcançada!", "success");
        }
        return next; 
      });
    }, 1000);

    return () => {
      if (timerId.current) clearInterval(timerId.current);
      if (sessionRef.current > 0) {
        syncLeituraRef.current(sessionRef.current);
        sessionRef.current = 0;
      }
    };
  }, []);

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
      // Computa e sincroniza o tempo do capítulo ao ser concluído
      if (sessionRef.current > 0) {
        await syncLeitura(sessionRef.current);
        setSessionSeconds(0);
        sessionRef.current = 0;
      }

      const chapterId = `${selectedBook.id}_${chapter}`;
      const currentProgress = (user as any).bible_progress || [];
      
      if (!currentProgress.includes(chapterId)) {
        const newProgress = [...currentProgress, chapterId];
        await supabase.from('kefel_profiles').update({ 
          bible_progress: newProgress,
          last_bible_reading: { bookId: selectedBook.id, chapter: chapter }
        }).eq('id', user.id);
        
        showToast("Capítulo concluído! 🏆", "success");
      } else {
        showToast("Capítulo concluído! Tempo da releitura foi computado com sucesso! 🎉", "info");
      }

      // Sempre avança para o próximo capítulo
      if (Number(chapter) < Number(selectedBook.capitulos)) {
        setChapter(c => Number(c) + 1);
        window.scrollTo(0, 0);
      } else {
        showToast("Você terminou este livro! 🎉", "success");
      }
    } catch (err) {
      showToast("Erro ao concluir", "error");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] dark:bg-[#121212] pt-12 pb-20 overflow-hidden">
      {/* Barra superior estilo YouVersion */}
      <header className="px-4 py-3 flex items-center justify-between z-30 border-b border-gray-200 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#121212]">
        <div className="flex gap-2">
          <button onClick={() => { setSelectorStep('book'); setShowSelector(true); }} className="bg-[#E5E5EA] dark:bg-[#2C2C2E] text-gray-900 dark:text-white px-3 py-1.5 rounded-md flex items-center gap-2 active:opacity-70 transition-opacity">
            <span className="text-[14px] font-semibold">{selectedBook.nome} {chapter}</span>
          </button>
          <button onClick={() => { setSelectorStep('version'); setShowSelector(true); }} className="bg-[#E5E5EA] dark:bg-[#2C2C2E] text-gray-900 dark:text-white px-3 py-1.5 rounded-md flex items-center gap-2 active:opacity-70 transition-opacity">
            <span className="text-[14px] font-semibold">{version.toUpperCase()}</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-gray-900 dark:text-white">
          <button className="active:opacity-50"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
          
          <div className="bg-gray-100 dark:bg-[#2C2C2E] px-3 py-1.5 rounded-md flex items-center gap-2">
            <Clock size={12} className="text-gray-900 dark:text-gray-300" />
            <span className="text-[12px] font-bold text-gray-900 dark:text-white tabular-nums">{Math.floor(sessionSeconds/60)}:{(sessionSeconds%60).toString().padStart(2,'0')}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-8 scroll-smooth relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
             <span className="text-[#1B3B6B]">Carregando...</span>
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-4">
             <h1 className="text-[20px] font-bold text-gray-900 dark:text-white mb-6" style={{ fontFamily: "'Lora', 'Merriweather', 'PT Serif', serif" }}>
               {selectedBook.nome} {chapter}
             </h1>
             
             <div className="text-[19px] leading-[1.8] text-gray-900 dark:text-gray-200" style={{ fontFamily: "'Lora', 'Merriweather', 'PT Serif', serif" }}>
               {verses.map((v, i) => (
                 <span 
                   key={v.verse} 
                   id={`v-${v.verse}`} 
                   onClick={() => toggleVerse(v.verse)} 
                   className={`inline rounded-sm break-words cursor-pointer transition-colors`}
                   style={{
                     backgroundColor: selectedVerses.includes(v.verse) 
                       ? 'rgba(90, 120, 200, 0.3)' 
                       : highlights[v.verse] 
                         ? highlights[v.verse] + '55'
                         : undefined
                   }}
                 >
                    <sup 
                       className={`text-[11px] font-bold mr-1 ml-2 ${favorites.includes(v.verse) ? 'text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                      {v.verse}
                    </sup>
                    {v.text}{' '}
                 </span>
               ))}
             </div>

             <div className="pt-16 pb-24 text-center">
                 <button onClick={handleFinishChapter} className="mx-auto border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white px-6 py-2.5 rounded-full font-bold text-[13px] active:bg-gray-100 dark:active:bg-white/10 transition-colors">
                     ✔ Concluir Capítulo
                 </button>
             </div>
           </div>
         )}
      </div>

      {selectedVerses.length > 0 && (
        <>
          {/* Header contextual com versículo selecionado - exato YouVersion */}
          <div className="fixed top-0 left-0 right-0 z-[100] bg-[#1C1C1E] border-b border-white/5 shadow-md fade-in animate-in">
            <div className="flex items-center justify-between px-4 py-4 pt-safe">
              <span className="text-white/80 text-[14px] font-bold tracking-tight">
                {selectedBook.nome} {chapter}:{selectedVerses.join(',')}
              </span>
              <button onClick={() => setSelectedVerses([])} className="text-white/50 p-2 bg-white/5 rounded-full active:scale-95 transition-transform">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Submenu flutuante de ações (Acima da tab bar do app) */}
          <div className="fixed bottom-[85px] left-3 right-3 bg-[#1C1C1E] border border-white/10 z-[100] rounded-[1.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-5 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              {/* Cores de destaque */}
              <div className="flex items-center gap-2.5">
                {HIGHLIGHT_COLORS.map(c => (
                  <button
                    key={c.bg}
                    onClick={() => {
                      setHighlights(prev => {
                        const next = { ...prev };
                        selectedVerses.forEach(v => {
                          if (next[v] === c.bg) delete next[v];
                          else next[v] = c.bg;
                        });
                        return next;
                      });
                    }}
                    className="w-10 h-10 rounded-full active:scale-90 transition-transform shadow-lg border-[1.5px] border-white/10"
                    style={{ backgroundColor: c.bg }}
                  />
                ))}
              </div>
              {/* Ações estendidas */}
              <div className="flex items-center gap-4 border-l border-white/10 pl-4">
                <button
                  onClick={async () => {
                    const targetVerses = verses.filter(v => selectedVerses.includes(v.verse));
                    for (const v of targetVerses) await toggleFavorite(v);
                    setSelectedVerses([]);
                  }}
                  className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
                >
                  <Bookmark size={22} className={selectedVerses.some(v => favorites.includes(v)) ? 'text-amber-400 fill-amber-400' : 'text-white/80'} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/50 mt-1">Salvar</span>
                </button>
                <button
                  onClick={() => {
                    const text = verses.filter(v => selectedVerses.includes(v.verse)).map(v => `${v.verse} ${v.text}`).join(' ');
                    const msg = `${selectedBook.nome} ${chapter}\n\n${text}\n\nKefel App`;
                    if (navigator.share) navigator.share({ text: msg });
                    else { navigator.clipboard.writeText(msg); showToast('Copiado!', 'info'); }
                    setSelectedVerses([]);
                  }}
                  className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
                >
                  <Copy size={22} className="text-white/80" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/50 mt-1">Copiar</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Basic Nav block */}
      {!selectedVerses.length && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-white/5 p-4 z-40 pb-safe">
           <button disabled={chapter === 1} onClick={() => setChapter(c => c > 1 ? c - 1 : c)} className="p-3 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-900 dark:text-white disabled:opacity-30">
              <ChevronLeft size={20} />
           </button>
           <button disabled={chapter >= selectedBook.capitulos} onClick={() => setChapter(c => c < selectedBook.capitulos ? c + 1 : c)} className="p-3 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-900 dark:text-white disabled:opacity-30">
              <ChevronRight size={20} />
           </button>
        </div>
      )}

      {showSelector && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end">
          <div className="bg-white dark:bg-slate-900 w-full h-[85vh] rounded-t-[3rem] p-8 flex flex-col space-y-6 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold italic uppercase underline decoration-blue-600 decoration-4 dark:text-white">Bíblia</h2>
              <button onClick={() => setShowSelector(false)} className="bg-gray-100 dark:bg-slate-800 p-3 rounded-full"><X size={20} className="dark:text-white" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 pb-10">
              {selectorStep === 'version' && (
                <div className="flex flex-col gap-3">
                  {VERSIONS.map(v => (
                    <button key={v.id} onClick={() => { setVersion(v.id as any); setSelectorStep('book'); }} className={`p-5 rounded-[2rem] text-left border-2 transition-all ${version === v.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-transparent bg-gray-50 dark:bg-slate-800'}`}>
                       <p className="font-bold uppercase text-xs dark:text-white">{v.name}</p>
                    </button>
                  ))}
                </div>
              )}
              {selectorStep === 'book' && (
                <div className="flex flex-col">
                  {BIBLE_BOOKS.map(b => (
                    <button key={b.id} onClick={() => { setSelectedBook(b); setSelectorStep('chapter'); }} className={`py-4 px-2 text-left border-b border-gray-100 dark:border-white/5 transition-all ${selectedBook.id === b.id ? 'text-[#1B3B6B] dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-gray-300 font-medium'}`}>
                       <p className="text-[16px] leading-tight">{b.nome}</p>
                    </button>
                  ))}
                </div>
              )}
              {selectorStep === 'chapter' && (
                <div className="grid grid-cols-5 gap-3">
                  {Array.from({ length: selectedBook.capitulos }, (_, i) => i + 1).map(c => (
                    <button key={c} onClick={() => { setChapter(c); setShowSelector(false); }} className={`p-4 rounded-xl font-bold text-sm ${chapter === c ? 'bg-[#1B3B6B] text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white'}`}>{c}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showWarning && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 flex flex-col items-center text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-[#1B3B6B]/10 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
              <Clock className="text-[#1B3B6B] dark:text-blue-400" size={32} />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-2">Tempo de Leitura</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-8 leading-relaxed">
              Seu tempo de leitura só será contabilizado e salvo no ranking ao final do capítulo, quando você pressionar o botão <strong>"Concluir Capítulo"</strong>.
            </p>
            <div className="w-full space-y-3">
              <button 
                onClick={() => setShowWarning(false)} 
                className="w-full bg-[#1B3B6B] dark:bg-blue-600 text-white p-4 rounded-2xl font-bold uppercase text-sm tracking-widest active:scale-95 transition-all"
              >
                Entendi
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('hideBibleReadingWarning', 'true');
                  setShowWarning(false);
                }} 
                className="w-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 p-4 rounded-2xl font-bold uppercase text-xs tracking-widest active:scale-95 transition-all"
              >
                Não mostrar novamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
