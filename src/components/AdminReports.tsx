import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, Share2, Copy, Users, CopyCheck, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AdminReports() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [allRelatorios, setAllRelatorios] = useState<any[]>([]);
  const [celulas, setCelulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [tipoLink, setTipoLink] = useState<"celula" | "culto" | "evento">("celula");
  const [refName, setRefName] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Auto-fill reference based on type
  useEffect(() => {
    const d = new Date();
    if (tipoLink === "celula") {
      const weekNum = Math.ceil(d.getDate() / 7);
      const month = d.toLocaleDateString('pt-BR', { month: 'long' });
      setRefName(`Semana ${weekNum} - ${month.charAt(0).toUpperCase() + month.slice(1)}`);
    } else if (tipoLink === "culto") {
      // Pega o domingo atual ou anterior
      const day = d.getDay();
      const diff = d.getDate() - day;
      const sunday = new Date(d.setDate(diff));
      setRefName(`Culto de Domingo - ${sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`);
    } else {
      setRefName("Nome do Evento");
    }
  }, [tipoLink]);

  useEffect(() => {
    async function fetchData() {
      const [relRes, celRes] = await Promise.all([
        supabase.from("kefel_relatorios").select("*, kefel_celulas(nome), lider:lider_id(nome)").order('created_at', { ascending: false }).limit(1000),
        supabase.from("kefel_celulas").select("*, lider:lider_id(nome)").order("nome", { ascending: true })
      ]);
      setAllRelatorios(relRes.data || []);
      setCelulas(celRes.data || []);
      setLoading(false);
    }
    if (user?.role === 'master') fetchData();
  }, [user]);

  if (user?.role !== 'master') return <div className="p-10 text-center font-black uppercase">Acesso Restrito</div>;

  const formattedRef = refName.trim().replace(/ /g, '_');

  const handleGenerateLink = () => {
    if (!refName || refName === "Nome do Evento") {
      showToast("Digite uma referência válida", "error");
      return;
    }
    const link = `${window.location.origin}/relatorio/${tipoLink}?ref=${formattedRef}`;
    setGeneratedLink(link);
    setCopied(false);
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      showToast("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filtrar os dados que aparecem na lista (Baseado na aba selecionada E na referência digitada)
  // Assim o Admin pode navegar entre semanas apenas trocando o texto do input
  const currentReports = celulas.map(celula => {
    const report = allRelatorios.find(r => r.celula_id === celula.id && r.tipo === tipoLink && r.referencia === formattedRef);
    
    // Para cálculo de porcentagem (comparação com a última célula)
    const lastCellReport = allRelatorios.find(r => r.celula_id === celula.id && r.tipo === 'celula');
    
    return {
      celula,
      presentes: report ? report.presentes : 0,
      meta_exigida: report ? report.meta_exigida : (tipoLink === 'celula' ? celula.meta_celula : tipoLink === 'culto' ? celula.meta_culto : celula.meta_evento),
      enviado: !!report,
      lastCellPresentes: lastCellReport?.presentes || 0
    };
  });

  const totalVidas = currentReports.reduce((acc, curr) => acc + curr.presentes, 0);

  const handleShareWhatsApp = () => {
    let msg = ``;
    
    if (tipoLink === 'celula') {
      msg += `📊 *RELATÓRIO DE CÉLULAS DISCIPULADO KÉFEL*\n🗓️ *${refName}*\n\n`;
    } else if (tipoLink === 'culto') {
      msg += `📊 *RELATÓRIO DE CULTO DISCIPULADO KÉFEL*\n🗓️ *${refName}*\n\n`;
    } else {
      msg += `📊 *RELATÓRIO DE EVENTO: ${refName.toUpperCase()}*\n\n`;
    }

    msg += `👥 *Total de Vidas:* ${totalVidas}\n\n`;
    msg += `*CÉLULAS:*\n`;

    currentReports.forEach(r => {
      const liderNome = r.celula.lider?.nome?.split(' ')[0] || "Sem Líder";
      if (!r.enviado) {
        msg += `🔹 ${r.celula.nome} (Líder ${liderNome}): Pendente (0)\n`;
      } else {
        let percentText = "";
        if (tipoLink === 'culto' && r.lastCellPresentes > 0) {
          const perc = Math.round((r.presentes / r.lastCellPresentes) * 100);
          percentText = ` [${perc}% da Célula]`;
        }
        msg += `🔹 ${r.celula.nome} (Líder ${liderNome}): ${r.presentes} pessoas${percentText}\n`;
      }
    });

    msg += `\n*DESEMPENHO DAS METAS:*\n`;
    currentReports.forEach(r => {
      if (!r.enviado) return;
      const liderNome = r.celula.lider?.nome?.split(' ')[0] || "Sem Líder";
      const meta = r.meta_exigida || 1;
      
      if (r.presentes > meta) {
        msg += `🏆 ${liderNome} superou a meta em ${r.presentes - meta} pessoas!\n`;
      } else if (r.presentes === meta) {
        msg += `🎯 ${liderNome} alcançou a meta na mosca!\n`;
      } else {
        msg += `⚠️ ${liderNome}: Faltaram ${meta - r.presentes} pessoas para bater a meta.\n`;
      }
    });

    msg += `\n🚀 _"Multiplicando líderes, salvando vidas!"_`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 pt-14 px-6 overflow-y-auto pb-24">
      <header className="flex items-center gap-4 mb-8 pt-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm"><ChevronLeft size={20} className="text-gray-900" /></button>
        <div>
           <h1 className="text-2xl font-black text-gray-900 italic uppercase tracking-tight">Painel Admin</h1>
           <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Gestão de Relatórios</p>
        </div>
      </header>

      {/* CONTROLE CENTRAL (Seletor de Tipo e Semana) */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-6">
         <h3 className="text-sm font-black uppercase text-gray-900 mb-4 flex items-center gap-2">Configuração do Relatório</h3>
         
         <div className="flex gap-2 mb-4 bg-gray-50 p-1.5 rounded-2xl">
           {(['celula', 'culto', 'evento'] as const).map(t => (
             <button 
               key={t}
               onClick={() => setTipoLink(t)}
               className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${tipoLink === t ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400'}`}
             >
               {t}
             </button>
           ))}
         </div>

         <div className="relative mb-4">
           <p className="text-[9px] font-black uppercase text-gray-400 ml-2 mb-1">Referência (Ex: Semana / Data)</p>
           <input 
             value={refName}
             onChange={(e) => setRefName(e.target.value)}
             className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all border border-gray-100"
           />
         </div>

         <button 
           onClick={handleGenerateLink}
           className="w-full bg-[#1B3B6B] text-white font-black uppercase text-xs py-4 rounded-xl active:scale-95 transition-all shadow-lg shadow-[#1B3B6B]/20"
         >
           Gerar Link Mágico
         </button>

         {generatedLink && (
           <div className="mt-4 p-4 bg-gray-900 text-white rounded-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
             <div className="truncate text-xs font-medium opacity-80">{generatedLink}</div>
             <button onClick={handleCopyLink} className="p-2 bg-white/20 rounded-lg active:scale-90 transition-all">
               {copied ? <CopyCheck size={16} className="text-emerald-400" /> : <Copy size={16} />}
             </button>
           </div>
         )}
      </div>

      <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between mb-6">
        <div>
          <p className="text-4xl font-black text-[#1B3B6B] leading-none">{totalVidas}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Total Alcançado</p>
        </div>
        <Users size={32} className="text-gray-100" />
      </div>

      {/* VISÃO GERAL DAS CÉLULAS */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-6">
         <div className="flex justify-between items-center mb-6">
           <div>
             <h3 className="text-sm font-black uppercase text-gray-900 leading-tight">Desempenho Geral</h3>
             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{refName}</p>
           </div>
           <button onClick={handleShareWhatsApp} className="bg-[#25D366]/10 text-[#25D366] p-3 rounded-2xl hover:bg-[#25D366]/20 transition-colors" title="Exportar WhatsApp">
             <Share2 size={18} />
           </button>
         </div>

         <div className="space-y-3">
           {loading ? <div className="text-center py-10"><Loader2 className="animate-spin text-indigo-500 mx-auto" /></div> : null}
           {!loading && currentReports.map((r) => {
             const liderNome = r.celula.lider?.nome?.split(' ')[0] || "Sem Líder";
             const meta = r.meta_exigida || 1;
             
             let statusColor = "bg-gray-50 border-gray-100";
             let statusText = "";
             
             if (!r.enviado) {
               statusColor = "bg-gray-50/50 border-dashed border-gray-200 opacity-60";
               statusText = "Pendente";
             } else if (r.presentes > meta) {
               statusColor = "bg-emerald-50 border-emerald-100";
               statusText = `+${r.presentes - meta} da meta`;
             } else if (r.presentes === meta) {
               statusColor = "bg-blue-50 border-blue-100";
               statusText = `Meta exata`;
             } else {
               statusColor = "bg-rose-50 border-rose-100";
               statusText = `-${meta - r.presentes} da meta`;
             }

             return (
               <div key={r.celula.id} className={`flex flex-col p-4 rounded-2xl border ${statusColor} transition-all`}>
                 <div className="flex items-center justify-between">
                   <div className="flex-1 min-w-0">
                     <p className="text-xs font-black uppercase truncate text-gray-900 italic">{r.celula.nome}</p>
                     <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{liderNome}</p>
                   </div>
                   <div className="text-right">
                     <p className={`text-2xl font-black leading-none italic ${r.enviado ? 'text-gray-900' : 'text-gray-300'}`}>{r.presentes}</p>
                   </div>
                 </div>

                 {r.enviado && (
                   <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5">
                     <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-white/50 ${
                       r.presentes >= meta ? 'text-emerald-600' : 'text-rose-500'
                     }`}>
                       {statusText}
                     </span>
                     
                     {tipoLink === 'culto' && r.lastCellPresentes > 0 && (
                       <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                         <ArrowRight size={10} />
                         {Math.round((r.presentes / r.lastCellPresentes) * 100)}% da Célula
                       </span>
                     )}
                   </div>
                 )}
               </div>
             )
           })}
         </div>
      </div>
    </div>
  );
}
