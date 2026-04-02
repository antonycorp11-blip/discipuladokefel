import React, { useState, useEffect } from "react";
import { 
  Users, Plus, X, 
  Loader2, Trash2, Shield, User,
  Users as UsersIcon, CheckCircle
} from "lucide-react";
import { supabase, type KefelCelula } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function CellManagement() {
  const { user } = useAuth();
  const [celulas, setCelulas] = useState<KefelCelula[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [nome, setNome] = useState("");
  const [diaSemana, setDiaSemana] = useState("Terça-feira");
  const [liderId, setLiderId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [celRes, userRes] = await Promise.all([
      supabase.from("kefel_celulas").select("*").order("nome", { ascending: true }),
      supabase.from("kefel_profiles").select("id, nome").order("nome", { ascending: true })
    ]);
    
    if (!celRes.error) setCelulas(celRes.data as any[]);
    if (!userRes.error) setUsuarios(userRes.data || []);
    setLoading(false);
  }

  async function handleAddCell(e: React.FormEvent) {
    e.preventDefault();
    if (!user || user.role !== "master") return;
    setSaving(true);

    const { error } = await supabase.from("kefel_celulas").insert({
      nome,
      dia_semana: diaSemana,
      lider_id: liderId || null,
      criado_por: user.id
    });

    if (!error) {
      setShowAddForm(false);
      fetchData();
      setNome(""); setLiderId(null);
    } else {
      alert("Erro ao criar: " + error.message);
    }
    setSaving(false);
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir esta célula?")) return;
    const { error } = await supabase.from("kefel_celulas").delete().eq("id", id);
    if (!error) fetchData();
  };

  if (user?.role !== "master" && user?.role !== "lider") {
    return (
      <div className="pt-20 px-6 h-screen bg-[#FDFDFD] flex flex-col items-center justify-center text-center">
        <Shield size={48} className="text-gray-200 mb-4" />
        <h2 className="text-xl font-bold uppercase italic text-gray-900">Acesso Restrito</h2>
        <p className="text-gray-400 text-xs font-medium mt-2">Apenas Master ou Líderes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFD] pt-14 pb-24 px-6 overflow-y-auto">
      <header className="flex justify-between items-center mb-8 sticky top-0 bg-[#FDFDFD]/80 backdrop-blur-md pt-4 z-10">
        <h1 className="text-2xl font-bold text-gray-900 italic uppercase underline decoration-blue-600 decoration-4">Células</h1>
        {user?.role === 'master' && (
          <button onClick={() => setShowAddForm(true)} className="bg-black text-white p-3 rounded-2xl shadow-xl active:scale-95 transition-all">
            <Plus size={20} />
          </button>
        )}
      </header>

      {loading ? <Loader2 className="animate-spin mx-auto text-blue-600" /> : (
        <div className="grid gap-6">
          {celulas.map(c => (
            <div key={c.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><Users size={24} /></div>
                 <div>
                    <h3 className="font-bold text-gray-900">{c.nome}</h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{c.dia_semana}</p>
                 </div>
              </div>
              {user?.role === 'master' && (
                <button onClick={() => handleDelete(c.id)} className="bg-red-50 text-red-500 p-2.5 rounded-xl active:scale-95 transition-all"><Trash2 size={16} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Células */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end animate-in fade-in">
          <div className="bg-white w-full h-[75vh] rounded-t-[3rem] p-8 flex flex-col space-y-6 animate-in slide-in-from-bottom duration-300">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold italic uppercase underline decoration-blue-600 decoration-4">Nova Célula</h2>
                <button onClick={() => setShowAddForm(false)} className="bg-gray-100 p-3 rounded-full"><X size={20} /></button>
             </div>

             <form onSubmit={handleAddCell} className="space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nome da Célula</p>
                   <input required placeholder="EX: CÉLULA FILIPENSES" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-bold italic uppercase text-xs outline-none" />
                </div>

                <div className="space-y-1">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Dia da Semana</p>
                   <select value={diaSemana} onChange={e => setDiaSemana(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-bold italic uppercase text-xs outline-none">
                      {["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"].map(d => (
                         <option key={d} value={d}>{d}</option>
                      ))}
                   </select>
                </div>

                <div className="space-y-1">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Escolher Líder</p>
                   <select value={liderId || ""} onChange={e => setLiderId(e.target.value || null)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-bold italic uppercase text-xs outline-none">
                      <option value="">(SEM LÍDER DEFINIDO)</option>
                      {usuarios.map(u => (
                         <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                   </select>
                </div>

                <button disabled={saving} type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-bold shadow-xl active:scale-95 disabled:opacity-50">
                   {saving ? <Loader2 className="animate-spin mx-auto" /> : "Criar Célula"}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
