import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, ChevronRight, BookOpen, Clock, 
  Settings, Share2, Copy, CheckCircle, Loader2, List
} from "lucide-react";
import { BIBLE_BOOKS, fetchBibleChapter, BibleVerse } from "@/data/bible";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function BibleReader() {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS[0]);
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [copiedVerse, setCopiedVerse] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega o capítulo
  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchBibleChapter(selectedBook.id, chapter);
      setVerses(data);
      setLoading(false);
    }
    load();
  }, [selectedBook, chapter]);

  // Cronômetro de leitura
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setReadingTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Salva o log ao sair ou mudar de capítulo se ler por mais de 10 segundos
      if (readingTime >= 10 && user) {
        saveReadingLog(readingTime);
      }
    };
  }, [selectedBook, chapter, user]);

  const saveReadingLog = async (seconds: number) => {
    await supabase.from("kefel_leitura_logs").insert({
      user_id: user?.id,
      livro: selectedBook.nome,
      capitulo: chapter,
      tempo_segundos: seconds
    });
    setReadingTime(0);
  };

  const handleCopy = (text: string, verseNum: number) => {
    navigator.clipboard.writeText(text);
    setCopiedVerse(verseNum);
    setTimeout(() => setCopiedVerse(null), 2000);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA] pt-14 pb-24 overflow-hidden">
      {/* Header Fixo */}
      <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-gray-100 shadow-sm z-10">
        <button 
          onClick={() => setShowSelector(true)}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-2xl active:scale-95 transition-all shadow-lg"
        >
          <BookOpen size={16} className="text-blue-400" />
          <span className="font-black italic uppercase text-xs tracking-wider">
            {selectedBook.nome} {chapter}
          </span>
        </button>

        <div className="flex items-center gap-3 bg-blue-50 px-3 py-2 rounded-2xl">
          <Clock size={14} className="text-blue-600" />
          <span className="text-[10px] font-black text-blue-600 tabular-nums">
            {formatTime(readingTime)}
          </span>
        </div>
      </header>

      {/* Conteúdo da Bíblia */}
      <div className="flex-1 overflow-y-auto px-6 py-8 select-text">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
             <Loader2 className="animate-spin text-blue-600" size={32} />
             <p className="text-[10px] font-black text-gray-400 uppercase italic">Carregando Escrituras...</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl mx-auto">
            {verses.map((v) => (
              <div 
                key={v.verse} 
                className="group relative animate-in fade-in slide-in-from-bottom-2 duration-500"
                onClick={() => handleCopy(v.text, v.verse)}
              >
                <div className="flex gap-4">
                  <span className="text-[10px] font-black text-blue-600 mt-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                    {v.verse}
                  </span>
                  <p className="text-lg leading-relaxed text-gray-800 font-medium tracking-tight">
                    {v.text}
                  </p>
                </div>
                {copiedVerse === v.verse && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-2 animate-in zoom-in duration-200">
                    <CheckCircle size={10} className="text-green-400" />
                    COPIADO
                  </div>
                )}
              </div>
            ))}
            
            {/* Navegação Rápida entre Capítulos */}
            <div className="pt-10 flex justify-between items-center px-4">
              <button 
                disabled={chapter === 1}
                onClick={() => setChapter(prev => prev - 1)}
                className="p-4 bg-white rounded-2xl shadow-xl disabled:opacity-30 active:scale-90 transition-all border border-gray-100"
              >
                <ChevronLeft className="text-blue-600" />
              </button>
              <p className="text-[10px] font-black text-gray-300 uppercase italic">Fim do Capítulo {chapter}</p>
              <button 
                disabled={chapter >= selectedBook.capitulos}
                onClick={() => setChapter(prev => prev + 1)}
                className="p-4 bg-white rounded-2xl shadow-xl disabled:opacity-30 active:scale-90 transition-all border border-gray-100"
              >
                <ChevronRight className="text-blue-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Seletor de Livro/Capítulo */}
      {showSelector && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end animate-in fade-in duration-300">
          <div className="bg-white w-full h-[85vh] rounded-t-[3rem] p-8 flex flex-col space-y-6 animate-in slide-in-from-bottom duration-500">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter decoration-blue-600 underline decoration-4">Biblioteca</h2>
                <button 
                  onClick={() => setShowSelector(false)}
                  className="bg-gray-100 p-3 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft className="rotate-90" size={20} />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto pr-2 space-y-8">
               {/* Sessão Antigo/Novo Testamento */}
               {['AT', 'NT'].map(t => (
                 <div key={t} className="space-y-4">
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}</h3>
                   <div className="grid grid-cols-2 gap-3">
                     {BIBLE_BOOKS.filter(b => b.testamento === t).map(book => (
                       <button
                         key={book.id}
                         onClick={() => {
                           setSelectedBook(book);
                           setChapter(1);
                           setShowSelector(false);
                         }}
                         className={`p-4 rounded-[1.5rem] text-left transition-all ${selectedBook.id === book.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-gray-50 text-gray-800'}`}
                       >
                         <p className="font-black italic uppercase text-[11px] leading-tight">{book.nome}</p>
                         <p className={`text-[9px] mt-1 ${selectedBook.id === book.id ? 'text-blue-100' : 'text-gray-400'}`}>{book.capitulos} cap.</p>
                       </button>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
