import {
  Users, Plus, Calendar, User, Trash2, Edit2, X,
  Mail, Shield, Send, Loader2, CheckCircle2, UserPlus
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth, inviteLeader } from "@/context/AuthContext";
import { supabase, type KefelCelula, type KefelProfile, type KefelInvite } from "@/lib/supabase";


// ── Modal: Cadastrar Nova Célula ──────────────────────────────────
function CelulaForm({
  initial,
  lideres,
  onSave,
  onCancel,
}: {
  initial?: Partial<KefelCelula>;
  lideres: KefelProfile[];
  onSave: (c: KefelCelula) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const [nome, setNome] = useState(initial?.nome || "");
  const [dia_semana, setDia] = useState(initial?.dia_semana || "Quarta-feira");
  const [lider_id, setLiderId] = useState(initial?.lider_id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dias = ["Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado","Domingo"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      nome: nome.trim(),
      dia_semana,
      lider_id: lider_id || null,
      criado_por: user?.id,
    };

    let saved: KefelCelula;

    if (initial?.id) {
      const { error: upErr } = await supabase.from("kefel_celulas").update(payload).eq("id", initial.id);
      if (upErr) { setError(upErr.message); setSaving(false); return; }
      saved = { ...payload, id: initial.id } as KefelCelula;
    } else {
      const { data, error: insErr } = await supabase.from("kefel_celulas").insert(payload).select().single();
      if (insErr || !data) { setError(insErr?.message || "Erro"); setSaving(false); return; }
      saved = data as KefelCelula;
    }

    setSaving(false);
    onSave(saved);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: "85dvh" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900">{initial?.id ? "Editar Célula" : "Nova Célula"}</h2>
          <button onClick={onCancel} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-8">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase">Nome da Célula *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-gray-50 rounded-2xl py-3.5 px-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Ex: Célula Norte"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase">Dia da Reunião</label>
            <select
              value={dia_semana}
              onChange={(e) => setDia(e.target.value)}
              className="w-full bg-gray-50 rounded-2xl py-3.5 px-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              {dias.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase">Líder Responsável</label>
            <select
              value={lider_id}
              onChange={(e) => setLiderId(e.target.value)}
              className="w-full bg-gray-50 rounded-2xl py-3.5 px-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">— Sem líder atribuído —</option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>{l.nome} ({l.email})</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (initial?.id ? "Salvar Alterações" : "Criar Célula")}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Convidar Líder ─────────────────────────────────────────
function InviteLeaderModal({
  masterId,
  onClose,
  onSuccess,
}: {
  masterId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    const result = await inviteLeader(nome.trim(), email.trim(), masterId);
    setSending(false);
    if (result.success) {
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 2000);
    } else {
      setError(result.message || "Erro ao enviar convite.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-3xl px-5 pt-4 pb-8 space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-black text-gray-900">Convidar Líder</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <p className="font-bold text-gray-900 text-center">Convite enviado!</p>
            <p className="text-gray-500 text-sm text-center">
              {nome} receberá um e-mail para criar sua conta como Líder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-gray-500 text-sm">
              O líder receberá um e-mail com link para criar sua conta. Ao se cadastrar, ele terá papel de Líder automaticamente.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Nome do Líder *</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl py-3.5 pl-10 pr-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Nome completo"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">E-mail do Líder *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl py-3.5 pl-10 pr-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="lider@email.com"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {sending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-5 h-5" /> Enviar Convite</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
export function CellManagement() {
  const { user } = useAuth();
  const [celulas, setCelulas] = useState<KefelCelula[]>([]);
  const [lideres, setLideres] = useState<KefelProfile[]>([]);
  const [allUsers, setAllUsers] = useState<KefelProfile[]>([]);
  const [invites, setInvites] = useState<KefelInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingCelula, setEditingCelula] = useState<KefelCelula | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const isMaster = user?.role === "master";
  const isLider = user?.role === "lider";
  const canManage = isMaster || isLider;

  const fetchData = async () => {
    setLoading(true);
    const [
      { data: celulasData },
      { data: usersData },
      { data: invitesData },
    ] = await Promise.all([
      supabase.from("kefel_celulas").select("*").order("nome"),
      supabase.from("kefel_profiles").select("*").order("nome"),
      isMaster
        ? supabase.from("kefel_invites").select("*").order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    const users = (usersData || []) as KefelProfile[];
    setCelulas((celulasData || []) as KefelCelula[]);
    setAllUsers(users);
    setLideres(users.filter((u) => u.role === "lider" || u.role === "master"));
    setInvites((invitesData || []) as KefelInvite[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = (celula: KefelCelula) => {
    setCelulas((prev) => {
      const exists = prev.find((c) => c.id === celula.id);
      return exists ? prev.map((c) => c.id === celula.id ? celula : c) : [...prev, celula];
    });
    setShowForm(false);
    setEditingCelula(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta célula?")) return;
    await supabase.from("kefel_celulas").delete().eq("id", id);
    setCelulas((prev) => prev.filter((c) => c.id !== id));
  };

  const getLiderName = (lider_id?: string | null) => {
    if (!lider_id) return "Sem líder";
    const f = allUsers.find((u) => u.id === lider_id);
    return f ? f.nome : "—";
  };

  // Para Líder: mostra apenas as células que ele lidera
  const visibleCelulas = isMaster
    ? celulas
    : isLider
    ? celulas.filter((c) => c.lider_id === user?.id)
    : celulas;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Células</h1>
          <p className="text-gray-400 text-sm font-medium">Grupos e líderes.</p>
        </div>
        {isMaster && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowInvite(true)}
              className="bg-purple-600 text-white p-3 rounded-2xl shadow-lg shadow-purple-100 active:scale-95 transition-transform"
              title="Convidar Líder"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setEditingCelula(null); setShowForm(true); }}
              className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Lista de células */}
          {visibleCelulas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Users className="w-14 h-14 text-gray-200" />
              <p className="text-gray-400 text-sm text-center font-medium">
                {canManage ? "Nenhuma célula. Toque em + para criar." : "Nenhuma célula cadastrada."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleCelulas.map((cell) => {
                const membroCount = allUsers.filter((u) => u.celula_id === cell.id).length;
                return (
                  <div key={cell.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 w-11 h-11 rounded-2xl flex items-center justify-center text-blue-600">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{cell.nome}</h3>
                          <p className="text-gray-400 text-xs flex items-center gap-1">
                            <User className="w-3 h-3" /> {getLiderName(cell.lider_id)}
                          </p>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditingCelula(cell); setShowForm(true); }}
                            className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isMaster && (
                            <button
                              onClick={() => handleDelete(cell.id)}
                              className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-wide">
                        <Calendar className="w-3.5 h-3.5" />
                        {cell.dia_semana}
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {membroCount} {membroCount === 1 ? "membro" : "membros"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Convites pendentes (só master) */}
          {isMaster && invites.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-500" />
                <h2 className="text-base font-bold text-gray-900">Convites Enviados</h2>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {invites.map((inv, idx) => (
                  <div
                    key={inv.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-3.5",
                      idx !== invites.length - 1 && "border-b border-gray-50"
                    )}
                  >
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{inv.nome}</p>
                      <p className="text-gray-400 text-xs">{inv.email}</p>
                    </div>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      inv.status === "pendente" ? "bg-amber-50 text-amber-700"
                      : inv.status === "aceito" ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                    )}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Todos os membros (só master) */}
          {isMaster && allUsers.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <h2 className="text-base font-bold text-gray-900">Membros ({allUsers.length})</h2>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {allUsers.map((u, idx) => (
                  <div
                    key={u.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-3.5",
                      idx !== allUsers.length - 1 && "border-b border-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        u.role === "master" ? "bg-purple-50" : u.role === "lider" ? "bg-blue-50" : "bg-gray-100"
                      )}>
                        <User className={cn(
                          "w-4 h-4",
                          u.role === "master" ? "text-purple-500" : u.role === "lider" ? "text-blue-500" : "text-gray-400"
                        )} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{u.nome}</p>
                        <p className="text-gray-400 text-xs truncate max-w-[180px]">{u.email}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full shrink-0",
                      u.role === "master" ? "bg-purple-50 text-purple-700"
                      : u.role === "lider" ? "bg-blue-50 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                    )}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {showForm && (
        <CelulaForm
          initial={editingCelula || undefined}
          lideres={lideres}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingCelula(null); }}
        />
      )}

      {showInvite && user && (
        <InviteLeaderModal
          masterId={user.id}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { fetchData(); }}
        />
      )}
    </div>
  );
}
