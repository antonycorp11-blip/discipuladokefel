import React, { useState, useEffect, useRef } from "react";
import {
  Calendar, MapPin, Clock, Plus, Trash2, Edit2, X, Upload, Loader2, Users, Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase, type KefelEvento } from "@/lib/supabase";

// --- Formulário de Evento ---
interface EventFormProps {
  initial?: any;
  onSave: () => void;
  onCancel: () => void;
}

function EventForm({ initial, onSave, onCancel }: EventFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState(initial?.titulo || "");
  const [descricao, setDescricao] = useState(initial?.descricao || "");
  const [data_hora, setDataHora] = useState(
    initial?.data_hora 
    ? new Date(new Date(initial.data_hora).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) 
    : ""
  );
  const [endereco, setEndereco] = useState(initial?.endereco || "");
  const [tipo, setTipo] = useState<"gratuito" | "pago" | "cota">(initial?.tipo || "gratuito");
  const [precoRaw, setPrecoRaw] = useState(initial?.preco ? String(initial.preco) : "");
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imagem_url || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [banner_pos_y, setBannerPosY] = useState<number>(initial?.banner_pos_y ?? 50);
  const [saving, setSaving] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `event-images/${fileName}`;

    const { error: upErr } = await supabase.storage
      .from("kefel-assets")
      .upload(filePath, file);
    
    if (upErr) {
      console.error("Erro no upload:", upErr);
      return null;
    }
    const { data } = supabase.storage.from("kefel-assets").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalImageUrl = imagePreview;
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data_hora: new Date(data_hora).toISOString(),
        endereco: endereco.trim(),
        tipo,
        preco: tipo === "pago" ? parseFloat(precoRaw) || 0 : 0,
        imagem_url: finalImageUrl,
        banner_pos_y: banner_pos_y, // Salva o percentual exato
        criado_por: user?.id
      };

      if (initial?.id) {
        const { error } = await supabase.from("kefel_eventos").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("kefel_eventos").insert([payload]);
        if (error) throw error;
      }
      onSave();
    } catch (err: any) {
      alert("Erro ao salvar evento: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-6 space-y-6 max-h-[90vh] overflow-y-auto my-auto shadow-2xl">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-gray-900">{initial ? "Editar Evento" : "Novo Evento"}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors font-bold"><X className="text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-2 tracking-widest">Foto do Evento</label>
            <div 
              onClick={() => !imagePreview && fileInputRef.current?.click()}
              className="relative w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] overflow-hidden group shadow-inner"
            >
              {imagePreview ? (
                <>
                  <img 
                    src={imagePreview} 
                    className="w-full h-full object-cover transition-all"
                    style={{ objectPosition: `50% ${banner_pos_y}%` }}
                    alt="Preview" 
                  />
                  <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="bg-white/90 backdrop-blur shadow-xl p-3 rounded-2xl hover:bg-white transition-all text-blue-600"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); }}
                      className="bg-red-500/90 text-white shadow-xl p-3 rounded-2xl hover:bg-red-600 transition-all font-bold"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  {/* Ajuste por arraste (Interface de Grade/Slider) */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur p-4 rounded-3xl shadow-2xl border border-white/50">
                    <div className="flex items-center justify-between mb-3">
                       <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Arraste para ajustar altura</span>
                       <span className="text-[10px] font-black text-gray-400">{banner_pos_y}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={banner_pos_y} 
                      onChange={(e) => setBannerPosY(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-100 rounded-full appearance-none accent-blue-600 cursor-pointer"
                    />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-50 cursor-pointer group-hover:bg-blue-50/50 transition-all">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                    <Upload className="text-blue-600" size={28} />
                  </div>
                  <span className="text-xs text-gray-400 font-black uppercase tracking-widest leading-relaxed">Toque para<br/>enviar foto</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
          </div>

          <div className="space-y-4">
            <input type="text" placeholder="Título do Evento" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-semibold border-none focus:ring-2 focus:ring-blue-500" required />
            <textarea placeholder="Descrição (se for Cota, especifique aqui o que cada um deve levar)" value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl h-28 border-none focus:ring-2 focus:ring-blue-500 resize-none font-medium" required />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Data e Hora</label>
              <input type="datetime-local" value={data_hora} onChange={e => setDataHora(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl text-sm border-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Local</label>
              <input type="text" placeholder="Endereço" value={endereco} onChange={e => setEndereco(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl text-sm border-none" required />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Tipo de Participação</label>
            <div className="grid grid-cols-3 gap-2">
              {(['gratuito', 'pago', 'cota'] as const).map(t => (
                <button 
                  key={t} 
                  type="button" 
                  onClick={() => setTipo(t)}
                  className={cn("py-3 rounded-xl font-black uppercase text-[10px] transition-all", tipo === t ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200")}
                >
                  {t === 'gratuito' ? 'Grátis' : t === 'pago' ? 'Pago' : 'Cota'}
                </button>
              ))}
            </div>
          </div>

          {tipo === 'pago' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <input type="number" placeholder="Valor do Ingresso (R$)" value={precoRaw} onChange={e => setPrecoRaw(e.target.value)} className="w-full p-4 bg-gray-100 rounded-2xl font-black text-blue-600 border-none" />
            </div>
          )}

          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-2">
            {saving ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin w-5 h-5" />
                <span>SALVANDO...</span>
              </div>
            ) : "CRIAR EVENTO AGORA"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Lista Principal de Eventos ---
export function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<KefelEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<KefelEvento | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("kefel_eventos").select("*").order("data_hora", { ascending: true });
    if (error) console.error(error);
    else setEvents((data || []) as KefelEvento[]);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleRegister = async (event: KefelEvento) => {
    if (!user) return;
    const { error } = await supabase.from('kefel_event_registrations').insert({ event_id: event.id, user_id: user.id });
    if (error) alert("Você já está inscrito ou houve um erro.");
    else alert("Inscrição confirmada com sucesso!");
  };

  const viewParticipants = async (event: KefelEvento) => {
    const { data, error } = await supabase
      .from('kefel_event_registrations')
      .select('kefel_profiles(nome, email)')
      .eq('event_id', event.id);
    
    if (error) {
       alert("Erro ao buscar inscritos.");
       return;
    }

    const names = (data as any[] | null)?.map((d: any) => d.kefel_profiles?.nome).filter(Boolean).join("\n") || "Nenhum inscrito até o momento.";
    alert(`Lista de Inscritos - ${event.titulo}\n\n${names}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este evento? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("kefel_eventos").delete().eq("id", id);
    if (error) alert("Erro ao excluir: " + error.message);
    else fetchEvents();
  };

  return (
    <div className="space-y-6 pb-28">
      <header className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase">Eventos</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Escala e Celebrações</p>
        </div>
        {user?.role === 'master' && (
          <button 
            onClick={() => { setEditingEvent(null); setShowForm(true); }} 
            className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={24} />
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Sincronizando Agenda...</p>
        </div>
      ) : (
        <div className="grid gap-6 px-2">
          {events.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
              <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-400 font-bold uppercase text-xs">Nenhum evento agendado</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group">
                <div className="relative h-52 w-full bg-gray-100">
                  {event.imagem_url ? (
                    <img 
                      src={event.imagem_url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      style={{ objectPosition: `50% ${event.banner_pos_y ?? 50}%` }}
                      alt={event.titulo} 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={48} />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 flex gap-2">
                    {user?.role === 'master' && (
                      <>
                        <button onClick={() => { setEditingEvent(event); setShowForm(true); }} className="bg-white/95 backdrop-blur p-2.5 rounded-full text-blue-600 shadow-xl active:scale-90 transition-all font-bold"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(event.id)} className="bg-white/95 backdrop-blur p-2.5 rounded-full text-red-600 shadow-xl active:scale-90 transition-all font-bold"><Trash2 size={16} /></button>
                      </>
                    )}
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className={cn(
                      "text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-tighter shadow-lg backdrop-blur-md",
                      event.tipo === 'pago' ? "bg-white text-blue-600" : event.tipo === 'cota' ? "bg-white text-purple-600" : "bg-white text-green-600"
                    )}>
                      {event.tipo === 'pago' ? `R$ ${event.preco}` : event.tipo === 'cota' ? "Contribuição Cota" : "Entrada Gratuita"}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-gray-900 leading-tight">{event.titulo}</h3>
                    <div className="flex flex-wrap gap-4 text-[11px] font-bold text-gray-400 uppercase">
                      <span className="flex items-center gap-1.5"><Calendar size={14} className="text-blue-500" /> {new Date(event.data_hora).toLocaleDateString('pt-BR')}</span>
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-500" /> {new Date(event.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <p className="text-gray-500 text-sm leading-relaxed font-medium">{event.descricao}</p>

                  <div className="flex items-start gap-3 text-xs font-bold text-gray-700 bg-gray-50 p-4 rounded-3xl">
                    <MapPin size={20} className="text-blue-500 shrink-0 mt-0.5" />
                    <span className="leading-tight">{event.endereco}</span>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => handleRegister(event)} className="flex-1 bg-blue-600 text-white py-4.5 rounded-2xl font-black text-sm active:scale-[0.97] transition-all shadow-xl shadow-blue-100 uppercase tracking-widest">
                      Eu Vou!
                    </button>
                    {user?.role === 'master' && (
                      <button onClick={() => viewParticipants(event)} className="bg-gray-100 px-5 rounded-2xl text-gray-500 hover:bg-gray-200 transition-colors">
                        <Users size={22} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showForm && <EventForm initial={editingEvent} onSave={() => { fetchEvents(); setShowForm(false); }} onCancel={() => setShowForm(false)} />}
    </div>
  );
}
