import React, { useState, useEffect } from "react";
import { Mail, Lock, ArrowRight, Eye, EyeOff, User, ChevronLeft, LayoutGrid, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase, type KefelCelula } from "@/lib/supabase";
import { motion, AnimatePresence } from "motion/react";

type LoginStep = 'selection' | 'nameInput' | 'admin';

export function Login() {
  const [step, setStep] = useState<LoginStep>('selection');
  const [cells, setCells] = useState<KefelCelula[]>([]);
  const [selectedCell, setSelectedCell] = useState<KefelCelula | null>(null);
  
  // Member states
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  
  // Admin states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, signInMember } = useAuth();

  useEffect(() => {
    fetchCells();
  }, []);

  async function fetchCells() {
    const { data } = await supabase.from("kefel_celulas").select("*").order("nome");
    if (data) {
      const celulas = data as KefelCelula[];
      setCells(celulas);
      
      // Recuperação inteligente de dados locais
      const savedData = localStorage.getItem('kefel_member_data');
      if (savedData) {
         try {
           const { nome, celula_id } = JSON.parse(savedData);
           if (nome) setMemberName(nome);
           if (celula_id) {
              const cell = celulas.find(c => c.id === celula_id);
              if (cell) {
                 setSelectedCell(cell);
                 setStep('nameInput');
              }
           }
         } catch (e) {
           console.error("Erro ao recuperar dados locais:", e);
         }
      }
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message || "Credenciais inválidas.");
    }
    setLoading(false);
  };

  const handleMemberSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell || !memberName.trim()) return;
    setError(null);
    setLoading(true);
    const result = await signInMember(memberName.trim(), selectedCell.id, memberPhone.trim());
    if (!result.success) {
      setError(result.message || "Erro ao entrar.");
    }
    setLoading(false);
  };

  const selectCell = (cell: KefelCelula) => {
    setSelectedCell(cell);
    setStep('nameInput');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-100 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[40%] bg-[#1B3B6B]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[40%] bg-[#1B3B6B]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Discrete Admin Toggle */}
      <div className="absolute top-12 right-6 z-50">
        <button 
          onClick={() => setStep(step === 'admin' ? 'selection' : 'admin')}
          className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-md border border-white shadow-sm rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#1B3B6B] transition-all active:scale-95"
        >
          {step === 'admin' ? <LayoutGrid size={12} /> : <ShieldCheck size={12} />}
          {step === 'admin' ? "Voltar" : "Admin"}
        </button>
      </div>

      {/* Header Central */}
      <motion.div 
        layout
        className="flex flex-col items-center pt-20 pb-8 px-8 z-10"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-[#1B3B6B]/20 blur-3xl rounded-full" />
          <img
            src="/logo.png"
            alt="Kefel Discipulado"
            className="w-32 h-32 object-contain relative z-10"
            draggable={false}
          />
        </motion.div>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mt-6"
        >
          {/* Textos removidos conforme solicitado pois já constam na logo */}
        </motion.div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 px-6 pb-20 z-10 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xs font-black uppercase text-gray-900 tracking-widest italic">Escolha sua Célula</h2>
                <span className="h-[1px] flex-1 bg-gray-200 ml-4 opacity-50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {cells.length === 0 ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-[2rem] animate-pulse" />
                  ))
                ) : (
                  cells.map((cell) => (
                    <motion.button
                      key={cell.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectCell(cell)}
                      className="group relative flex flex-col items-center bg-white border border-white shadow-premium p-5 rounded-[2.5rem] transition-all hover:border-[#1B3B6B]/30 hover:shadow-2xl hover:shadow-[#1B3B6B]/10 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1B3B6B]/0 to-[#1B3B6B]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-16 h-16 rounded-2xl bg-gray-50 mb-3 flex items-center justify-center overflow-hidden border border-gray-50 shadow-inner group-hover:shadow-soft transition-all">
                        {cell.imagem_url ? (
                          <img src={cell.imagem_url} alt={cell.nome} className="w-full h-full object-cover" />
                        ) : (
                          <LayoutGrid size={24} className="text-gray-200" />
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-800 text-center line-clamp-1 italic px-1">
                        {cell.nome}
                      </span>
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {step === 'nameInput' && selectedCell && (
            <motion.div
              key="nameInput"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => setStep('selection')}
                  className="mb-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft size={14} /> Mudar Célula
                </button>
                
                <div className="w-24 h-24 rounded-3xl bg-white shadow-premium p-3 border border-white mb-4">
                  <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-50">
                    <img src={selectedCell.imagem_url || ""} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
                <h2 className="text-lg font-black italic uppercase text-gray-900">{selectedCell.nome}</h2>
                <div className="h-1 w-8 bg-[#1B3B6B] rounded-full mt-2" />
              </div>

              <form onSubmit={handleMemberSignup} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Como podemos te chamar?</label>
                  <div className="relative">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1B3B6B]" />
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="SEU NOME COMPLETO"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="w-full bg-white border-2 border-transparent shadow-premium rounded-[1.8rem] py-6 pl-16 pr-6 focus:border-[#1B3B6B]/20 focus:outline-none transition-all font-black text-xs uppercase italic text-gray-900 tracking-tight"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Número do seu WhatsApp</label>
                  <div className="relative">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1B3B6B]" />
                    <input
                      type="tel"
                      required
                      placeholder="(00) 00000-0000"
                      value={memberPhone}
                      onChange={(e) => setMemberPhone(e.target.value)}
                      className="w-full bg-white border-2 border-transparent shadow-premium rounded-[1.8rem] py-6 pl-16 pr-6 focus:border-[#1B3B6B]/20 focus:outline-none transition-all font-black text-xs uppercase italic text-gray-900 tracking-tight"
                    />
                  </div>
                </div>

                {error && <div className="text-rose-500 text-[10px] font-black uppercase text-center">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B3B6B] text-white py-6 rounded-[1.8rem] font-black uppercase italic tracking-[0.2em] shadow-premium shadow-[#1B3B6B]/20 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>Entrar na Célula <ArrowRight size={18} /></>}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-sm font-black uppercase italic tracking-widest text-gray-900">Acesso Discipulador</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Apenas para líderes autorizados</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-gray-100 shadow-premium rounded-[1.5rem] py-5 pl-16 pr-6 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all font-medium text-sm text-gray-900"
                      placeholder="exemplo@kefel.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-gray-100 shadow-premium rounded-[1.5rem] py-5 pl-16 pr-12 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all font-medium text-sm text-gray-900"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && <div className="text-rose-500 text-[10px] font-black uppercase text-center">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 text-white py-6 rounded-[1.5rem] font-black uppercase italic tracking-widest shadow-2xl shadow-black/20 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>Autenticar <ArrowRight size={18} /></>}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
