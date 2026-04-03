import React, { useState, useEffect } from "react";
import { Users, CheckCircle, Loader2, User } from "lucide-react";
import { supabase, type KefelCelula } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function Onboarding() {
  const { user, showToast, setUser } = useAuth();
  const [celulas, setCelulas] = useState<KefelCelula[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedCell, setSelectedCell] = useState<string>("");
  const [nome, setNome] = useState(user?.nome || "");

  useEffect(() => {
    async function fetchCelulas() {
      const { data } = await supabase.from("kefel_celulas").select("*").order("nome", { ascending: true });
      setCelulas((data || []) as KefelCelula[]);
      setLoading(false);
    }
    fetchCelulas();
  }, []);

  const handleFinish = async () => {
    if (!user || !selectedCell || !nome || saving) return;
    setSaving(true);

    const { data: updated, error } = await supabase
      .from("kefel_profiles")
      .update({ nome, celula_id: selectedCell })
      .eq("id", user.id)
      .select("*")
      .single();

    if (!error) {
      setUser(updated as any);
      showToast("Tudo pronto! Bem-vindo.");
    } else {
      showToast("Erro ao salvar: " + error.message, "error");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col pt-20 px-8 pb-10 overflow-y-auto">
      <div className="flex flex-col items-center text-center mb-10">
         <img src="/logo.png" alt="Kefel" className="w-16 h-16 mb-6" />
         <h1 className="text-3xl font-black italic uppercase tracking-tighter italic underline decoration-blue-600 decoration-8">Bem-vindo!</h1>
         <p className="text-gray-400 text-xs font-black uppercase italic tracking-widest mt-4">Precisamos configurar sua conta para começar.</p>
      </div>

      <div className="space-y-8 flex-1">
         {/* Nome */}
         <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase italic ml-2">Qual seu nome completo?</p>
            <div className="bg-gray-50 p-6 rounded-[2rem] flex items-center gap-4">
               <User className="text-[#1B3B6B] w-5 h-5" />
               <input 
                  placeholder="EX: JOÃO DA SILVA" 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  className="bg-transparent font-black italic uppercase outline-none flex-1 text-sm text-gray-900"
               />
            </div>
         </div>

         {/* Célula */}
         <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase italic ml-2">Qual sua célula de destino?</p>
            {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#1B3B6B]" /></div>
            ) : (
              <div className="grid gap-3">
                {celulas.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => setSelectedCell(c.id)}
                    className={`p-6 rounded-[2.5rem] border-2 transition-all flex items-center justify-between group ${selectedCell === c.id ? 'bg-[#1B3B6B] border-blue-600 text-white shadow-2xl' : 'bg-gray-50 border-transparent text-gray-400'}`}
                  >
                    <div className="flex items-center gap-4">
                       <Users size={18} className={selectedCell === c.id ? 'text-white' : 'text-[#1B3B6B]'} />
                       <span className="font-black italic uppercase text-xs tracking-tighter leading-none">{c.nome}</span>
                    </div>
                    {selectedCell === c.id && <CheckCircle size={18} />}
                  </button>
                ))}
              </div>
            )}
         </div>
      </div>

      <button 
        disabled={!selectedCell || !nome || saving}
        onClick={handleFinish}
        className="w-full bg-black text-white py-8 rounded-[2.5rem] font-black shadow-2xl mt-10 active:scale-95 disabled:opacity-20 uppercase text-xs tracking-[0.2em] italic"
      >
        {saving ? <Loader2 className="animate-spin" /> : "Concluir Cadastro"}
      </button>
    </div>
  );
}
