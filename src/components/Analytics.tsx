import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, TrendingUp, TrendingDown, Users, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    growthCelula: 0,
    growthCulto: 0,
    totalAtivos: 0,
    inativos: [] as any[]
  });

  useEffect(() => {
    async function fetchData() {
      // Data Limits
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(today.getDate() - 60);

      const [profRes, celRes, relRes] = await Promise.all([
        supabase.from("kefel_profiles").select("id, nome, celula_id, telefone"),
        supabase.from("kefel_celulas").select("id, nome, lider:lider_id(nome)"),
        supabase.from("kefel_relatorios").select("*").gte('data', sixtyDaysAgo.toISOString().split('T')[0])
      ]);

      const profiles = (profRes.data || []) as any[];
      const cells = (celRes.data || []) as any[];
      const relatorios = (relRes.data || []) as any[];

      // Separar relatórios em: último mês (0-30 dias) e mês anterior (31-60 dias)
      const last30 = relatorios.filter(r => new Date(r.data) >= thirtyDaysAgo);
      const prev30 = relatorios.filter(r => new Date(r.data) < thirtyDaysAgo && new Date(r.data) >= sixtyDaysAgo);

      // Calcular crescimento médio (Células)
      const celulaLast30 = last30.filter(r => r.tipo === 'celula').reduce((acc, curr) => acc + curr.presentes, 0);
      const celulaPrev30 = prev30.filter(r => r.tipo === 'celula').reduce((acc, curr) => acc + curr.presentes, 0);
      const growthCelula = celulaPrev30 > 0 ? ((celulaLast30 - celulaPrev30) / celulaPrev30) * 100 : 100;

      // Calcular crescimento médio (Cultos)
      const cultoLast30 = last30.filter(r => r.tipo === 'culto').reduce((acc, curr) => acc + curr.presentes, 0);
      const cultoPrev30 = prev30.filter(r => r.tipo === 'culto').reduce((acc, curr) => acc + curr.presentes, 0);
      const growthCulto = cultoPrev30 > 0 ? ((cultoLast30 - cultoPrev30) / cultoPrev30) * 100 : 100;

      // Detectar membros inativos (não aparecem em NENHUM relatório dos últimos 30 dias)
      // Juntar todos os nomes presentes nos últimos 30 dias
      const nomesPresentes = new Set<string>();
      last30.forEach(r => {
        if (r.presentes_nomes) {
          r.presentes_nomes.forEach((n: string) => nomesPresentes.add(n));
        }
      });

      const inativos = profiles.filter(p => !nomesPresentes.has(p.nome)).map(p => {
        const celula = cells.find(c => c.id === p.celula_id);
        return {
          ...p,
          celula_nome: celula?.nome || "Sem Célula",
          lider_nome: celula?.lider?.nome || "Sem Líder"
        };
      });

      setMetrics({
        growthCelula,
        growthCulto,
        totalAtivos: profiles.length - inativos.length,
        inativos
      });

      setLoading(false);
    }
    if (user?.role === 'master') fetchData();
  }, [user]);

  if (user?.role !== 'master') return <div className="p-10 text-center font-black uppercase">Acesso Restrito</div>;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  const getShortName = (fullName: string) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(' ');
    if (parts.length > 1) return `${parts[0]} ${parts[1]}`;
    return parts[0];
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-black pt-14 px-6 overflow-y-auto pb-24 transition-colors">
      <header className="flex items-center gap-4 mb-8 pt-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-transparent dark:border-white/5"><ChevronLeft size={20} className="text-gray-900 dark:text-white" /></button>
        <div>
           <h1 className="text-2xl font-black text-gray-900 dark:text-white italic uppercase tracking-tight">Análise</h1>
           <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Visão Estratégica</p>
        </div>
      </header>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Células Growth */}
        <div className={`p-5 rounded-[2rem] border ${metrics.growthCelula >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20'}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-[10px] font-black uppercase tracking-widest ${metrics.growthCelula >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>Células</p>
            {metrics.growthCelula >= 0 ? <TrendingUp size={20} className="text-emerald-500" /> : <TrendingDown size={20} className="text-rose-500" />}
          </div>
          <h3 className={`text-3xl font-black tracking-tighter ${metrics.growthCelula >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
            {metrics.growthCelula >= 0 ? '+' : ''}{metrics.growthCelula.toFixed(1)}%
          </h3>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-1 text-gray-500">Últimos 30 vs 60 dias</p>
        </div>

        {/* Cultos Growth */}
        <div className={`p-5 rounded-[2rem] border ${metrics.growthCulto >= 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' : 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20'}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-[10px] font-black uppercase tracking-widest ${metrics.growthCulto >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>Cultos</p>
            {metrics.growthCulto >= 0 ? <TrendingUp size={20} className="text-indigo-500" /> : <TrendingDown size={20} className="text-orange-500" />}
          </div>
          <h3 className={`text-3xl font-black tracking-tighter ${metrics.growthCulto >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-orange-700 dark:text-orange-300'}`}>
            {metrics.growthCulto >= 0 ? '+' : ''}{metrics.growthCulto.toFixed(1)}%
          </h3>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-1 text-gray-500">Últimos 30 vs 60 dias</p>
        </div>
      </div>

      {/* RADAR DE AUSENTES */}
      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 transition-colors">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-white/10">
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black italic uppercase tracking-tighter text-gray-900 dark:text-white">Radar de Ausentes</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Não comparecem há 30 dias</p>
          </div>
        </div>

        {metrics.inativos.length === 0 ? (
          <p className="text-sm font-bold text-gray-400 text-center py-4">Todos os membros estão ativos! 🎉</p>
        ) : (
          <div className="space-y-4">
            {metrics.inativos.map((membro) => (
              <div key={membro.id} className="flex flex-col p-4 rounded-2xl bg-gray-50 dark:bg-black/50 border border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-black uppercase text-gray-900 dark:text-white">{membro.nome}</h3>
                  <a href={`https://wa.me/55${membro.telefone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors">
                    Chamar
                  </a>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">Célula: {membro.celula_nome}</span>
                  <span className="text-[10px] font-bold text-gray-500 bg-white border border-gray-100 px-2 py-1 rounded-md">Líder: {getShortName(membro.lider_nome)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
