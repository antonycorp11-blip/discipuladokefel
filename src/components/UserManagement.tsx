import React, { useState, useEffect } from "react";
import { 
  Users, X, Search, Trash2, 
  MessageCircle, Phone, Calendar, 
  Loader2, User, ChevronRight, Filter,
  Award, CheckCircle2, XCircle, Bell
} from "lucide-react";
import { supabase, type KefelProfile } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

export function UserManagement() {
  const { user: currentUser, showToast, deleteProfile } = useAuth();
  const [users, setUsers] = useState<KefelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [badgeRequests, setBadgeRequests] = useState<any[]>([]);
  const [reviewingBadge, setReviewingBadge] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchBadgeRequests();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("kefel_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setUsers(data as KefelProfile[]);
    } else {
      showToast("Erro ao carregar usuários", "error");
    }
    setLoading(false);
  }

  async function fetchBadgeRequests() {
    const { data } = await supabase
      .from("kefel_badge_requests")
      .select("*, kefel_profiles(nome, avatar_url)")
      .eq("status", "pendente")
      .order("created_at", { ascending: true });
    setBadgeRequests(data || []);
  }

  const BADGE_LABELS: Record<string, string> = {
    lider: "Líder de Célula",
    discipulador: "Discipulador",
  };

  const handleApproveBadge = async (req: any) => {
    setReviewingBadge(req.id);
    // 1. Buscar badges atuais do usuário
    const { data: profData } = await supabase
      .from("kefel_profiles")
      .select("badges")
      .eq("id", req.user_id)
      .single();
    
    const currentBadges: string[] = (profData as any)?.badges || [];
    if (!currentBadges.includes(req.badge_key)) {
      currentBadges.push(req.badge_key);
    }

    // 2. Atualizar badges no perfil
    const { error: profErr } = await supabase
      .from("kefel_profiles")
      .update({ badges: currentBadges })
      .eq("id", req.user_id);

    // 3. Marcar solicitação como aprovada
    const { error: reqErr } = await supabase
      .from("kefel_badge_requests")
      .update({ status: "aprovado", reviewed_at: new Date().toISOString(), reviewed_by: currentUser?.id })
      .eq("id", req.id);

    if (!profErr && !reqErr) {
      showToast(`✅ Badge "${BADGE_LABELS[req.badge_key]}" aprovado!`);
      setBadgeRequests(prev => prev.filter(r => r.id !== req.id));
    } else {
      showToast("Erro ao aprovar badge", "error");
    }
    setReviewingBadge(null);
  };

  const handleRejectBadge = async (req: any) => {
    setReviewingBadge(req.id);
    const { error } = await supabase
      .from("kefel_badge_requests")
      .update({ status: "rejeitado", reviewed_at: new Date().toISOString(), reviewed_by: currentUser?.id })
      .eq("id", req.id);

    if (!error) {
      showToast("Solicitação recusada.", "info");
      setBadgeRequests(prev => prev.filter(r => r.id !== req.id));
    } else {
      showToast("Erro ao recusar", "error");
    }
    setReviewingBadge(null);
  };

  const handleDelete = async (user: KefelProfile) => {
    if (!window.confirm(`Deseja realmente excluir ${user.nome}? Esta ação é irreversível.`)) return;
    
    setDeleting(user.id);
    const { success } = await deleteProfile(user.id);
    
    if (success) {
      showToast("Usuário removido com sucesso");
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      showToast("Erro ao remover usuário", "error");
    }
    setDeleting(null);
  };

  const filteredUsers = users.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.telefone || "").includes(searchTerm)
  );

  // Identifica duplicidades (mesmo telefone)
  const phoneCounts = users.reduce((acc, u) => {
    if (u.telefone) {
      acc[u.telefone] = (acc[u.telefone] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  if (currentUser?.role !== 'master') return (
    <div className="h-screen flex items-center justify-center p-10 text-center">
      <p className="text-gray-400 font-black uppercase italic tracking-widest">Acesso Restrito ao Master</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-transparent pt-14 pb-28 px-6 overflow-y-auto">
      <header className="mb-8 pt-4">
        <h1 className="text-2xl font-black text-gray-900 italic uppercase">Gestão de Usuários</h1>
        <div className="h-1.5 w-12 bg-[#1B3B6B] rounded-full mt-1"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
          {users.length} usuários cadastrados
        </p>
      </header>

      {/* Busca */}
      <div className="relative mb-8 group">
         <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-300 group-focus-within:text-[#1B3B6B] transition-colors">
            <Search size={18} />
         </div>
         <input 
            type="text"
            placeholder="BUSCAR POR NOME OU WHATSAPP..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/80 backdrop-blur-md border border-white/50 p-6 pl-14 rounded-[2rem] font-bold italic uppercase text-xs shadow-sm focus:shadow-xl focus:shadow-[#1B3B6B]/5 outline-none transition-soft"
         />
      </div>

      {/* Solicitações de Badge Pendentes */}
      {badgeRequests.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative">
              <Bell size={18} className="text-amber-500" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            </div>
            <h2 className="text-sm font-black text-gray-900 uppercase italic tracking-widest">
              Solicitações Pendentes
            </h2>
            <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
              {badgeRequests.length}
            </span>
          </div>
          <div className="space-y-3">
            {badgeRequests.map(req => (
              <div
                key={req.id}
                className="glass-panel p-4 rounded-[2rem] border-amber-200/50 bg-amber-50/40 flex items-center gap-4"
              >
                {/* Avatar */}
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex-shrink-0 overflow-hidden border border-gray-50 flex items-center justify-center">
                  {req.kefel_profiles?.avatar_url
                    ? <img src={req.kefel_profiles.avatar_url} className="w-full h-full object-cover" />
                    : <User size={22} className="text-gray-200" />}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm uppercase italic truncate">
                    {req.kefel_profiles?.nome || "Membro"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Award size={10} className="text-amber-500" />
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                      {BADGE_LABELS[req.badge_key] || req.badge_key}
                    </p>
                  </div>
                </div>
                {/* Ações */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRejectBadge(req)}
                    disabled={reviewingBadge === req.id}
                    className="p-2.5 bg-rose-50 text-rose-500 rounded-xl active:scale-90 transition-soft hover:bg-rose-100 disabled:opacity-40"
                  >
                    {reviewingBadge === req.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  </button>
                  <button
                    onClick={() => handleApproveBadge(req)}
                    disabled={reviewingBadge === req.id}
                    className="p-2.5 bg-green-50 text-green-600 rounded-xl active:scale-90 transition-soft hover:bg-green-100 disabled:opacity-40"
                  >
                    {reviewingBadge === req.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
           <Loader2 className="animate-spin text-[#1B3B6B]" />
           <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Sincronizando Banco...</p>
        </div>
      ) : (
        <div className="space-y-4">
           <AnimatePresence mode="popLayout">
              {filteredUsers.map((u) => {
                const isDuplicate = u.telefone && phoneCounts[u.telefone] > 1;
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={u.id} 
                    className={`glass-panel p-5 rounded-[2.5rem] border-white/50 flex flex-col gap-4 relative overflow-hidden transition-soft hover:shadow-xl ${isDuplicate ? 'ring-2 ring-rose-500/20 bg-rose-50/30' : ''}`}
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm overflow-hidden flex-shrink-0 border border-gray-50 flex items-center justify-center">
                           {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <User size={24} className="text-gray-200" />}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                              <h3 className="font-black text-gray-900 uppercase italic text-sm truncate">{u.nome}</h3>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                u.role === 'master' ? 'bg-black text-white' : 
                                u.role === 'lider' ? 'bg-[#1B3B6B] text-white' : 
                                'bg-gray-100 text-gray-400'
                              }`}>
                                {u.role}
                              </span>
                           </div>
                           <div className="flex items-center gap-3 mt-1">
                              <p className="text-[10px] font-black text-[#1B3B6B] tracking-tight">{u.telefone ? `(${u.telefone.slice(0,2)}) ${u.telefone.slice(2,7)}-${u.telefone.slice(7)}` : 'Sem Telefone'}</p>
                              {isDuplicate && (
                                <span className="text-[8px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full uppercase">Duplicado</span>
                              )}
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           {u.telefone && (
                             <a 
                               href={`https://wa.me/55${u.telefone}`} 
                               target="_blank" 
                               rel="noreferrer"
                               className="p-3 bg-green-50 text-green-600 rounded-xl active:scale-90 transition-soft hover:bg-green-100"
                             >
                                <MessageCircle size={18} />
                             </a>
                           )}
                           {u.role !== 'master' && (
                             <button 
                               onClick={() => handleDelete(u)}
                               disabled={deleting === u.id}
                               className="p-3 bg-rose-50 text-rose-500 rounded-xl active:scale-90 transition-soft hover:bg-rose-100 disabled:opacity-50"
                             >
                                {deleting === u.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                             </button>
                           )}
                        </div>
                     </div>
                     
                     <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-1">
                        <div className="flex items-center gap-1.5">
                           <Calendar size={10} className="text-gray-300" />
                           <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                             Cadastrado em {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : 'Manual'}
                           </p>
                        </div>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest truncate max-w-[100px]">ID: {u.id.slice(0,8)}...</p>
                     </div>
                  </motion.div>
                );
              })}
           </AnimatePresence>
           
           {filteredUsers.length === 0 && (
             <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-gray-200 mx-auto">
                   <Users size={32} />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Nenhum usuário encontrado</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
