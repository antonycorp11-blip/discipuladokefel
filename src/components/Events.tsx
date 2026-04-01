import {
  Calendar, MapPin, Clock, Plus, Trash2, Edit2, X, Upload, Image as ImageIcon, Loader2
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase, type KefelEvento } from "@/lib/supabase";

// ── Formulário de Evento ────────────────────────────────────────
interface EventFormProps {
  initial?: any;
  onSave: (e: KefelEvento) => void;
  onCancel: () => void;
}

function EventForm({
  initial,
  onSave,
  onCancel,
}: EventFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState(initial?.titulo || "");
  const [descricao, setDescricao] = useState(initial?.descricao || "");
  const [data_hora, setDataHora] = useState(initial?.data_hora?.slice(0, 16) || "");
  const [endereco, setEndereco] = useState(initial?.endereco || "");
  const [tipo, setTipo] = useState<"gratuito" | "pago">(initial?.tipo || "gratuito");
  const [precoRaw, setPrecoRaw] = useState(
    initial?.preco && initial.preco > 0 ? String(initial.preco) : ""
  );
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imagem_url || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande. Máximo 5MB.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("kefel-eventos")
      .upload(path, file, { upsert: true });
    if (upErr) { setError("Falha no upload: " + upErr.message); return null; }
    const { data } = supabase.storage.from("kefel-eventos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    let imagem_url = initial?.imagem_url || null;

    if (imageFile) {
      setUploading(true);
      imagem_url = await uploadImage(imageFile);
      setUploading(false);
      if (!imagem_url && imageFile) { setSaving(false); return; }
    }

    const preco = tipo === "pago" ? parseFloat(precoRaw.replace(",", ".")) || 0 : 0;

    const evento: KefelEvento = {
      id: initial?.id || `evt_${Date.now()}`,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      data_hora: new Date(data_hora).toISOString(),
      endereco: endereco.trim(),
      tipo,
      preco,
      imagem_url,
      criado_por: user?.id || null,
    };

    // Salva no Supabase
    if (initial?.id) {
      await supabase.from("kefel_eventos").update({
        titulo: evento.titulo,
        descricao: evento.descricao,
        data_hora: evento.data_hora,
        endereco: evento.endereco,
        tipo: evento.tipo,
        preco: evento.preco,
        imagem_url: evento.imagem_url,
      }).eq("id", initial.id);
    } else {
      const { data, error: insErr } = await supabase.from("kefel_eventos").insert({
        titulo: evento.titulo,
        descricao: evento.descricao,
        data_hora: evento.data_hora,
        endereco: evento.endereco,
        tipo: evento.tipo,
        preco: evento.preco,
        imagem_url: evento.imagem_url,
        criado_por: user?.id,
      }).select().single();
      if (insErr) { setError(insErr.message); setSaving(false); return; }
      if (data) evento.id = data.id;
    }

    setSaving(false);
    onSave(evento);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto content-start py-10">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col my-auto max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{initial?.id ? "Editar Evento" : "Novo Evento"}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Upload de imagem */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Imagem do Evento</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden h-40">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setImageFile(null); }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-36 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-98 transition-transform"
              >
                <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-sm font-bold text-gray-500">Toque para escolher imagem</p>
                <p className="text-xs text-gray-400">JPG, PNG ou WebP — máx. 5MB</p>
              </button>
            )}
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase">Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-gray-50 rounded-2xl py-3.5 px-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Nome do evento"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase">Descrição *</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-gray-50 rounded-2xl py-3.5 px-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24 text-gray-900"
              placeholder="Descreva o evento..."
              required
            />
          </div>

          {/* Data e hora */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase">Data e Hora *</label>
            <input
              type="datetime-local"
              value={data_hora}
              onChange={(e) => setDataHora(e.target.value)}
              className="w-full bg-gray-50 rounded-2xl py-3.5 px-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>

          {/* Endereço */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase">Local *</label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="w-full bg-gray-50 rounded-2xl py-3.5 px-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Endereço ou nome do local"
              required
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase">Entrada</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipo("gratuito")}
                className={cn(
                  "py-3 rounded-2xl font-bold text-sm transition-all active:scale-95",
                  tipo === "gratuito" ? "bg-green-600 text-white shadow-md" : "bg-gray-100 text-gray-600"
                )}
              >
                Gratuito
              </button>
              <button
                type="button"
                onClick={() => setTipo("pago")}
                className={cn(
                  "py-3 rounded-2xl font-bold text-sm transition-all active:scale-95",
                  tipo === "pago" ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-600"
                )}
              >
                Pago
              </button>
            </div>
          </div>

          {/* Preço */}
          {tipo === "pago" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Preço (R$) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={precoRaw}
                  onChange={(e) => {
                    // Permite apenas números e vírgula/ponto
                    const val = e.target.value.replace(/[^0-9.,]/g, "");
                    setPrecoRaw(val);
                  }}
                  className="w-full bg-gray-50 rounded-2xl py-3.5 pl-10 pr-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {(saving || uploading) ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {uploading ? "Enviando imagem..." : "Salvando..."}</>
            ) : (
              initial?.id ? "Salvar Alterações" : "Criar Evento"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────
export function Events() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"todos" | "meus">("todos");
  const [events, setEvents] = useState<KefelEvento[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<KefelEvento | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const canCreate = user?.role === "master" || user?.role === "lider";

  const fetchEvents = async () => {
    setLoadingList(true);
    const { data } = await supabase
      .from("kefel_eventos")
      .select("*")
      .order("data_hora", { ascending: true });
    setEvents((data || []) as KefelEvento[]);
    setLoadingList(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSave = (evento: KefelEvento) => {
    setEvents((prev) => {
      const exists = prev.find((e) => e.id === evento.id);
      return exists
        ? prev.map((e) => (e.id === evento.id ? evento : e))
        : [evento, ...prev].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
    });
    setShowForm(false);
    setEditingEvent(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este evento?")) return;
    await supabase.from("kefel_eventos").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const now = new Date();
  const displayEvents =
    activeTab === "meus" ? events.filter((e) => e.criado_por === user?.id) : events;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Eventos</h1>
          <p className="text-gray-400 text-sm font-medium">Fique por dentro de tudo.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setEditingEvent(null); setShowForm(true); }}
            className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab("todos")}
          className={cn("flex-1 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === "todos" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500")}
        >
          Todos ({events.length})
        </button>
        {canCreate && (
          <button
            onClick={() => setActiveTab("meus")}
            className={cn("flex-1 py-2.5 rounded-xl font-bold text-sm transition-all",
              activeTab === "meus" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500")}
          >
            Meus Eventos
          </button>
        )}
      </div>

      {/* Lista */}
      {loadingList ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : displayEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Calendar className="w-14 h-14 text-gray-200" />
          <p className="text-gray-400 font-medium text-center text-sm">
            {canCreate ? "Nenhum evento. Toque em + para criar." : "Nenhum evento disponível."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {displayEvents.map((event) => {
            const isPast = new Date(event.data_hora) < now;
            return (
              <div
                key={event.id}
                className={cn(
                  "bg-white rounded-3xl border shadow-sm overflow-hidden",
                  isPast ? "opacity-60 border-gray-100" : "border-gray-100"
                )}
              >
                {/* Imagem */}
                {event.imagem_url && (
                  <div className="relative h-44 bg-gray-100">
                    <img
                      src={event.imagem_url}
                      alt={event.titulo}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold shadow-sm text-gray-900">
                      {event.tipo === "gratuito" ? "Grátis" : `R$ ${Number(event.preco).toFixed(2)}`}
                    </div>
                    {isPast && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">Encerrado</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">{event.titulo}</h3>
                        {!event.imagem_url && (
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full shrink-0",
                            event.tipo === "gratuito" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                          )}>
                            {event.tipo === "gratuito" ? "Grátis" : `R$ ${Number(event.preco).toFixed(2)}`}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm line-clamp-2 mt-0.5">{event.descricao}</p>
                    </div>

                    {canCreate && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingEvent(event); setShowForm(true); }}
                          className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>{formatDate(event.data_hora)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>{formatTime(event.data_hora)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">{event.endereco}</span>
                    </div>
                  </div>

                  {!isPast && (
                    <button className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold active:scale-95 transition-transform hover:bg-blue-100">
                      Inscrever-se Agora
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <EventForm
          initial={editingEvent || undefined}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingEvent(null); }}
        />
      )}
    </div>
  );
}
