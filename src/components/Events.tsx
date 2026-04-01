import React, { useState, useEffect, useRef } from "react";
import {
  Calendar, MapPin, Clock, Plus, Trash2, Edit2, X, Upload, Loader2, Users, Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

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
        banner_pos_y: banner_pos_y,
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
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-6 space-y-6 max-h-[90vh] overflow-y-auto my-auto shadow-2xl pt-10">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-gray-900 italic uppercase">Novo Evento</h2>
          <button onClick={onCancel} className="p-3 bg-gray-50 rounded-full font-bold">X</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Foto do Evento</label>
            <div 
              onClick={() => !imagePreview && fileInputRef.current?.click()}
              className="relative w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] overflow-hidden group"
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} className="w-full h-full object-cover transition-all" style={{ objectPosition: `50% ${banner_pos_y}%` }} alt="Preview" />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="bg-white/90 backdrop-blur shadow-xl p-3 rounded-2xl text-blue-600 font-bold"><Edit2 size={18} /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); }} className="bg-red-500/90 text-white shadow-xl p-3 rounded-2xl font-bold"><Trash2 size={18} /></button>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-[2rem] shadow-2xl">
                     <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Ajuste de enquadramento {banner_pos_y}%</p>
                     <input type="range" min="0" max="100" value={banner_pos_y} onChange={e => setBannerPosY(parseInt(e.target.value))} className="w-full h-2 bg-gray-100 rounded-full appearance-none accent-blue-600" />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-50 cursor-pointer">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4"><Upload className="text-blue-600" size={28} /></div>
                  <span className="text-xs text-gray-400 font-black uppercase tracking-widest leading-relaxed">Enviar Foto</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Título</label>
              <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-sm" placeholder="Ex: Reunião de Homens" required />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-sm h-24" placeholder="Detalhes do evento..." required />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Data e Hora</label>
               <input type="datetime-local" value={data_hora} onChange={e => setDataHora(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-sm" required />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Local</label>
               <input type="text" value={endereco} onChange={e => setEndereco(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-sm" placeholder="Endereço" required />
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tipo de Participação</label>
            <div className="grid grid-cols-3 gap-2">
              {["gratuito", "pago", "cota"].map(t => (
                <button key={t} type="button" onClick={() => setTipo(t as any)} className={cn("py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest", tipo === t ? "bg-blue-600 text-white shadow-xl shadow-blue-100" : "bg-gray-100 text-gray-400")}>{t}</button>
              ))}
            </div>
          </div>

          {tipo !== "gratuito" && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{tipo === "pago" ? "Preço (R$)" : "O que levar / Requisitos"}</label>
              <input type={tipo === "pago" ? "number" : "text"} value={precoRaw} onChange={e => setPrecoRaw(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-sm" placeholder={tipo === "pago" ? "0.00" : "Ex: 1kg de carne"} required />
            </div>
          )}

          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all text-xs uppercase tracking-[0.2em] italic">
            {saving ? <><Loader2 className="animate-spin" size={20} /> Salvando...</> : "Criar Evento"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Events() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const isAdmin = profile?.role === "master";

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase.from("kefel_eventos").select("*").order("data_hora", { ascending: true });
    if (data) setEvents(data);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleRegister = async (eventId: string) => {
    if (!user) return alert("Faça login para se inscrever.");
    const { error } = await supabase.from("kefel_event_registrations").insert({ event_id: eventId, user_id: user.id });
    if (error) {
      if (error.code === "23505") alert("Você já está inscrito neste evento!");
      else alert("Erro ao se inscrever: " + error.message);
    } else {
      alert("Inscrição realizada com sucesso! 🎉");
    }
  };

  const viewParticipants = async (event: any) => {
    const { data, error } = await supabase.from("kefel_event_registrations").select("kefel_profiles(nome)").eq("event_id", event.id);
    if (error) return alert("Erro ao buscar inscritos.");
    const names = (data as any[] | null)?.map((d: any) => d.kefel_profiles?.nome).filter(Boolean).join("\n") || "Nenhum inscrito até o momento.";
    alert(`Lista de Inscritos - ${event.titulo}\n\n${names}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir?")) return;
    const { error } = await supabase.from("kefel_eventos").delete().eq("id", id);
    if (error) alert("Erro ao excluir: " + error.message);
    else fetchEvents();
  };

  return (
    <div className="space-y-6 pb-28 pt-10 px-4">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase">Eventos</h1>
          <div className="h-1.5 w-12 bg-blue-600 rounded-full mt-1" />
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="bg-black text-white p-4 rounded-3xl shadow-xl active:scale-95 transition-all"><Plus /></button>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
          <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Sincronizando Agenda...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
           <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Nenhum evento agendado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden group">
              <div className="relative aspect-square w-full bg-gray-100">
                {event.imagem_url ? (
                  <img src={event.imagem_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: `50% ${event.banner_pos_y ?? 50}%` }} alt={event.titulo} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={48} /></div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                   <Calendar size={14} className="text-blue-600" />
                   <span className="text-[10px] font-black text-gray-900 uppercase">{new Date(event.data_hora).toLocaleDateString()}</span>
                </div>
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => setEditingEvent(event)} className="bg-white/90 backdrop-blur p-3 rounded-2xl shadow-xl text-blue-600"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(event.id)} className="bg-red-500 text-white p-3 rounded-2xl shadow-xl"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic", event.tipo === 'pago' ? "bg-red-50 text-red-500" : event.tipo === 'cota' ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600")}>{event.tipo}</span>
                    {event.tipo === 'pago' && <span className="font-black text-gray-900 text-sm">R$ {event.preco}</span>}
                  </div>
                  <h3 className="text-xl font-black text-gray-900 italic uppercase leading-none">{event.titulo}</h3>
                  <p className="text-gray-500 text-xs font-medium line-clamp-2 mt-2 leading-relaxed">{event.descricao}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-1.5 text-gray-400 font-black text-[10px] uppercase tracking-widest"><MapPin size={14} className="text-blue-600" /> {event.endereco}</div>
                  <div className="flex items-center gap-1.5 text-gray-400 font-black text-[10px] uppercase tracking-widest"><Clock size={14} className="text-blue-600" /> {new Date(event.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="pt-2 flex gap-2">
                   <button onClick={() => handleRegister(event.id)} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 italic uppercase text-[10px] tracking-widest">Garantir Vaga</button>
                   {isAdmin && <button onClick={() => viewParticipants(event)} className="bg-gray-100 text-gray-900 p-4 rounded-2xl flex items-center shadow-sm"><Users size={18} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showForm || editingEvent) && (
        <EventForm initial={editingEvent} onCancel={() => { setShowForm(false); setEditingEvent(null); }} onSave={() => { setShowForm(false); setEditingEvent(null); fetchEvents(); }} />
      )}
    </div>
  );
}
