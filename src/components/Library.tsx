import React, { useState, useEffect } from "react";
import { 
  Book, BookOpen, Search, Download, 
  ChevronRight, Bookmark, Clock, Loader2, Plus, X, Upload, FileText
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { BIBLE_BOOKS } from "@/data/bible";

export function Library() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Add Book Form
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  // Cálculo de progressão real (1189 capítulos no total)
  const bibleProgress = React.useMemo(() => {
    if (!user?.last_bible_reading) return 0;
    const { bookId, chapter } = user.last_bible_reading as { bookId: string, chapter: number };
    
    const totalChapters = BIBLE_BOOKS.reduce((acc, b) => acc + b.capitulos, 0);
    let chaptersRead = 0;
    
    for (const book of BIBLE_BOOKS) {
      if (book.id === bookId) {
        chaptersRead += chapter;
        break;
      }
      chaptersRead += book.capitulos;
    }
    
    const percentage = (chaptersRead / totalChapters) * 100;
    return Math.min(Math.round(percentage * 10) / 10, 100); // 1 casa decimal, max 100
  }, [user?.last_bible_reading]);

  async function fetchBooks() {
    setLoading(true);
    const { data, error } = await supabase.from("kefel_library").select("*").order("created_at", { ascending: false });
    if (!error) setBooks(data || []);
    setLoading(false);
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !newTitle || !user) return;
    setUploading(true);

    try {
      // 1. Upload PDF
      const pdfExt = pdfFile.name.split('.').pop();
      const pdfPath = `books/${Date.now()}_${newTitle.replace(/\s/g, '_')}.${pdfExt}`;
      const { data: pdfData, error: pdfErr } = await supabase.storage.from("kefel-eventos").upload(pdfPath, pdfFile);
      if (pdfErr) throw pdfErr;
      const { data: pdfUrlData } = supabase.storage.from("kefel-eventos").getPublicUrl(pdfData.path);

      // 2. Upload Cover (optional)
      let coverUrl = "";
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverPath = `covers/${Date.now()}_${newTitle.replace(/\s/g, '_')}.${coverExt}`;
        const { data: covData, error: covErr } = await supabase.storage.from("kefel-eventos").upload(coverPath, coverFile);
        if (covErr) throw covErr;
        const { data: covUrlData } = supabase.storage.from("kefel-eventos").getPublicUrl(covData.path);
        coverUrl = covUrlData.publicUrl;
      }

      // 3. Save to DB
      const { error: dbErr } = await supabase.from("kefel_library").insert({
        titulo: newTitle,
        autor: newAuthor,
        pdf_url: pdfUrlData.publicUrl,
        capa_url: coverUrl
      });
      if (dbErr) throw dbErr;

      showToast("Livro adicionado com sucesso!");
      setShowAddModal(false);
      fetchBooks();
    } catch (err: any) {
      showToast("Erro ao enviar: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent pt-14 pb-20 px-6 overflow-y-auto">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 italic uppercase">Biblioteca</h1>
          <div className="h-1.5 w-12 bg-[#1B3B6B] rounded-full mt-1"></div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{books.length + 1} Livros Disponíveis</p>
        </div>
        {user?.role === 'master' && (
          <button onClick={() => setShowAddModal(true)} className="bg-black text-white p-3.5 rounded-2xl shadow-premium shadow-black/10 active:scale-95 transition-soft">
            <Plus size={20} />
          </button>
        )}
      </header>

      {/* Destaque: Bíblia Sagrada */}
      <div 
        onClick={() => navigate('/biblia-leitura')}
        className="relative bg-black rounded-[3rem] p-8 mb-10 overflow-hidden shadow-2xl group cursor-pointer active:scale-95 transition-soft"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-soft duration-700" />
        <div className="relative z-10 flex gap-6 items-center">
            <div className="w-24 h-32 bg-gradient-to-br from-[#1B3B6B] to-black rounded-2xl shadow-2xl flex items-center justify-center border border-white/10 group-hover:rotate-3 transition-soft">
                <BookOpen size={48} className="text-white/20" />
            </div>
            <div className="flex-1">
                <div className="bg-blue-600 inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white mb-2">Clássico</div>
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-tight">Bíblia ACF</h2>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">Palavra de Deus</p>
                <div className="flex items-center gap-2 mt-4">
                    <div className="h-1 flex-1 bg-white/10 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${bibleProgress}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">{bibleProgress}%</span>
                </div>
            </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#1B3B6B]" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {books.map(book => (
            <div 
              key={book.id} 
              onClick={() => navigate(`/livro/${book.id}`)}
              className="glass-panel p-6 rounded-[2.5rem] shadow-sm flex items-center gap-5 border-white/50 group cursor-pointer active:scale-95 transition-soft"
            >
              <div className="w-16 h-24 bg-gray-50 rounded-xl overflow-hidden shadow-sm flex-shrink-0 flex items-center justify-center p-1 border border-white/50 group-hover:scale-105 transition-soft">
                {book.capa_url ? <img src={book.capa_url} className="w-full h-full object-cover rounded-lg" /> : <Book className="text-[#1B3B6B]/20" size={32} />}
              </div>
              <div className="flex-1">
                <h4 className="font-black text-gray-900 uppercase italic text-sm tracking-tight leading-tight">{book.titulo}</h4>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{book.autor || 'Autor Desconhecido'}</p>
                
                <div className="flex items-center gap-2 mt-3">
                  <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full w-0 bg-[#1B3B6B] rounded-full" />
                  </div>
                  <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">0%</span>
                </div>
              </div>
              <ChevronRight className="text-gray-200 group-hover:text-[#1B3B6B] group-hover:translate-x-1 transition-soft" size={20} />
            </div>
          ))}

          {books.length === 0 && (
            <div className="text-center py-10 opacity-30">
               <FileText className="mx-auto mb-2" size={32} />
               <p className="text-[10px] font-black uppercase tracking-widest">Nenhum PDF disponível</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Upload Livro */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end">
             <motion.div 
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               exit={{ y: "100%" }}
               className="bg-white w-full h-[85vh] rounded-t-[3.5rem] p-10 flex flex-col shadow-2xl pb-32"
             >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 italic uppercase leading-none">Novo Livro</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Adicionar PDF à Biblioteca</p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="glass-panel p-3 rounded-full active:scale-95"><X size={20} /></button>
                </div>

                <form onSubmit={handleUpload} className="space-y-8 flex-1 overflow-y-auto pr-2">
                   <div className="space-y-2">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Título do Livro</p>
                     <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="EX: O PODER DA ESPERANÇA" className="w-full bg-gray-50 p-6 rounded-[2rem] font-black italic uppercase text-xs outline-none" />
                   </div>

                   <div className="space-y-2">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Autor</p>
                     <input value={newAuthor} onChange={e => setNewAuthor(e.target.value)} placeholder="EX: C.S. LEWIS" className="w-full bg-gray-50 p-6 rounded-[2rem] font-black italic uppercase text-xs outline-none" />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <label className="cursor-pointer">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Arquivo PDF</p>
                        <div className={`p-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-soft ${pdfFile ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
                           <Upload size={20} className={pdfFile ? 'text-green-500' : 'text-gray-300'} />
                           <span className="text-[8px] font-black uppercase text-center truncate w-full">{pdfFile ? pdfFile.name : 'Selecionar PDF'}</span>
                        </div>
                        <input type="file" accept="application/pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                      </label>

                      <label className="cursor-pointer">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Capa (Imagem)</p>
                        <div className={`p-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-soft ${coverFile ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
                           <Bookmark size={20} className={coverFile ? 'text-green-500' : 'text-gray-300'} />
                           <span className="text-[8px] font-black uppercase text-center truncate w-full">{coverFile ? coverFile.name : 'Selecionar Capa'}</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                      </label>
                   </div>

                   <button disabled={uploading || !pdfFile || !newTitle} className="w-full bg-[#1B3B6B] text-white py-7 rounded-[2.5rem] font-black shadow-premium uppercase italic tracking-widest active:scale-95 transition-soft disabled:opacity-20">
                      {uploading ? <Loader2 className="animate-spin mx-auto" /> : "Publicar na Biblioteca"}
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
