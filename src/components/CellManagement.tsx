import React, { useState, useEffect } from "react";
import { 
  Users, MapPin, Calendar, Plus, X, 
  Loader2, Trash2, Shield, User,
  CheckCircle, 
  Trash
} from "lucide-react";
import { supabase, type KefelCelula } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function CellManagement() {
  const { user } = useAuth();
  const [celulas, setCelulas] = useState<KefelCelula[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [nome, setNome] = useState("");
  const [diaSemana, setDiaSemana] = useState("Terça-feira");
  const [liderNome, setLiderNome] = useState("");

  useEffect(() => {
    fetchCelulas();
  }, []);

  async function fetchCelulas() {
    setLoading(true);
    const { data, error } = await supabase.from("kefel_celulas").select("*").order("nome", { ascending: true });
    if (!error) setCelulas(data as KefelCelula[]);
    setLoading(false);
  }

  async function handleAddCell(e: React.FormEvent) {
    e.preventDefault();
    if (!user || user.role !== "master") return;
    setSaving(true);

    const { error } = await supabase.from("kefel_celulas").insert({
      nome,
      dia_semana: diaSemana,
      lider_nome: liderNome, // Guardamos o nome do lider diretamente se necessário
      criado_por: user.id
    });

    if (!error) {
      setShowAddForm(false);
      fetchCelulas();
      setNome(""); setLiderNome("");
    } else {
      alert("Erro ao criar: " + error.message);
    }
    setSaving(false);
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir esta célula? Isso afetará todos os membros vinculados.")) return;
    const { error } = await supabase.from("kefel_celulas").delete().eq("id", id);
    if (!error) fetchCelulas();
  };

  if (user?.role !== "master") {
    return (
      <div className="pt-14 px-6 h-screen bg-[#FDFDFD] flex flex-col items-center justify-center text-center">
        <Shield size={48} className="text-gray-200 mb-4" />
        <h2 className="text-xl font-black uppercase italic text-gray-900">Acesso Restrito</h2>
        <p className="text-gray-400 text-[10px] font-black uppercase italic mt-2">Apenas o Master pode gerenciar células.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFD] pt-14 pb-24 px-6 overflow-y-auto">
      <header className="flex justify-between items-center mb-8 sticky top-0 bg-[#FDFDFD]/80 backdrop-blur-md pt-4 z-10">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase underline decoration-green-600 decoration-4">Células</h1>
        </div>
        <button 
          onClick={() => setShowAddForm(true)} 
          className="bg-black text-white p-4 rounded-[1.5rem] shadow-2xl active:scale-90 transition-all border border-gray-800"
        >
          <Plus size={20} className="text-green-400" />
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-green-600" /></div>
      ) : celulas.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100">
           <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-400 text-[10px] font-black uppercase italic tracking-widest">Nenhuma célula cadastrada</p>
        </div>
      ) : (
        <div className="grid gap-6 pb-10">
          {celulas.map((c) => (
            <div key={c.id} className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="bg-green-100 w-14 h-14 rounded-2xl flex items-center justify-center text-green-600">
                   <Users size={24} />
                </div>
                <div>
                   <h3 className="text-xl font-black text-gray-900 italic uppercase leading-none mb-1 underline decoration-green-400 decoration-2">{c.nome}</h3>
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest">{c.dia_semana}</span>
                   </div>
                </div>
              </div>
              <button onClick={() => handleDelete(c.id)} className="bg-red-50 text-red-500 p-3 rounded-2xl active:scale-95">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Célula */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end animate-in fade-in">
          <div className="bg-white w-full h-[70vh] rounded-t-[3.5rem] p-8 flex flex-col space-y-6 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-black text-gray-900 italic uppercase">Nova Célula</h2>
               <button onClick={() => setShowAddForm(false)} className="bg-gray-100 p-3 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddCell} className="space-y-6">
              <div className="space-y-4">
                 <div className="space-y-1">
                   <p className="text-[9px] font-black text-gray-400 uppercase ml-4">Nome da Célula</p>
                   <input required placeholder="EX: CÉLULA FILIPENSES" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-black italic uppercase text-xs border-2 border-transparent focus:border-green-600 outline-none transition-all" />
                 </div>

                 <div className="space-y-1">
                   <p className="text-[9px] font-black text-gray-400 uppercase ml-4">Dia da Semana</p>
                   <select value={diaSemana} onChange={e => setDiaSemana(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-black italic uppercase text-xs outline-none">
                      {["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                   </select>
                 </div>

                 <div className="space-y-1">
                   <p className="text-[9px] font-black text-gray-400 uppercase ml-4">Nome do Líder (Opcional)</p>
                   <input placeholder="EX: JOÃO SILVA" value={liderNome} onChange={e => setLiderNome(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-black italic uppercase text-xs outline-none" />
                 </div>
              </div>

              <button disabled={saving} type="submit" className="w-full bg-green-600 text-white py-8 rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest italic disabled:opacity-50 active:scale-95">
                {saving ? <Loader2 className="animate-spin" /> : "Criar Célula"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
