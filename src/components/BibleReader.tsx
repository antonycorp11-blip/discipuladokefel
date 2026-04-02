import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Book, ChevronLeft, ChevronRight, Share2, Search, X, 
  BookOpen, Loader2, Clock, CheckCircle2, Star, ChevronDown, Edit2, Trash2, Upload
} from "lucide-react";
import { BIBLE_BOOKS, fetchBibleChapter, type BibleVerse, type BibleBook } from "@/data/bible";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface BibleReaderProps {
  onFinish?: (seconds: number, book: string, chapter: number) => void;
}

function ReadingComplete({
  seconds,
  book,
  chapter,
  onContinue,
  onHome,
}: {
  seconds: number;
  book: string;
  chapter: number;
  onContinue: () => void;
  onHome: () => void;
}) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;

  const timeLabel = hrs > 0
    ? `${hrs}h ${remMins}m ${secs}s`
    : mins > 0
    ? `${mins}m ${secs}s`
    : `${secs}s`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center space-y-8 animate-in fade-in duration-700 pt-10">
      <div className="relative">
        <div className="w-28 h-28 bg-blue-50 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-14 h-14 text-blue-600" />
        </div>
        <div className="absolute -top-2 -right-2">
          <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black text-gray-900 tracking-tighter italic uppercase">Leitura Concluída!</h1>
        <p className="text-gray-600 font-medium">{book}, Capítulo {chapter}</p>
      </div>

      <div className="bg-white border border-gray-100 shadow-2xl rounded-[2.5rem] p-8 w-full space-y-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tempo de Leitura</p>
        <p className="text-5xl font-black text-blue-600 tracking-tighter italic">{timeLabel}</p>
        <p className="text-gray-400 text-xs mt-2 font-bold uppercase tracking-widest">Salvo no seu progresso ✓</p>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={onContinue}
          className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all text-sm uppercase tracking-widest"
        >
          Próximo Capítulo
        </button>
        <button
          onClick={onHome}
          className="w-full bg-gray-100 text-gray-600 py-5 rounded-2xl font-black active:scale-95 transition-all text-sm uppercase tracking-widest"
        >
          Voltar ao Início
        </button>
      </div>
    </div>
  );
}

export function BibleReader({ onFinish }: BibleReaderProps) {
  const { user } = useAuth();
  
  const [selectedBook, setSelectedBook] = useState<BibleBook>(BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [finished, setFinished] = useState(false);
  const [finishedData, setFinishedData] = useState<{ seconds: number; book: string; chapter: number } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && !finished) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, finished]);

  const loadChapter = useCallback(async (book: BibleBook, chapter: number) => {
    setLoading(true);
    setError(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    const data = await fetchBibleChapter(book.id, chapter);
    if (data.length === 0) {
      setError("Conteúdo de 1 Reis em diante está sendo sincronizado no momento.");
    }
    setVerses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadChapter(selectedBook, selectedChapter);
  }, [selectedBook, selectedChapter, loadChapter]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleShare = async (verse: BibleVerse) => {
    const text = `"${verse.text}"\n— ${selectedBook.nome} ${selectedChapter}:${verse.verse}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Versículo', text }); } catch (e) {}
    } else {
      navigator.clipboard.writeText(text);
      alert("Texto copiado!");
    }
  };

  const handleFinish = async () => {
    setIsActive(false);
    const readSeconds = seconds;
    const book = selectedBook.nome;
    const chapter = selectedChapter;

    if (user && readSeconds > 10) {
      await supabase.from("kefel_leitura_logs").insert({
        user_id: user.id,
        book_id: selectedBook.id,
        capitulo: selectedChapter,
        segundos: readSeconds
      });
    }

    setFinishedData({ seconds: readSeconds, book, chapter });
    setFinished(true);
  };

  const filteredBooks = BIBLE_BOOKS.filter(b => 
    b.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.abrev.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const atBooks = filteredBooks.filter(b => b.testamento === 'AT');
  const ntBooks = filteredBooks.filter(b => b.testamento === 'NT');

  if (finished && finishedData) {
    return (
      <ReadingComplete 
        seconds={finishedData.seconds} 
        book={finishedData.book} 
        chapter={finishedData.chapter} 
        onContinue={() => {
          setFinished(false);
          setSeconds(0);
          setIsActive(true);
          const idx = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
          if (selectedChapter < selectedBook.capitulos) {
            setSelectedChapter(c => c + 1);
          } else if (idx < BIBLE_BOOKS.length - 1) {
            setSelectedBook(BIBLE_BOOKS[idx+1]);
            setSelectedChapter(1);
          }
        }}
        onHome={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="flex flex-col bg-[#FDFDFD] pt-14" style={{ height: "calc(100dvh - 80px)" }}>
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 px-4 pt-2 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowBookSelector(true)}
            className="flex-1 flex items-center gap-2 bg-blue-600 text-white px-4 py-3.5 rounded-2xl font-black text-xs shadow-xl shadow-blue-100 active:scale-95 transition-all italic uppercase"
          >
            <BookOpen className="w-4 h-4" />
            <span className="truncate">{selectedBook.nome}</span>
            <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
          </button>

          <button
            onClick={() => setShowChapterSelector(true)}
            className="bg-gray-100 text-gray-900 px-5 py-3.5 rounded-2xl font-black text-xs flex items-center gap-1 active:scale-95 transition-all"
          >
            {selectedChapter}
            <ChevronDown className="w-4 h-4 opacity-30" />
          </button>

          <div className="bg-black text-white px-4 py-3.5 rounded-2xl font-mono font-black text-[10px] flex items-center gap-1.5 shadow-xl">
             <Clock className="w-3.5 h-3.5 text-blue-400" />
             {formatTime(seconds)}
          </div>
        </div>
        
        <div className="flex items-center justify-between px-1">
          <button onClick={() => {
             if (selectedChapter > 1) setSelectedChapter(c => c - 1);
             else {
               const idx = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
               if (idx > 0) {
                 setSelectedBook(BIBLE_BOOKS[idx-1]);
                 setSelectedChapter(BIBLE_BOOKS[idx-1].capitulos);
               }
             }
          }} className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <ChevronLeft size={14} /> Anterior
          </button>
          <div className="h-1 flex-1 mx-4 bg-gray-50 rounded-full">
             <div className="h-full bg-blue-600" style={{ width: `${(selectedChapter / selectedBook.capitulos) * 100}%` }} />
          </div>
          <button onClick={() => {
             if (selectedChapter < selectedBook.capitulos) setSelectedChapter(c => c + 1);
             else {
               const idx = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
               if (idx < BIBLE_BOOKS.length - 1) {
                 setSelectedBook(BIBLE_BOOKS[idx+1]);
                 setSelectedChapter(1);
               }
             }
          }} className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Próximo <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 pb-40 select-text">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Ceu Aberto...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 px-6 space-y-4">
             <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">{error}</p>
             <button onClick={() => loadChapter(selectedBook, selectedChapter)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 uppercase text-[10px]">Tentar novamente</button>
          </div>
        ) : (
          <div className="space-y-8 pb-32">
            {verses.map((v) => (
              <div key={v.verse} className="group relative animate-in fade-in slide-in-from-bottom-1 duration-500">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-[10px] font-black text-blue-600">{v.verse}</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-50 to-transparent" />
                  <button onClick={() => handleShare(v)} className="p-2 text-gray-200">
                    <Share2 size={16} />
                  </button>
                </div>
                <p className="text-gray-800 text-[19px] leading-[1.8] font-medium tracking-tight px-1">{v.text}</p>
              </div>
            ))}
            <button onClick={handleFinish} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em] italic">
              Concluir este capítulo
            </button>
          </div>
        )}
      </div>

      {showBookSelector && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg h-[80vh] rounded-[3rem] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-50 space-y-4 pt-10">
               <div className="flex items-center justify-between">
                 <h3 className="text-xl font-black text-gray-900 italic uppercase">BÍBLIA SAGRADA</h3>
                 <button onClick={() => setShowBookSelector(false)} className="p-3 bg-gray-50 rounded-full font-bold">X</button>
               </div>
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                 <input type="text" placeholder="Pesquisar..." className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl font-bold" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {[
                { title: "Antigo Testamento", books: atBooks, color: "text-blue-600" },
                { title: "Novo Testamento", books: ntBooks, color: "text-purple-600" }
              ].map(group => group.books.length > 0 && (
                <div key={group.title} className="space-y-3">
                  <p className={cn("text-[10px] font-black uppercase tracking-[0.3em] ml-2", group.color)}>{group.title}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.books.map(book => (
                      <button key={book.id} onClick={() => { setSelectedBook(book); setSelectedChapter(1); setShowBookSelector(false); }} className={cn("p-4 rounded-2xl text-left border", selectedBook.id === book.id ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-100")}>
                        <p className="font-bold text-sm truncate">{book.nome}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showChapterSelector && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end">
           <div className="bg-white w-full h-[60vh] rounded-t-[3.5rem] p-6 flex flex-col shadow-2xl pt-10">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-2xl font-black text-gray-900">Capítulos</h3>
                 <button onClick={() => setShowChapterSelector(false)} className="p-4 bg-gray-50 rounded-full font-bold">X</button>
              </div>
              <div className="grid grid-cols-5 gap-3 overflow-y-auto pr-2 pb-10">
                {Array.from({ length: selectedBook.capitulos }, (_, i) => i + 1).map(cap => (
                   <button key={cap} onClick={() => { setSelectedChapter(cap); setShowChapterSelector(false); }} className={cn("h-16 rounded-2xl flex items-center justify-center font-black transition-all", selectedChapter === cap ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-400")}>
                     {cap}
                   </button>
                ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
