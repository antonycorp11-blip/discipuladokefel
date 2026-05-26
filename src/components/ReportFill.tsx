import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, CheckCircle, Loader2, Target, Plus, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { sendPushNotification } from "@/lib/onesignal";

export function ReportFill() {
  const { tipo } = useParams<{ tipo: string }>(); // 'celula', 'culto' ou 'evento'
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");
  
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [meta, setMeta] = useState<number>(0);
  const [membros, setMembros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [selectedMembros, setSelectedMembros] = useState<string[]>([]);
  const [visitantes, setVisitantes] = useState<string[]>([]);
  const [newVisitor, setNewVisitor] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!user?.celula_id) {
        setLoading(false);
        return;
      }
      try {
        const [celulaRes, membrosRes] = await Promise.all([
          supabase
            .from("kefel_celulas")
            .select("meta_celula, meta_culto, meta_evento")
            .eq("id", user.celula_id)
            .single(),
          supabase
            .from("kefel_profiles")
            .select("id, nome")
            .eq("celula_id", user.celula_id)
            .order("nome", { ascending: true })
        ]);
        
        if (celulaRes.data && !celulaRes.error) {
          const d = celulaRes.data as any;
          if (tipo === 'celula') setMeta(d.meta_celula || 0);
          else if (tipo === 'culto') setMeta(d.meta_culto || 0);
          else if (tipo === 'evento') setMeta(d.meta_evento || 0);
        }

        if (membrosRes.data && !membrosRes.error) {
          setMembros(membrosRes.data);
        }
      } catch (err) {
        console.error("Erro ao buscar dados", err);
      }
      setLoading(false);
    }
    loadData();
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

  const handleToggleMembro = (nome: string) => {
    setSelectedMembros(prev => 
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  };

  const handleAddVisitor = () => {
    const nome = newVisitor.trim();
    if (!nome) return;
    setVisitantes(prev => [...prev, nome]);
    setNewVisitor("");
  };

  const totalPresentes = selectedMembros.length + visitantes.length;

  const handleSubmit = async () => {
    if (!user) return;
    if (totalPresentes === 0) {
      showToast("Selecione pelo menos uma pessoa.", "error");
      return;
    }

    setEnviando(true);
    try {
      // Deletar o anterior se houver
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
        presentes: totalPresentes,
        presentes_nomes: [...selectedMembros, ...visitantes],
        data: new Date().toISOString().split('T')[0],
        referencia: ref,
        meta_exigida: meta
      });

      if (error) throw error;

      setSucesso(true);
      
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

  const getShortName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length > 1) return `${parts[0]} ${parts[1]}`;
    return parts[0];
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 pt-14 px-6 relative overflow-y-auto pb-24">
      <header className="flex items-center gap-4 mb-6 pt-4 z-10 relative">
        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm"><ChevronLeft size={20} className="text-gray-900" /></button>
      </header>

      <AnimatePresence>
        {sucesso ? (
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="flex flex-col items-center justify-center flex-1 z-10 mt-10"
          >
             <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-600/20">
               <CheckCircle size={48} />
             </div>
             <h2 className="text-3xl font-black italic uppercase text-gray-900 mb-2">Enviado!</h2>
             <p className="text-gray-500 text-center text-sm mb-10 max-w-xs">
               O seu relatório de {tipo} para a {ref.replace(/_/g, ' ')} foi registrado com sucesso com {totalPresentes} pessoas.
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
            <div className="mb-6">
              <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 leading-tight">
                Relatório de {tipo}
              </h1>
              <p className="text-[12px] font-black uppercase text-gray-400 mt-2 tracking-widest bg-white inline-block px-3 py-1.5 rounded-lg border border-gray-200">
                {ref.replace(/_/g, ' ')}
              </p>
            </div>

            <div className="flex gap-4 mb-6">
              <div className={`p-4 rounded-3xl border flex-1 flex flex-col justify-center ${colorClass}`}>
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">SUA META</p>
                 <h3 className="text-3xl font-black tracking-tighter">{meta}</h3>
              </div>
              <div className={`p-4 rounded-3xl border flex-1 flex flex-col justify-center bg-gray-900 text-white border-gray-800 shadow-xl shadow-black/10 transition-all ${totalPresentes >= meta && meta > 0 ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/20 text-white' : ''}`}>
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">PRESENTES</p>
                 <h3 className="text-3xl font-black tracking-tighter">{totalPresentes}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex-1 flex flex-col mb-10">
               <div className="mb-6">
                 <p className="text-xs font-black text-gray-900 uppercase tracking-widest mb-1 flex items-center gap-2">
                   <UserCheck size={16} className="text-indigo-500" /> 
                   Sua Célula
                 </p>
                 <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">Toque nos membros que estão presentes</p>
                 
                 {membros.length === 0 ? (
                   <p className="text-sm text-gray-400 italic">Nenhum membro cadastrado nesta célula ainda.</p>
                 ) : (
                   <div className="flex flex-wrap gap-2">
                     {membros.map(m => {
                       const isSelected = selectedMembros.includes(m.nome);
                       return (
                         <button
                           key={m.id}
                           onClick={() => handleToggleMembro(m.nome)}
                           className={`px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${
                             isSelected 
                               ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-transparent scale-105' 
                               : 'bg-gray-50 text-gray-500 border border-gray-100 active:scale-95'
                           }`}
                         >
                           {getShortName(m.nome)}
                         </button>
                       )
                     })}
                   </div>
                 )}
               </div>

               <div className="mb-6">
                 <p className="text-xs font-black text-gray-900 uppercase tracking-widest mb-3 border-t pt-6 border-gray-100">Visitantes / Outros</p>
                 
                 {visitantes.length > 0 && (
                   <div className="flex flex-wrap gap-2 mb-3">
                     {visitantes.map((v, i) => (
                       <div key={i} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-2">
                         {v}
                         <button onClick={() => setVisitantes(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-700">✕</button>
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="flex gap-2">
                   <input 
                     value={newVisitor}
                     onChange={e => setNewVisitor(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleAddVisitor()}
                     placeholder="Nome do visitante..."
                     className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                   />
                   <button 
                     onClick={handleAddVisitor}
                     disabled={!newVisitor.trim()}
                     className="bg-gray-900 text-white p-3 rounded-xl disabled:opacity-50"
                   >
                     <Plus size={20} />
                   </button>
                 </div>
               </div>

               <div className="mt-auto pt-6">
                 <button 
                   disabled={enviando || totalPresentes === 0}
                   onClick={handleSubmit} 
                   className="w-full bg-black text-white font-black italic uppercase tracking-widest py-5 rounded-2xl shadow-lg shadow-black/20 active:scale-95 transition-all disabled:opacity-40 flex justify-center items-center gap-2"
                 >
                   {enviando ? <Loader2 className="animate-spin" /> : `Enviar Relatório (${totalPresentes})`}
                 </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
