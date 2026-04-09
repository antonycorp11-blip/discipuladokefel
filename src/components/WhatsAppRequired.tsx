import React, { useState } from "react";
import { Phone, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { motion } from "motion/react";

export function WhatsAppRequired() {
  const { user, setUser, logout } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPhone = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 2) return clean;
    if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const telClean = phone.replace(/\D/g, "");
    if (telClean.length < 10) {
      setError("Por favor, insira um número válido com DDD.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from("kefel_profiles")
        .update({ telefone: telClean })
        .eq("id", user.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      if (data) {
        setUser(data as any);
      }
    } catch (err: any) {
      setError("Falha ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
      <div className="absolute inset-0 bg-[#1B3B6B]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-premium border border-white relative z-10"
      >
        <div className="w-20 h-20 bg-[#1B3B6B]/10 rounded-[2.5rem] flex items-center justify-center text-[#1B3B6B] mb-8 mx-auto">
          <ShieldCheck size={40} />
        </div>

        <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight mb-4">
          Proteja sua Conta
        </h1>
        
        <p className="text-xs font-medium text-gray-500 leading-relaxed mb-10">
          Olá, <span className="text-[#1B3B6B] font-black">{user?.nome}</span>! 
          Para garantir que você nunca perca seu histórico de leitura e medalhas, 
          precisamos vincular seu WhatsApp como identificador único.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Seu WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1B3B6B]" />
              <input
                type="tel"
                required
                autoFocus
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className="w-full bg-gray-50 border-2 border-transparent shadow-inner rounded-[1.8rem] py-6 pl-16 pr-6 focus:bg-white focus:border-[#1B3B6B]/20 focus:outline-none transition-all font-black text-sm text-gray-900 italic"
              />
            </div>
          </div>

          {error && <p className="text-rose-500 text-[10px] font-black uppercase">{error}</p>}

          <button
            type="submit"
            disabled={loading || phone.length < 14}
            className="w-full bg-[#1B3B6B] text-white py-6 rounded-[1.8rem] font-black uppercase italic tracking-widest shadow-xl shadow-[#1B3B6B]/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Salvar e Continuar <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="flex flex-col items-center gap-4 mt-8">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Sua conta será blindada e acessível em qualquer lugar
          </p>
          <button
            onClick={() => {
              if (window.confirm("Deseja realmente sair desta conta?")) {
                logout();
              }
            }}
            className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
          >
            Sair da Conta
          </button>
        </div>
      </motion.div>
    </div>
  );
}
