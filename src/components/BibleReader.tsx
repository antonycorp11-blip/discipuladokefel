import React, { useState, useEffect, useRef, useCallback } from "react";
import { BIBLE_BOOKS, fetchBibleChapter, type BibleVerse, type BibleBook } from "@/data/bible";
import {
  Clock, CheckCircle2, ChevronDown, BookOpen,
  ChevronLeft, ChevronRight, Loader2, Search, X, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface BibleReaderProps {
  onFinish: (seconds: number, book: string, chapter: number) => void;
}

// ── Tela de feedback pós-leitura ────────────────────────────────
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
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center space-y-8">
      {/* Ícone animado */}
      <div className="relative">
        <div className="w-28 h-28 bg-blue-50 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-14 h-14 text-blue-600" />
        </div>
        <div className="absolute -top-2 -right-2">
          <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
        </div>
      </div>

      {/* Mensagem */}
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-gray-900">Leitura Concluída!</h1>
        <p className="text-gray-600 font-medium">
          {book}, Capítulo {chapter}
        </p>
      </div>

      {/* Tempo */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6 w-full space-y-1">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tempo de Leitura</p>
        <p className="text-4xl font-black text-blue-600">{timeLabel}</p>
        <p className="text-gray-400 text-sm">salvo no seu histórico ✓</p>
      </div>

      {/* Versículo motivacional */}
      <div className="bg-blue-900 text-white rounded-3xl p-5 w-full space-y-2">
        <p className="text-sm italic leading-relaxed opacity-90">
          "Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho."
        </p>
        <p className="text-blue-300 text-xs font-bold">Salmos 119:105</p>
      </div>

      {/* Ações */}
      <div className="w-full space-y-3">
        <button
          onClick={onContinue}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 active:scale-95 transition-transform"
        >
          Continuar Lendo
        </button>
        <button
          onClick={onHome}
          className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold active:scale-95 transition-transform"
        >
          Ir para Início
        </button>
      </div>
    </div>
  );
}

export function BibleReader({ onFinish }: BibleReaderProps) {
  const { updateReadingTime } = useAuth();

  const [selectedBook, setSelectedBook] = useState<BibleBook>(BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Estado de conclusão
  const [finished, setFinished] = useState(false);
  const [finishedData, setFinishedData] = useState<{ seconds: number; book: string; chapter: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive]);

  const loadChapter = useCallback(async (book: BibleBook, chapter: number) => {
    setLoading(true);
    setError(null);
    setVerses([]);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    const data = await fetchBibleChapter(book.id, chapter);
    if (data.length === 0) setError("Não foi possível carregar. Verifique sua conexão.");
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

  // ── Finalizar leitura ────────────────────────────────────────
  const handleFinish = async () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const readSeconds = seconds;
    const book = selectedBook.nome;
    const chapter = selectedChapter;

    // Salva no banco via context
    await updateReadingTime(readSeconds, book, chapter);

    // Mostra tela de feedback
    setFinishedData({ seconds: readSeconds, book, chapter });
    setFinished(true);

    // Callback externo (para atualizar estado global se necessário)
    onFinish(readSeconds, book, chapter);
  };

  const handleContinue = () => {
    setFinished(false);
    setSeconds(0);
    setIsActive(true);
    // Vai para próximo capítulo automaticamente
    goToNextChapter();
  };

  const handleHome = () => {
    setFinished(false);
    // onFinish já foi chamado, navegação é feita pelo parent se necessário
  };

  const goToNextChapter = () => {
    if (selectedChapter < selectedBook.capitulos) {
      setSelectedChapter((c) => c + 1);
    } else {
      const idx = BIBLE_BOOKS.findIndex((b) => b.id === selectedBook.id);
      if (idx < BIBLE_BOOKS.length - 1) {
        setSelectedBook(BIBLE_BOOKS[idx + 1]);
        setSelectedChapter(1);
      }
    }
  };

  const goToPrevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter((c) => c - 1);
    } else {
      const idx = BIBLE_BOOKS.findIndex((b) => b.id === selectedBook.id);
      if (idx > 0) {
        const prev = BIBLE_BOOKS[idx - 1];
        setSelectedBook(prev);
        setSelectedChapter(prev.capitulos);
      }
    }
  };

  const filteredBooks = BIBLE_BOOKS.filter((b) =>
    b.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.abrev.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const atBooks = filteredBooks.filter((b) => b.testamento === "AT");
  const ntBooks = filteredBooks.filter((b) => b.testamento === "NT");

  // ── Tela de conclusão ─────────────────────────────────────────
  if (finished && finishedData) {
    return (
      <ReadingComplete
        seconds={finishedData.seconds}
        book={finishedData.book}
        chapter={finishedData.chapter}
        onContinue={handleContinue}
        onHome={handleHome}
      />
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 80px)" }}>
      {/* ── Header fixo ───────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-2">
          {/* Seletor de Livro */}
          <button
            onClick={() => { setShowBookSelector(true); setShowChapterSelector(false); }}
            className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-2 rounded-xl font-bold text-sm flex-1 min-w-0 active:scale-95 transition-transform"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">{selectedBook.nome}</span>
            <ChevronDown className="w-3 h-3 shrink-0 ml-auto" />
          </button>

          {/* Seletor de Capítulo */}
          <button
            onClick={() => { setShowChapterSelector(true); setShowBookSelector(false); }}
            className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-xl font-bold text-sm shrink-0 active:scale-95 transition-transform"
          >
            Cap. {selectedChapter}
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Timer */}
          <div className="flex items-center gap-1 bg-blue-600 text-white px-2.5 py-1.5 rounded-full font-mono font-bold text-sm shrink-0">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(seconds)}
          </div>
        </div>

        {/* Navegação cap anterior / próximo */}
        <div className="flex items-center justify-between text-xs">
          <button onClick={goToPrevChapter} className="flex items-center gap-0.5 font-bold text-gray-400 active:text-blue-600 py-1 pr-2">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-gray-300 font-medium">{selectedBook.abrev} {selectedChapter}/{selectedBook.capitulos}</span>
          <button onClick={goToNextChapter} className="flex items-center gap-0.5 font-bold text-gray-400 active:text-blue-600 py-1 pl-2">
            Próximo <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Conteúdo ──────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-gray-400 text-sm">{selectedBook.nome} {selectedChapter}...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-red-500 text-sm text-center">{error}</p>
            <button onClick={() => loadChapter(selectedBook, selectedChapter)} className="text-blue-600 font-bold text-sm underline">
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && verses.map((verse) => (
          <p key={verse.verse} className="text-[17px] leading-loose text-gray-800">
            <span className="text-xs font-black text-blue-500 mr-1.5 align-top select-none">{verse.verse}</span>
            {verse.text}
          </p>
        ))}

        {!loading && !error && verses.length > 0 && (
          <div className="pt-6 pb-4 space-y-3">
            <button
              onClick={goToNextChapter}
              className="w-full bg-gray-100 text-gray-600 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              Próximo Capítulo <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleFinish}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-100 active:scale-95 transition-transform"
            >
              <CheckCircle2 className="w-5 h-5" />
              Finalizar & Salvar Leitura
            </button>
          </div>
        )}
      </div>

      {/* ── Modal: Livros ──────────────────────────────────────── */}
      {showBookSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div
            className="absolute inset-0"
            onClick={() => { setShowBookSelector(false); setSearchQuery(""); }}
          />
          <div className="relative bg-white rounded-3xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden">
            {/* Header do modal */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-lg font-black text-gray-900">Selecionar Livro</h2>
              <button
                onClick={() => { setShowBookSelector(false); setSearchQuery(""); }}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Busca */}
            <div className="px-5 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar livro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl pl-9 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 px-5 pb-8 space-y-5">
              {atBooks.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Antigo Testamento ({atBooks.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {atBooks.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => {
                          setSelectedBook(book);
                          setSelectedChapter(1);
                          setShowBookSelector(false);
                          setSearchQuery("");
                        }}
                        className={cn(
                          "py-2.5 px-1 rounded-xl text-xs font-bold text-center transition-all active:scale-95 leading-tight",
                          selectedBook.id === book.id
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-gray-50 text-gray-700"
                        )}
                      >
                        {book.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {ntBooks.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Novo Testamento ({ntBooks.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {ntBooks.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => {
                          setSelectedBook(book);
                          setSelectedChapter(1);
                          setShowBookSelector(false);
                          setSearchQuery("");
                        }}
                        className={cn(
                          "py-2.5 px-1 rounded-xl text-xs font-bold text-center transition-all active:scale-95 leading-tight",
                          selectedBook.id === book.id
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-gray-50 text-gray-700"
                        )}
                      >
                        {book.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Capítulos ───────────────────────────────────── */}
      {showChapterSelector && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="absolute inset-0" onClick={() => setShowChapterSelector(false)} />
          <div className="relative mt-auto bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: "60vh" }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-lg font-black text-gray-900">{selectedBook.nome}</h2>
              <button
                onClick={() => setShowChapterSelector(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 pb-8">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: selectedBook.capitulos }, (_, i) => i + 1).map((cap) => (
                  <button
                    key={cap}
                    onClick={() => { setSelectedChapter(cap); setShowChapterSelector(false); }}
                    className={cn(
                      "py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
                      selectedChapter === cap
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-50 text-gray-700"
                    )}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
