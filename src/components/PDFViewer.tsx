import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, X, Maximize, Minimize } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// Usando um iframe simples para compatibilidade máxima em mobile/web
// e adicionando botões de navegação lateral se o usuário quiser reportar progresso manual
// ou tentando capturar o scroll se possível.
// Para persistência real de página em PDF, react-pdf é melhor, mas frames são mais leves.

export function PDFViewer() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchBook();
  }, [id]);

  async function fetchBook() {
    setLoading(true);
    const { data: bookData } = await supabase.from("kefel_library").select("*").eq("id", id).single();
    if (bookData) {
      setBook(bookData);
      // Carregar progresso
      if (user) {
        const { data: prog } = await supabase.from("kefel_library_progress").select("current_page").eq("user_id", user.id).eq("book_id", id).single();
        if (prog) setCurrentPage((prog as any).current_page);
      }
    }
    setLoading(false);
  }

  const saveProgress = async (page: number) => {
    if (!user || !id) return;
    setCurrentPage(page);
    await supabase.from("kefel_library_progress").upsert({
      user_id: user.id,
      book_id: id,
      current_page: page,
      updated_at: new Date().toISOString()
    });
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white" /></div>;
  if (!book) return <div className="h-screen flex items-center justify-center bg-black text-white">Livro não encontrado</div>;

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      <header className="p-4 flex items-center justify-between text-white bg-black/50 backdrop-blur-md">
         <button onClick={() => navigate('/biblia')} className="p-2 bg-white/10 rounded-xl"><ChevronLeft /></button>
         <div className="text-center">
            <h2 className="text-xs font-black uppercase italic truncate max-w-[200px]">{book.titulo}</h2>
            <p className="text-[10px] font-bold text-gray-400">Página {currentPage}</p>
         </div>
         <button onClick={() => navigate('/biblia')} className="p-2 bg-white/10 rounded-xl"><X /></button>
      </header>

      <div className="flex-1 relative">
         <iframe 
            src={`${book.pdf_url}#page=${currentPage}`}
            className="w-full h-full border-none"
            title={book.titulo}
         />
      </div>

      <footer className="p-6 bg-black/80 backdrop-blur-md flex items-center justify-between gap-4">
         <button 
           onClick={() => saveProgress(Math.max(1, currentPage - 1))}
           className="flex-1 bg-white/10 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black italic uppercase text-[10px]"
         >
           <ChevronLeft size={16} /> Página Anterior
         </button>
         <button 
           onClick={() => saveProgress(currentPage + 1)}
           className="flex-1 bg-white/10 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black italic uppercase text-[10px]"
         >
           Próxima Página <ChevronRight size={16} />
         </button>
      </footer>
    </div>
  );
}
