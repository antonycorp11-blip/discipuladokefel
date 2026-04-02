import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, ChevronRight, BookOpen, Clock, 
  Share2, Loader2, Star, X
} from "lucide-react";
import { BIBLE_BOOKS, fetchBibleChapter, BibleVerse } from "@/data/bible";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function BibleReader() {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS.find(b => b.id === '1') || BIBLE_BOOKS[0]);
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [selectorStep, setSelectorStep] = useState<'book' | 'chapter' | 'verse'>('book');
  
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  
  // Cronômetro de Luxo e Acumulativo
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const sessionRef = useRef(0);
  const timerId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchBibleChapter(selectedBook.id, chapter);
      setVerses(data);
      setSelectedVerses([]);
      setLoading(false);
    }
    load();
  }, [selectedBook, chapter]);

  useEffect(() => {
    timerId.current = setInterval(() => {
      setSessionSeconds(s => {
        const next = s + 1;
        sessionRef.current = next;
        return next;
      });
    }, 1000);

    return () => {
      if (timerId.current) clearInterval(timerId.current);
      if (sessionRef.current > 2) syncLeitura(sessionRef.current);
    };
  }, []);

  const syncLeitura = async (secs: number) => {
    if (!user) return;
    await supabase.from("kefel_leitura_logs").insert({
      user_id: user.id,
      livro: selectedBook.nome,
      capitulo: chapter,
      tempo_segundos: secs
    });
  };

  const toggleVerse = (vNum: number) => {
    setSelectedVerses(prev => 
      prev.includes(vNum) ? prev.filter(v => v !== vNum) : [...prev, vNum]
    );
  };

  const handleShare = () => {
    const text = verses.filter(v => selectedVerses.includes(v.verse)).map(v => `${v.verse}. ${v.text}`).join('\n');
    const msg = `${selectedBook.nome} ${chapter}\n\n${text}\n\nLido no Kefel App`;
    if (navigator.share) navigator.share({ text: msg });
    else { navigator.clipboard.writeText(msg); alert("Copiado!"); }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
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
            <Clock size={12} className="text-blue-600" />
            <span className="text-[10px] font-black text-blue-600 tabular-nums">{formatTime(sessionSeconds)}</span>
          </div>
          {selectedVerses.length > 0 && (
            <button onClick={handleShare} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg animate-in zoom-in">
              <Share2 size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-10 scroll-smooth">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
             <Loader2 className="animate-spin text-blue-600" />
             <p className="text-[10px] font-black text-gray-400 uppercase italic">Iniciando leitura...</p>
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-8">
            {verses.map(v => (
              <div 
                key={v.verse} id={`v-${v.verse}`} onClick={() => toggleVerse(v.verse)}
                className={`p-4 rounded-[2rem] transition-all duration-300 relative ${selectedVerses.includes(v.verse) ? 'bg-blue-50/80 ring-1 ring-blue-100' : 'active:bg-gray-50'}`}
              >
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-3 pt-1">
                    <span className={`text-[11px] font-black ${selectedVerses.includes(v.verse) ? 'text-blue-600' : 'text-gray-300'}`}>{v.verse}</span>
                    <button onClick={(e) => { e.stopPropagation(); setFavorites(p => p.includes(v.verse) ? p.filter(f => f !== v.verse) : [...p, v.verse]); }} className={favorites.includes(v.verse) ? 'text-amber-500' : 'text-gray-100'}>
                      <Star size={14} fill={favorites.includes(v.verse) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <p className="text-lg font-medium text-gray-800 leading-relaxed tracking-tight">{v.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="p-6 grid grid-cols-2 gap-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
        <button disabled={chapter === 1} onClick={() => setChapter(c => c - 1)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-center disabled:opacity-30"><ChevronLeft className="text-gray-400" /></button>
        <button disabled={chapter >= selectedBook.capitulos} onClick={() => setChapter(c => c + 1)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-center disabled:opacity-30"><ChevronRight className="text-gray-400" /></button>
      </nav>

      {/* Seletor Hierárquico */}
      {showSelector && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end">
          <div className="bg-white w-full h-[85vh] rounded-t-[3rem] p-8 flex flex-col space-y-6 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black italic uppercase underline decoration-blue-600 decoration-4">Biblioteca</h2>
              <button onClick={() => setShowSelector(false)} className="bg-gray-50 p-3 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="flex gap-2 h-1">
              {['book','chapter','verse'].map(s => <div key={s} className={`h-full flex-1 rounded-full ${selectorStep === s ? 'bg-blue-600' : 'bg-gray-100'}`} />)}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pt-2">
              {selectorStep === 'book' && (
                <div className="grid grid-cols-2 gap-3 pb-10">
                  {BIBLE_BOOKS.map(b => (
                    <button key={b.id} onClick={() => { setSelectedBook(b); setSelectorStep('chapter'); }} className={`p-5 rounded-[2rem] text-left border-2 transition-all ${selectedBook.id === b.id ? 'border-blue-600 bg-blue-50' : 'border-transparent bg-gray-50'}`}>
                       <p className="font-black italic uppercase text-[10px] tracking-tighter">{b.nome}</p>
                    </button>
                  ))}
                </div>
              )}
              {selectorStep === 'chapter' && (
                <div className="grid grid-cols-4 gap-3 pb-10">
                  {Array.from({ length: selectedBook.capitulos }, (_, i) => i + 1).map(c => (
                    <button key={c} onClick={() => { setChapter(c); setSelectorStep('verse'); }} className={`p-4 rounded-2xl font-black text-sm ${chapter === c ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>{c}</button>
                  ))}
                </div>
              )}
              {selectorStep === 'verse' && (
                <div className="grid grid-cols-4 gap-3 pb-10">
                  {verses.map(v => (
                    <button key={v.verse} onClick={() => { setShowSelector(false); setTimeout(() => { document.getElementById(`v-${v.verse}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }} className="p-4 bg-gray-50 rounded-2xl font-black text-sm text-gray-400">{v.verse}</button>
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
