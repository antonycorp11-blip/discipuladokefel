import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, Share2, Copy, BarChart3, TrendingUp, Users, CopyCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AdminReports() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [celulas, setCelulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Link Generator
  const getWeekName = () => {
    const d = new Date();
    const weekNum = Math.ceil(d.getDate() / 7);
    const month = d.toLocaleDateString('pt-BR', { month: 'long' });
    return `Semana ${weekNum} - ${month.charAt(0).toUpperCase() + month.slice(1)}`;
  };
  
  const [refName, setRefName] = useState(getWeekName());
  const [tipoLink, setTipoLink] = useState("celula");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [relRes, celRes] = await Promise.all([
        supabase.from("kefel_relatorios").select("*, kefel_celulas(nome), kefel_profiles(nome)").order('created_at', { ascending: false }).limit(500),
        supabase.from("kefel_celulas").select("*")
      ]);
      setRelatorios((relRes.data as any[]) || []);
      setCelulas((celRes.data as any[]) || []);
      setLoading(false);
    }
    if (user?.role === 'master') {
      fetchData();
    }
  }, [user]);

  if (user?.role !== 'master') {
    return <div className="p-10 text-center font-black uppercase">Acesso Restrito</div>;
  }

  const handleGenerateLink = () => {
    if (!refName) {
      showToast("Digite a referência (Ex: Semana 3)", "error");
      return;
    }
    const formattedRef = refName.trim().replace(/ /g, '_');
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

  const totalVidas = relatorios.reduce((acc, curr) => acc + (curr.presentes || 0), 0);
  const metasBatidas = relatorios.filter(r => (r.presentes || 0) >= (r.meta_exigida || 1)).length;

  const handleShareWhatsApp = () => {
    let msg = `📊 *RESUMO KÉFEL DISCIPULADO*\n\n`;
    msg += `👥 *Total de Vidas Alcançadas:* ${totalVidas}\n`;
    msg += `🎯 *Relatórios na Meta:* ${metasBatidas}/${relatorios.length}\n\n`;
    
    // Agrupar por referência para ter métricas
    const porRef: Record<string, number> = {};
    relatorios.forEach(r => {
      const chave = `${r.tipo.toUpperCase()} - ${r.referencia?.replace(/_/g, ' ') || r.data}`;
      porRef[chave] = (porRef[chave] || 0) + (r.presentes || 0);
    });

    Object.entries(porRef).forEach(([ref, total]) => {
      msg += `🔹 *${ref}:* ${total} pessoas\n`;
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

      {/* GERADOR DE LINKS */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-6">
         <h3 className="text-sm font-black uppercase text-gray-900 mb-4 flex items-center gap-2"><Share2 size={16} className="text-indigo-500" /> Gerador de Link Mágico</h3>
         
         <div className="flex gap-2 mb-4">
           {['celula', 'culto', 'evento'].map(t => (
             <button 
               key={t}
               onClick={() => setTipoLink(t)}
               className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${tipoLink === t ? 'bg-black text-white' : 'bg-gray-50 text-gray-400'}`}
             >
               {t}
             </button>
           ))}
         </div>

         <div className="relative mb-4">
           <input 
             placeholder="Ex: Semana 1 - Abril" 
             value={refName}
             onChange={(e) => setRefName(e.target.value)}
             className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100"
           />
           <button 
             onClick={() => setRefName(getWeekName())}
             className="absolute right-3 top-3 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1.5 rounded-lg active:scale-95"
           >
             Semana Atual
           </button>
         </div>

         <button 
           onClick={handleGenerateLink}
           className="w-full bg-indigo-50 text-indigo-600 font-black uppercase text-xs py-4 rounded-xl active:scale-95 transition-all"
         >
           Gerar Link Exclusivo
         </button>

         {generatedLink && (
           <div className="mt-4 p-4 bg-gray-900 text-white rounded-xl flex items-center justify-between gap-4">
             <div className="truncate text-xs font-medium opacity-80">{generatedLink}</div>
             <button onClick={handleCopyLink} className="p-2 bg-white/20 rounded-lg active:scale-90 transition-all">
               {copied ? <CopyCheck size={16} /> : <Copy size={16} />}
             </button>
           </div>
         )}
      </div>

      {/* DASHBOARD METRICS */}
      <div className="grid grid-cols-2 gap-4 mb-6">
         <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
           <Users size={20} className="text-indigo-500 mb-3" />
           <p className="text-3xl font-black text-gray-900">{totalVidas}</p>
           <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total Alcançado</p>
         </div>
         <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
           <TrendingUp size={20} className="text-emerald-500 mb-3" />
           <p className="text-3xl font-black text-gray-900">{metasBatidas}</p>
           <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Metas Atingidas</p>
         </div>
      </div>

      {/* RECENT REPORTS */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-6">
         <div className="flex justify-between items-center mb-6">
           <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2"><BarChart3 size={16} className="text-indigo-500" /> Preenchimentos Recentes</h3>
           <button onClick={handleShareWhatsApp} className="bg-emerald-50 text-emerald-600 p-2 rounded-xl" title="Exportar WhatsApp">
             <Share2 size={16} />
           </button>
         </div>

         <div className="space-y-4">
           {loading ? <div className="text-center py-10"><Loader2 className="animate-spin text-indigo-500 mx-auto" /></div> : null}
           {relatorios.map((r) => {
             const isMeta = (r.presentes || 0) >= (r.meta_exigida || 1);
             return (
               <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                 <div className="flex-1 min-w-0">
                   <p className="text-xs font-black uppercase truncate text-gray-800">{r.kefel_celulas?.nome || "Sem Célula"}</p>
                   <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{r.tipo} • {r.referencia?.replace(/_/g, ' ') || 'S/ Ref'}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-lg font-black text-gray-900">{r.presentes}</p>
                   <p className={`text-[8px] font-black uppercase tracking-widest ${isMeta ? 'text-emerald-500' : 'text-rose-500'}`}>
                     Meta: {r.meta_exigida || '-'}
                   </p>
                 </div>
               </div>
             )
           })}
           {!loading && relatorios.length === 0 && (
             <p className="text-center text-xs font-black uppercase text-gray-400 py-10">Nenhum relatório recebido.</p>
           )}
         </div>
      </div>
    </div>
  );
}
