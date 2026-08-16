import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, Share2, Copy, Users, CopyCheck, Loader2, ArrowRight, ChevronDown, ChevronUp, Edit2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AdminReports() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [allRelatorios, setAllRelatorios] = useState<any[]>([]);
  const [celulas, setCelulas] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [tipoLink, setTipoLink] = useState<"celula" | "culto" | "evento">("celula");
  const [refName, setRefName] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  const [editingReport, setEditingReport] = useState<any>(null);
  const [editPresentes, setEditPresentes] = useState(0);
  const [editNomesStr, setEditNomesStr] = useState("");
  const [savingReport, setSavingReport] = useState(false);

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
      const [relRes, celRes, profRes] = await Promise.all([
        supabase.from("kefel_relatorios").select("*, kefel_celulas(nome), lider:lider_id(nome)").order('created_at', { ascending: false }).limit(1000),
        supabase.from("kefel_celulas").select("*, lider:lider_id(nome)").order("nome", { ascending: true }),
        supabase.from("kefel_profiles").select("id, nome, celula_id")
      ]);
      setAllRelatorios(relRes.data || []);
      setCelulas(celRes.data || []);
      setAllProfiles(profRes.data || []);
      setLoading(false);
    }
    if (user?.role === 'master') fetchData();
  }, [user]);

  if (user?.role !== 'master') return <div className="p-10 text-center font-black uppercase">Acesso Restrito</div>;

  const formattedRef = refName.trim().replace(/ /g, '_');

  // Gerar lista de opções de semanas/cultos para o seletor (focando no futuro/atual)
  const referenceOptions = React.useMemo(() => {
    const opts = [];
    const d = new Date();
    
    if (tipoLink === 'celula') {
      // Meses anteriores (2 meses atrás)
      for (let mOffset = -2; mOffset <= 1; mOffset++) {
        const targetDate = new Date(d.getFullYear(), d.getMonth() + mOffset, 1);
        const monthName = targetDate.toLocaleDateString('pt-BR', { month: 'long' });
        const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        // Geralmente há até 5 semanas
        for (let i = 1; i <= 5; i++) {
          opts.push(`Semana ${i} - ${capMonth}`);
        }
      }
    } else if (tipoLink === 'culto') {
      // Pega domingos anteriores (12 semanas atrás) até 4 semanas no futuro
      let sunday = new Date(d);
      sunday.setDate(sunday.getDate() - sunday.getDay());
      sunday.setDate(sunday.getDate() - 12 * 7); // Volta 12 semanas
      
      for (let i = 0; i < 17; i++) {
        opts.push(`Culto de Domingo - ${sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`);
        sunday.setDate(sunday.getDate() + 7);
      }
    }
    
    // Adiciona o refName atual se ele não estiver na lista (garantia)
    if (refName && !opts.includes(refName) && tipoLink !== 'evento') {
      opts.unshift(refName);
    }
    return opts;
  }, [tipoLink, refName]);

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

  const handleSaveEdit = async () => {
    if (!editingReport?.report_id) return;
    setSavingReport(true);
    const nomesArray = editNomesStr.split("\n").map(s => s.trim()).filter(s => s);
    
    const { error } = await supabase.from('kefel_relatorios').update({
      presentes: editPresentes,
      presentes_nomes: nomesArray
    }).eq('id', editingReport.report_id);
    
    if (!error) {
      showToast("Relatório atualizado!");
      setAllRelatorios(prev => prev.map(rep => rep.id === editingReport.report_id ? { ...rep, presentes: editPresentes, presentes_nomes: nomesArray } : rep));
      setEditingReport(null);
    } else {
      showToast("Erro ao atualizar", "error");
    }
    setSavingReport(false);
  };

  const handleOpenEdit = (r: any) => {
    setEditingReport(r);
    setEditPresentes(r.presentes);
    setEditNomesStr(r.presentes_nomes.join("\n"));
  };

  // Filtrar os dados que aparecem na lista (Baseado na aba selecionada E na referência digitada)
  // Assim o Admin pode navegar entre semanas apenas trocando o texto do input
  const currentReports = celulas.map(celula => {
    const report = allRelatorios.find(r => r.celula_id === celula.id && r.tipo === tipoLink && r.referencia === formattedRef);
    
    // Para cálculo de porcentagem (comparação com a última célula)
    const lastCellReport = allRelatorios.find(r => r.celula_id === celula.id && r.tipo === 'celula');
    
    return {
      celula,
      report_id: report?.id,
      presentes: report ? report.presentes : 0,
      presentes_nomes: report ? report.presentes_nomes || [] : [],
      meta_exigida: report ? report.meta_exigida : (tipoLink === 'celula' ? celula.meta_celula : tipoLink === 'culto' ? celula.meta_culto : celula.meta_evento),
      enviado: !!report,
      lastCellPresentes: lastCellReport?.presentes || 0
    };
  });

  const totalVidas = currentReports.reduce((acc, curr) => acc + curr.presentes, 0);

  const getShortName = (fullName: string) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(' ');
    if (parts.length > 1) return `${parts[0]} ${parts[1]}`;
    return parts[0];
  };

  const handleShareWhatsApp = () => {
    let msg = ``;
    
    if (tipoLink === 'celula') {
      msg += `*📊 RELATÓRIO DE CÉLULAS*\n`;
    } else if (tipoLink === 'culto') {
      msg += `*📊 RELATÓRIO DO CULTO*\n`;
    } else {
      msg += `*📊 RELATÓRIO DE EVENTO*\n`;
    }

    msg += `📅 *${refName}*\n\n`;

    let totalAusentesGlobais = 0;
    let totalPessoasGlobais = totalVidas; 

    // Primeiro passamos por todas as células para somar os faltantes
    currentReports.forEach(r => {
      if (!r.enviado) return;
      const cellProfiles = allProfiles.filter(p => p.celula_id === r.celula.id);
      const presentesNomes = r.presentes_nomes || [];
      const faltantesNomes = cellProfiles
        .filter(p => !presentesNomes.includes(p.nome))
        .map(p => getShortName(p.nome));
      
      totalAusentesGlobais += faltantesNomes.length;
    });

    totalPessoasGlobais += totalAusentesGlobais;
    const redePercent = totalPessoasGlobais > 0 ? Math.round((totalVidas / totalPessoasGlobais) * 100) : 0;

    msg += `👥 *REDE: ${totalVidas}/${totalPessoasGlobais} • ${redePercent}%*\n\n`;
    msg += `━━━━━━━━━━━━\n\n`;

    currentReports.forEach(r => {
      if (!r.enviado) return; 

      const liderNomeFull = r.celula.lider?.nome || "Sem Líder";
      const liderNome = getShortName(liderNomeFull).toUpperCase();
      
      const presentesNomes = r.presentes_nomes || [];
      const shortPresentes = presentesNomes.map((n: string) => getShortName(n));
      
      const cellProfiles = allProfiles.filter(p => p.celula_id === r.celula.id);
      const faltantesNomes = cellProfiles
        .filter(p => !presentesNomes.includes(p.nome))
        .map(p => getShortName(p.nome));
      
      const cellTotalPessoas = r.presentes + faltantesNomes.length;
      const cellPercent = cellTotalPessoas > 0 ? Math.round((r.presentes / cellTotalPessoas) * 100) : 0;

      const onFire = cellPercent >= 100 ? " 🔥" : "";

      msg += `*${liderNome} — ${r.presentes}/${cellTotalPessoas} • ${cellPercent}%*${onFire}\n`;
      msg += `✅ ${shortPresentes.length > 0 ? shortPresentes.join(', ') : 'Ninguém'}\n`;
      
      if (faltantesNomes.length > 0) {
        msg += `❌ ${faltantesNomes.join(', ')}\n\n`;
      } else {
        msg += `🎉 *Todos presentes!*\n\n`;
      }
    });

    msg += `━━━━━━━━━━━━\n\n`;
    msg += `*⚠️ AUSÊNCIAS*\n`;
    msg += `❌ *${totalAusentesGlobais}* pessoas não estiveram no ${tipoLink === 'celula' ? 'encontro' : tipoLink}.\n\n`;
    
    msg += `*👥 TOTAL DO DISCIPULADO*\n`;
    msg += `✅ *${totalVidas}/${totalPessoasGlobais} • ${redePercent}% de presença*\n\n`;
    
    msg += `Líderes, atenção aos que faltaram. Vamos entrar em contato e cuidar de cada um. ❤️`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-black pt-14 px-6 overflow-y-auto pb-24 transition-colors">
      <header className="flex items-center gap-4 mb-8 pt-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-transparent dark:border-white/5"><ChevronLeft size={20} className="text-gray-900 dark:text-white" /></button>
        <div>
           <h1 className="text-2xl font-black text-gray-900 dark:text-white italic uppercase tracking-tight">Painel Admin</h1>
           <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Gestão de Relatórios</p>
        </div>
      </header>

      {/* CONTROLE CENTRAL (Seletor de Tipo e Semana) */}
      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 mb-6 transition-colors">
         <h3 className="text-sm font-black uppercase text-gray-900 dark:text-white mb-4 flex items-center gap-2">Configuração do Relatório</h3>
         
         <div className="flex gap-2 mb-4 bg-gray-50 dark:bg-black/50 p-1.5 rounded-2xl">
           {(['celula', 'culto', 'evento'] as const).map(t => (
             <button 
               key={t}
               onClick={() => setTipoLink(t)}
               className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${tipoLink === t ? 'bg-white dark:bg-[#2C2C2E] text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-100 dark:border-white/10' : 'text-gray-400 dark:text-gray-500'}`}
             >
               {t}
             </button>
           ))}
         </div>

         <div className="relative mb-4">
           <p className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 ml-2 mb-1">Referência (Ex: Semana / Data)</p>
           {tipoLink === 'evento' ? (
             <input 
               value={refName}
               onChange={(e) => setRefName(e.target.value)}
               className="w-full bg-gray-50 dark:bg-black/50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/50 transition-all border border-gray-100 dark:border-white/5 dark:text-white"
             />
           ) : (
             <select 
               value={refName}
               onChange={(e) => setRefName(e.target.value)}
               className="w-full bg-gray-50 dark:bg-black/50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/50 transition-all border border-gray-100 dark:border-white/5 dark:text-white appearance-none"
             >
               {referenceOptions.map((opt, idx) => (
                 <option key={idx} value={opt}>{opt}</option>
               ))}
             </select>
           )}
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

      <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between mb-6 transition-colors">
        <div>
          <p className="text-4xl font-black text-[#1B3B6B] dark:text-indigo-400 leading-none">{totalVidas}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-1">Total Alcançado</p>
        </div>
        <Users size={32} className="text-gray-100 dark:text-white/5" />
      </div>

      {/* VISÃO GERAL DAS CÉLULAS */}
      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 mb-6 transition-colors">
         <div className="flex justify-between items-center mb-6">
           <div>
             <h3 className="text-sm font-black uppercase text-gray-900 dark:text-white leading-tight">Desempenho Geral</h3>
             <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{refName}</p>
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
             
             let statusColor = "bg-gray-50 border-gray-100 dark:bg-white/5 dark:border-white/5";
             let statusText = "";
             
             if (!r.enviado) {
               statusColor = "bg-gray-50/50 border-dashed border-gray-200 opacity-60 dark:bg-white/5 dark:border-white/10";
               statusText = "Pendente";
             } else if (r.presentes > meta) {
               statusColor = "bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20";
               statusText = `+${r.presentes - meta} da meta`;
             } else if (r.presentes === meta) {
               statusColor = "bg-blue-50 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20";
               statusText = `Meta exata`;
             } else {
               statusColor = "bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20";
               statusText = `-${meta - r.presentes} da meta`;
             }

             return (
               <div key={r.celula.id} className={`flex flex-col p-4 rounded-2xl border ${statusColor} transition-all`}>
                 <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedCell(expandedCell === r.celula.id ? null : r.celula.id)}>
                   <div className="flex-1 min-w-0">
                     <p className="text-xs font-black uppercase truncate text-gray-900 dark:text-white italic">{r.celula.nome}</p>
                     <p className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest">{liderNome}</p>
                   </div>
                   <div className="flex items-center gap-3">
                     <p className={`text-2xl font-black leading-none italic ${r.enviado ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>{r.presentes}</p>
                     {r.enviado && (
                       <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(r); }} className="text-blue-500 p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg active:scale-90 transition-all ml-1" title="Editar Relatório">
                         <Edit2 size={14} />
                       </button>
                     )}
                     {r.presentes_nomes && r.presentes_nomes.length > 0 && (
                       expandedCell === r.celula.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />
                     )}
                   </div>
                 </div>

                 {expandedCell === r.celula.id && r.presentes_nomes && r.presentes_nomes.length > 0 && (
                   <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 animate-in slide-in-from-top-2">
                     <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Lista de Presentes:</p>
                     <div className="flex flex-wrap gap-1.5">
                       {r.presentes_nomes.map((nome: string, idx: number) => (
                         <span key={idx} className="bg-white dark:bg-black/40 text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md shadow-sm border border-gray-100 dark:border-white/5">
                           {nome}
                         </span>
                       ))}
                     </div>
                   </div>
                 )}

                 {r.enviado && (
                   <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                     <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-white/50 dark:bg-black/30 ${
                       r.presentes >= meta ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
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

       {editingReport && (
         <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end">
           <div className="bg-white dark:bg-slate-900 w-full rounded-t-[2.5rem] p-8 pb-10 shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-6">
               <div>
                 <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">Editar Relatório</h2>
                 <p className="text-[10px] font-black uppercase tracking-widest text-[#1B3B6B] dark:text-blue-400 mt-1">{editingReport.celula.nome}</p>
               </div>
               <button onClick={() => setEditingReport(null)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full"><X size={18} className="dark:text-white" /></button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-2">Total de Presentes</label>
                 <input 
                   type="number" 
                   value={editPresentes} 
                   onChange={e => setEditPresentes(parseInt(e.target.value) || 0)} 
                   className="w-full bg-gray-50 dark:bg-slate-800 p-4 rounded-xl font-black text-lg outline-none mt-1 border border-transparent focus:border-indigo-200 dark:text-white" 
                 />
               </div>
               <div>
                 <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-2">Nomes (Um por linha)</label>
                 <textarea 
                   value={editNomesStr} 
                   onChange={e => setEditNomesStr(e.target.value)} 
                   className="w-full bg-gray-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-sm outline-none mt-1 min-h-[120px] border border-transparent focus:border-indigo-200 dark:text-white" 
                   placeholder="João Silva&#10;Maria Souza..."
                 />
               </div>
               <button 
                 disabled={savingReport}
                 onClick={handleSaveEdit}
                 className="w-full bg-[#1B3B6B] text-white py-4 rounded-xl font-black uppercase italic tracking-widest mt-2 active:scale-95 transition-all disabled:opacity-50 flex justify-center"
               >
                 {savingReport ? <Loader2 size={20} className="animate-spin" /> : "Salvar Alterações"}
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
