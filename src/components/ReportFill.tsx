import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, CheckCircle, Loader2, Target } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { sendPushNotification } from "@/lib/onesignal";

export function ReportFill() {
  const { tipo } = useParams<{ tipo: string }>(); // 'celula', 'culto' ou 'evento'
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");
  
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [meta, setMeta] = useState<number>(0);
  const [presentes, setPresentes] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      if (!user?.celula_id) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("kefel_celulas")
          .select("meta_celula, meta_culto, meta_evento")
          .eq("id", user.celula_id)
          .single();
        
        if (data && !error) {
          const d = data as any;
          if (tipo === 'celula') setMeta(d.meta_celula || 0);
          else if (tipo === 'culto') setMeta(d.meta_culto || 0);
          else if (tipo === 'evento') setMeta(d.meta_evento || 0);
        }
      } catch (err) {
        console.error("Erro ao buscar meta", err);
      }
      setLoading(false);
    }
    loadMeta();
  }, [user, tipo]);

  if (!ref || !tipo) {
    return (
      <div className="p-10 text-center text-gray-500 font-black uppercase">
        Link Inválido. Falta referência.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!user) return;
    const value = parseInt(presentes);
    if (isNaN(value) || value < 0) {
      showToast("Insira um número válido.", "error");
      return;
    }

    setEnviando(true);
    try {
      // Deletar o anterior se houver (para evitar duplicação em reenvio)
      await supabase.from("kefel_relatorios")
        .delete()
        .eq("lider_id", user.id)
        .eq("referencia", ref)
        .eq("tipo", tipo);

      // Inserir
      const { error } = await supabase.from("kefel_relatorios").insert({
        celula_id: user.celula_id,
        lider_id: user.id,
        tipo,
        presentes: value,
        data: new Date().toISOString().split('T')[0],
        referencia: ref,
        meta_exigida: meta
      });

      if (error) throw error;

      setSucesso(true);
      
      // Envia push para admins avisando
      try {
        await sendPushNotification({
          headings: "Relatório Enviado",
          contents: `A liderança preencheu o relatório: ${ref}`,
          targetTags: [{ key: 'role', relation: '=', value: 'master' }]
        });
      } catch(e) {}

    } catch (err) {
      showToast("Erro ao enviar relatório.", "error");
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

  const getThemeColor = () => {
    if (tipo === 'celula') return 'text-indigo-500 bg-indigo-50 border-indigo-100';
    if (tipo === 'culto') return 'text-rose-500 bg-rose-50 border-rose-100';
    return 'text-amber-500 bg-amber-50 border-amber-100';
  };

  const colorClass = getThemeColor();

  return (
    <div className="flex flex-col h-screen bg-gray-50 pt-14 px-6 overflow-hidden relative">
      <header className="flex items-center gap-4 mb-10 pt-4 z-10 relative">
        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm"><ChevronLeft size={20} className="text-gray-900" /></button>
      </header>

      <AnimatePresence>
        {sucesso ? (
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="flex flex-col items-center justify-center flex-1 z-10"
          >
             <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-600/20">
               <CheckCircle size={48} />
             </div>
             <h2 className="text-3xl font-black italic uppercase text-gray-900 mb-2">Enviado!</h2>
             <p className="text-gray-500 text-center text-sm mb-10 max-w-xs">
               O seu relatório de {tipo} para a {ref.replace(/_/g, ' ')} foi registrado com sucesso.
             </p>
             <button onClick={() => navigate('/')} className="bg-gray-900 text-white font-black uppercase tracking-widest py-4 px-10 rounded-full">
               Voltar ao Início
             </button>
          </motion.div>
        ) : (
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex flex-col flex-1 z-10"
          >
            <div className="mb-8">
              <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 leading-tight">
                Relatório de {tipo}
              </h1>
              <p className="text-[12px] font-black uppercase text-gray-400 mt-2 tracking-widest bg-white inline-block px-3 py-1.5 rounded-lg border border-gray-200">
                {ref.replace(/_/g, ' ')}
              </p>
            </div>

            <div className={`p-6 rounded-[2rem] border mb-6 flex flex-col items-center text-center justify-center ${colorClass}`}>
               <Target size={24} className="mb-3 opacity-80" />
               <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">SUA META</p>
               <h3 className="text-5xl font-black tracking-tighter">{meta}</h3>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100 flex-1 flex flex-col mb-10">
               <p className="text-xs font-black text-gray-400 uppercase text-center tracking-widest mb-6">Pessoas Presentes</p>
               
               <div className="flex-1 flex items-center justify-center">
                 <input 
                   type="number" 
                   value={presentes} 
                   onChange={(e) => setPresentes(e.target.value)} 
                   placeholder="0" 
                   className="w-full text-center text-7xl font-black text-gray-900 outline-none bg-transparent placeholder:text-gray-200"
                   autoFocus
                 />
               </div>

               <button 
                 disabled={enviando || !presentes}
                 onClick={handleSubmit} 
                 className="w-full bg-black text-white font-black italic uppercase tracking-widest py-6 rounded-full shadow-lg shadow-black/20 active:scale-95 transition-all disabled:opacity-40"
               >
                 {enviando ? <Loader2 className="animate-spin mx-auto" /> : 'Confirmar Presença'}
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
