import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  Book, ChevronLeft, ChevronRight, Share2, Search, X, 
  BookOpen, Loader2, Clock, CheckCircle2 
} from "lucide-react";
import { BIBLE_BOOKS, fetchBibleChapter, type BibleVerse, type BibleBook } from "@/data/bible";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export function BibleReader() {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState<BibleBook>(BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filtragem de livros para a busca
  const filteredBooks = useMemo(() => {
    return BIBLE_BOOKS.filter(b => 
      b.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.abrev.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const otBooks = useMemo(() => filteredBooks.filter(b => b.testamento === 'AT'), [filteredBooks]);
  const ntBooks = useMemo(() => filteredBooks.filter(b => b.testamento === 'NT'), [filteredBooks]);

  // Carregamento do capítulo e timer de leitura
  useEffect(() => {
    const loadChapterData = async () => {
      setLoading(true);
      const data = await fetchBibleChapter(selectedBook.id, selectedChapter);
      setVerses(data);
      setLoading(false);
      setStartTime(Date.now());
      scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    };
    loadChapterData();

    return () => {
      if (startTime && user) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        if (duration > 30) {
          supabase.from("kefel_reading_progress").insert({
            user_id: user.id,
            book_id: selectedBook.id,
            chapter: selectedChapter,
            duration_seconds: duration
          }).then();
        }
      }
    };
  }, [selectedBook, selectedChapter]);

  const handleShare = async (verse: BibleVerse) => {
    const text = `"${verse.text}"\n— ${selectedBook.nome} ${selectedChapter}:${verse.verse}\n(via Discipulado Kefel)`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Versículo Bíblico', text });
      } catch (err) {
        console.log('Compartilhamento cancelado');
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Texto copiado para a área de transferência!");
    }
  };

  const nextChapter = () => {
    if (selectedChapter < selectedBook.capitulos) {
      setSelectedChapter(prev => prev + 1);
    } else {
      const idx = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
      if (idx < BIBLE_BOOKS.length - 1) {
        setSelectedBook(BIBLE_BOOKS[idx + 1]);
        setSelectedChapter(1);
      }
    }
  };

  const prevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(prev => prev - 1);
    } else {
      const idx = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
      if (idx > 0) {
        setSelectedBook(BIBLE_BOOKS[idx - 1]);
        setSelectedChapter(BIBLE_BOOKS[idx - 1].capitulos);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Fixo de Navegação */}
      <div className="sticky top-0 z-[60] bg-white/95 backdrop-blur-md border-b border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBookSelector(true)}
            className="flex-1 flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                <Book size={18} />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-black text-gray-900 leading-none">{selectedBook.nome} {selectedChapter}</h2>
              </div>
            </div>
            <Search className="text-gray-300" size={16} />
          </button>

          <div className="flex gap-1">
            <button onClick={prevChapter} className="p-3 bg-gray-50 rounded-xl border border-gray-100"><ChevronLeft size={18} /></button>
            <button onClick={nextChapter} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* Conteúdo dos Versículos */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 select-text overflow-x-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest italic">Carregando Escrituras...</p>
          </div>
        ) : (
          <div className="space-y-6 pb-24">
            {verses.map((v) => (
              <div key={v.verse} className="space-y-2 group relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-500/40 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
                    Versículo {v.verse}
                  </span>
                  <button 
                    onClick={() => handleShare(v)}
                    className="p-2 text-gray-300 hover:text-blue-500 transition-colors"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
                <p className="text-gray-800 text-[18px] leading-relaxed font-medium select-text cursor-text">
                  {v.text}
                </p>
              </div>
            ))}

            {/* Fim do Capítulo */}
            <div className="pt-10 space-y-4">
               <button 
                onClick={nextChapter}
                className="w-full py-5 bg-gray-50 text-gray-400 rounded-[2rem] font-black tracking-tighter uppercase text-sm flex items-center justify-center gap-2"
               >
                 Próximo Capítulo <ChevronRight size={18} />
               </button>
               <div className="text-center">
                 <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Discipulado Kefel</p>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Seleção de Livro (Fullscreen) */}
      {showBookSelector && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-6 border-b border-gray-100 flex items-center gap-4">
            <button onClick={() => setShowBookSelector(false)} className="p-2 bg-gray-50 rounded-full"><ChevronLeft /></button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar livro..." 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-32">
            {/* Lista dos Livros */}
            {[
              { title: "Antigo Testamento", books: otBooks, color: "text-blue-500" },
              { title: "Novo Testamento", books: ntBooks, color: "text-purple-500" }
            ].map(group => group.books.length > 0 && (
              <div key={group.title} className="space-y-4">
                <h3 className={cn("text-[10px] font-black uppercase tracking-widest pl-2", group.color)}>{group.title}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {group.books.map(book => (
                    <button
                      key={book.id}
                      onClick={() => {
                        setSelectedBook(book);
                        setSelectedChapter(1);
                        setShowBookSelector(false);
                        setSearchTerm("");
                      }}
                      className={cn(
                        "p-4 rounded-2xl text-left transition-all",
                        selectedBook.id === book.id ? "bg-blue-600 text-white shadow-xl shadow-blue-100" : "bg-gray-50 text-gray-700"
                      )}
                    >
                      <p className="text-[10px] opacity-50 font-black uppercase mb-1">{book.abrev}</p>
                      <p className="font-bold text-sm truncate">{book.nome}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filteredBooks.length === 0 && (
              <div className="text-center py-20 text-gray-400 italic">Nenhum livro encontrado</div>
            )}
          </div>

          {/* Seleção Rápiada de Capítulos (Flutuante ao fundo) */}
          <div className="p-6 bg-gray-50 border-t border-gray-100">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Capítulo atual: {selectedChapter}</p>
             <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {Array.from({ length: selectedBook.capitulos }, (_, i) => i + 1).map(cap => (
                  <button
                    key={cap}
                    onClick={() => {
                      setSelectedChapter(cap);
                      setShowBookSelector(false);
                    }}
                    className={cn(
                      "min-w-[50px] h-[50px] flex items-center justify-center rounded-2xl font-black transition-all shrink-0",
                      selectedChapter === cap ? "bg-black text-white scale-110 shadow-lg" : "bg-white text-gray-400 shadow-sm"
                    )}
                  >
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
