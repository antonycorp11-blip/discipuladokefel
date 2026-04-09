import React, { useState, useEffect } from "react";
import { 
  FileText, Users, Home, 
  CheckCircle, Loader2, Calendar, ChevronLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

export function Reports() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(new Date().toISOString().split('T')[0]); // Fallback para hoje
  
  // Forms state
  const [presentesCelula, setPresentesCelula] = useState<string>("");
  const [presentesCulto, setPresentesCulto] = useState<string>("");
  const [enviandoCelula, setEnviandoCelula] = useState(false);
  const [enviandoCulto, setEnviandoCulto] = useState(false);
  const [enviadoCelula, setEnviadoCelula] = useState(false);
  const [enviadoCulto, setEnviadoCulto] = useState(false);

  // Verificacao de status de envio para a data selecionada
  useEffect(() => {
    if (user) {
      supabase.from("kefel_relatorios")
        .select("*")
        .eq("lider_id", user.id)
        .eq("data", data)
        .then(({ data }) => {
           const res = data as any[];
           setEnviadoCelula(res?.some(r => r.tipo === 'celula') || false);
           setEnviadoCulto(res?.some(r => r.tipo === 'culto') || false);
           
           // Preenche inputs se já enviou
           const cel = res?.find(r => r.tipo === 'celula');
           if (cel) setPresentesCelula(String(cel.presentes));
           else setPresentesCelula("");

           const cul = res?.find(r => r.tipo === 'culto');
           if (cul) setPresentesCulto(String(cul.presentes));
           else setPresentesCulto("");
        });
    }
  }, [user, data]);

  if (user?.role !== 'lider' && user?.role !== 'master') {
    return <div className="p-10 text-center font-black uppercase text-gray-400">Acesso Restrito a Líderes e Discipuladores</div>;
  }

  async function handleSendReport(tipo: 'celula' | 'culto') {
    if (!user) return;
    const valueStr = tipo === 'celula' ? presentesCelula : presentesCulto;
    const value = parseInt(valueStr);
    
    if (isNaN(value) || value < 0) {
      showToast("Insira um número válido", "error");
      return;
    }

    if (tipo === 'celula') setEnviandoCelula(true);
    else setEnviandoCulto(true);

    try {
      // Removendo relatorio anterior do mesmo tipo e dia
      await supabase.from("kefel_relatorios")
        .delete()
        .eq("lider_id", user.id)
        .eq("data", data)
        .eq("tipo", tipo);

      // Inserindo o novo
      const { error: insErr } = await supabase.from("kefel_relatorios").insert({
        celula_id: user.celula_id, // Pode ser null
        lider_id: user.id,
        tipo,
        presentes: value,
        data
      });

      if (insErr) throw insErr;

      showToast(`Presença (${tipo}) enviada! 🚀`);
      
      if (tipo === 'celula') setEnviadoCelula(true);
      else setEnviadoCulto(true);
    } catch (err: any) {
      console.error("Erro ao enviar:", err);
      showToast("Erro ao enviar", "error");
    } finally {
      if (tipo === 'celula') setEnviandoCelula(false);
      else setEnviandoCulto(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] pt-14 pb-24 px-6 overflow-y-auto">
      <header className="flex items-center gap-4 mb-6 pt-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm"><ChevronLeft size={20} className="text-[#1B3B6B]" /></button>
        <div>
           <h1 className="text-2xl font-black text-gray-900 italic uppercase tracking-tight">Relatórios</h1>
           <p className="text-[10px] font-black uppercase tracking-widest text-[#1B3B6B]">Frequência e Metas</p>
        </div>
      </header>

      {/* Seletor de Data Universal */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 mb-6 shadow-sm flex flex-col">
        <p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60 text-gray-500">SELECIONE A DATA-ALVO</p>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
          <input 
            type="date" 
            value={data} 
            onChange={(e) => {
              setData(e.target.value);
              setEnviadoCelula(false);
              setEnviadoCulto(false);
              setPresentesCelula("");
              setPresentesCulto("");
            }}
            className="w-full bg-gray-50 p-4 pl-12 rounded-2xl font-black italic text-gray-900 uppercase text-xs outline-none border border-transparent focus:border-indigo-200 transition-soft" 
          />
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
        
        {/* Card Célula */}
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 relative shadow-sm overflow-hidden">
          {enviadoCelula && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1B3B6B]/95 backdrop-blur-md transition-all duration-500 text-white animate-in zoom-in">
               <div className="text-5xl mb-2">✅</div>
               <h3 className="text-xl font-black uppercase mb-1">RELATÓRIO SALVO</h3>
               <p className="text-[10px] uppercase tracking-widest font-bold opacity-80 text-center">Para alterar, escolha outra data e volte</p>
             </div>
          )}
          <div className="flex justify-between items-center mb-6">
            <p className="text-[10px] font-black text-[#1B3B6B] uppercase tracking-widest flex items-center gap-2">
               <Home size={14} /> PRESENÇA CÉLULA
            </p>
          </div>
          <div className="bg-gray-50 rounded-[24px] py-10 flex items-center justify-center mb-6 border-2 border-dashed border-gray-200 focus-within:border-[#1B3B6B] transition-soft">
            <input 
              type="number" 
              disabled={enviadoCelula || enviandoCelula} 
              value={presentesCelula} 
              onChange={(e) => setPresentesCelula(e.target.value)} 
              placeholder="0" 
              className="bg-transparent text-6xl font-black text-center w-full focus:outline-none text-gray-900 tracking-tighter" 
            />
          </div>
          <button 
            onClick={() => handleSendReport('celula')} 
            disabled={enviandoCelula || !presentesCelula} 
            className="w-full bg-[#1B3B6B] text-white font-black uppercase italic tracking-widest py-5 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100"
          >
            {enviandoCelula ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'ENVIAR AGORA'}
          </button>
        </div>

        {/* Card Culto */}
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 relative shadow-sm overflow-hidden">
          {enviadoCulto && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-indigo-600/95 backdrop-blur-md transition-all duration-500 text-white animate-in zoom-in">
               <div className="text-5xl mb-2">✅</div>
               <h3 className="text-xl font-black uppercase mb-1">RELATÓRIO SALVO</h3>
             </div>
          )}
          <div className="flex justify-between items-center mb-6">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
               <Users size={14} /> PRESENÇA CULTO
            </p>
          </div>
          <div className="bg-gray-50 rounded-[24px] py-10 flex items-center justify-center mb-6 border-2 border-dashed border-gray-200 focus-within:border-indigo-400 transition-soft">
            <input 
              type="number" 
              disabled={enviadoCulto || enviandoCulto} 
              value={presentesCulto} 
              onChange={(e) => setPresentesCulto(e.target.value)} 
              placeholder="0" 
              className="bg-transparent text-6xl font-black text-center w-full focus:outline-none text-gray-900 tracking-tighter" 
            />
          </div>
          <button 
            onClick={() => handleSendReport('culto')} 
            disabled={enviandoCulto || !presentesCulto} 
            className="w-full bg-indigo-600 text-white font-black uppercase italic tracking-widest py-5 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 shadow-indigo-600/20"
          >
            {enviandoCulto ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'ENVIAR AGORA'}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
