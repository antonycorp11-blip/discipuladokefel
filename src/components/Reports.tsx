import React, { useState, useEffect } from "react";
import { 
  FileText, Users, Heart, MessageSquare, 
  CheckCircle, Loader2, Calendar, ChevronLeft,
  Users2, UserCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export function Reports() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'celula' | 'culto'>('celula');
  
  // Form state
  const [presentes, setPresentes] = useState(0);
  const [data, setData] = useState(new Date().toISOString().split('T')[0]); // Fallback para hoje
  const [cellDay, setCellDay] = useState("");

  useEffect(() => {
    if (user?.celula_id) {
       supabase.from("kefel_celulas").select("dia_semana").eq("id", user.celula_id).single()
         .then(({ data }) => {
            const cData = data as { dia_semana: string } | null;
            if (cData?.dia_semana) {
               setCellDay(cData.dia_semana);
               updateAutoDate(type, cData.dia_semana);
            }
         });
    }
  }, [user, type]);

  function updateAutoDate(reportType: 'celula' | 'culto', meetingDay: string) {
    const now = new Date();
    const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    
    if (reportType === 'culto') {
      // Último Domingo (se hoje é domingo, é hoje)
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay());
      setData(d.toISOString().split('T')[0]);
    } else {
      // Dia da Célula (última ocorrência ou hoje)
      const targetIdx = dayNames.indexOf(meetingDay);
      if (targetIdx === -1) {
        setData(now.toISOString().split('T')[0]); // Fallback hoje
        return;
      }
      
      const currentIdx = now.getDay();
      // Se hoje é o dia da célula, diff é 0. Se for amanhã, diff é 1 (ontem).
      const diff = (currentIdx - targetIdx + 7) % 7;
      const d = new Date(now);
      d.setDate(now.getDate() - diff);
      setData(d.toISOString().split('T')[0]);
    }
  }

  if (user?.role !== 'lider' && user?.role !== 'master') {
    return <div className="p-10 text-center font-black uppercase text-gray-400">Acesso Restrito a Líderes</div>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("kefel_relatorios").insert({
        celula_id: user?.celula_id,
        lider_id: user?.id,
        tipo: type,
        presentes,
        data
      });

      if (error) throw error;
      showToast("Relatório enviado com sucesso! 🚀");
      setTimeout(() => navigate("/"), 1500);
    } catch (err: any) {
      console.error("Erro ao enviar:", err);
      showToast("Erro ao enviar relatório", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-transparent pt-14 pb-24 px-6 overflow-y-auto">
      <header className="flex items-center gap-4 mb-8 pt-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm"><ChevronLeft size={20} /></button>
        <div>
           <h1 className="text-2xl font-black text-gray-900 italic uppercase">Relatórios</h1>
           <div className="h-1.5 w-12 bg-[#1B3B6B] rounded-full mt-1"></div>
        </div>
      </header>

      {/* Seletor de Tipo */}
      <div className="flex bg-gray-50 p-2 rounded-[2rem] gap-2 mb-10 border border-gray-100">
         <button 
           onClick={() => setType('celula')}
           className={`flex-1 py-4 rounded-[1.5rem] font-black uppercase italic text-[10px] tracking-widest transition-soft ${type === 'celula' ? 'bg-black text-white shadow-premium shadow-black/10' : 'text-gray-400'}`}
         >
           Célula
         </button>
         <button 
           onClick={() => setType('culto')}
           className={`flex-1 py-4 rounded-[1.5rem] font-black uppercase italic text-[10px] tracking-widest transition-soft ${type === 'culto' ? 'bg-black text-white shadow-premium shadow-black/10' : 'text-gray-400'}`}
         >
           Culto
         </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-10">
         {/* Data (Informativa) */}
         <div className="space-y-2 opacity-50 select-none">
              <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-[#1B3B6B]" size={16} />
              <input 
                type="date" 
                value={data} 
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-white p-6 pl-14 rounded-[2rem] font-black italic uppercase text-xs outline-none border border-gray-100 shadow-sm focus:border-[#1B3B6B]/20 transition-soft" 
              />
         </div>

         {/* Contador de Presentes */}
         <div className="bg-white p-10 rounded-[3.5rem] shadow-premium shadow-[#1B3B6B]/5 border-2 border-dashed border-[#1B3B6B]/10 space-y-6 text-center">
            <div className="flex flex-col items-center gap-3">
               <div className="w-16 h-16 bg-[#1B3B6B]/5 rounded-2xl flex items-center justify-center text-[#1B3B6B]">
                  <Users size={32} />
               </div>
               <h3 className="text-sm font-black text-gray-900 uppercase italic tracking-tighter">Total de Presentes</h3>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Toque nos botões para ajustar</p>
            </div>
            
            <div className="flex items-center justify-around">
               <button type="button" onClick={() => setPresentes(Math.max(0, presentes - 1))} className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center font-black text-2xl active:scale-90 transition-soft">-</button>
               <span className="text-5xl font-black italic tabular-nums tracking-tighter">{presentes}</span>
               <button type="button" onClick={() => setPresentes(presentes + 1)} className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center font-black text-2xl active:scale-90 transition-soft">+</button>
            </div>
         </div>

         <button disabled={loading} type="submit" className="w-full bg-[#1B3B6B] text-white py-7 rounded-[2.5rem] font-black shadow-premium shadow-indigo-600/20 uppercase italic tracking-widest active:scale-95 transition-soft disabled:opacity-50">
           {loading ? <Loader2 className="animate-spin mx-auto" /> : "Confirmar e Enviar"}
         </button>
      </form>
    </div>
  );
}
