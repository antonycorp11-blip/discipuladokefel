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
  
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const sessionRef = useRef(0);
  const timerId = useRef<NodeJS.Timeout|null>(null);

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
        if (next % 3 === 0) syncLeitura(3); 
        return next;
      });
    }, 1000);

    return () => {
      if (timerId.current) clearInterval(timerId.current);
      const remaining = sessionRef.current % 3;
      if (remaining > 0) syncLeitura(remaining);
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
    await supabase.rpc('increment_reading_time', { row_id: user.id, increment_by: secs });
  };

  const toggleVerse = (vNum: number) => {
    setSelectedVerses(prev => 
      prev.includes(vNum) ? prev.filter(v => v !== vNum) : [...prev, vNum]
    );
  };

  const shareSelected = () => {
    const text = verses.filter(v => selectedVerses.includes(v.verse)).map(v => `${v.verse}. ${v.text}`).join('\n');
    const msg = `${selectedBook.nome} ${chapter}\n\n${text}\n\nLido no Kefel App`;
    if (navigator.share) navigator.share({ text: msg });
    else { navigator.clipboard.writeText(msg); alert("Copiado!"); }
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
            <span className="text-[10px] font-black text-blue-600 tabular-nums">{Math.floor(sessionSeconds/60)}:{(sessionSeconds%60).toString().padStart(2,'0')}</span>
          </div>
          {selectedVerses.length > 0 && (
            <button onClick={shareSelected} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg animate-in zoom-in">
              <Share2 size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 scroll-smooth">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
             <Loader2 className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-4">
            {verses.map(v => (
              <div key={v.verse} id={`v-${v.verse}`} onClick={() => toggleVerse(v.verse)} className={`p-4 rounded-2xl transition-all ${selectedVerses.includes(v.verse) ? 'bg-blue-50 ring-1 ring-blue-100' : 'active:bg-gray-50'}`}>
                <div className="flex gap-4">
                   <span className="text-xs font-black mt-1 text-gray-300">{v.verse}</span>
                   <p className="text-lg text-gray-800 leading-relaxed tracking-tight">{v.text}</p>
                </div>
              </div>
            ))}
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
                    <button key={c} onClick={() => { setChapter(c); setSelectorStep('verse'); }} className={`p-4 rounded-2xl font-bold text-sm ${chapter === c ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>{c}</button>
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
