import {
  Calendar, MapPin, Clock, Plus, Trash2, Edit2, X, Upload, Image as ImageIcon, Loader2, Users
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

function EventForm({ initial, onSave, onCancel }: EventFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState(initial?.titulo || "");
  const [descricao, setDescricao] = useState(initial?.descricao || "");
  const [data_hora, setDataHora] = useState(initial?.data_hora?.slice(0, 16) || "");
  const [endereco, setEndereco] = useState(initial?.endereco || "");
  const [tipo, setTipo] = useState<"gratuito" | "pago" | "cota">(initial?.tipo || "gratuito");
  const [precoRaw, setPrecoRaw] = useState(initial?.preco ? String(initial.preco) : "");
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imagem_url || null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const evento = {
      titulo, descricao, 
      data_hora: new Date(data_hora).toISOString(),
      endereco, tipo, 
      preco: tipo === 'pago' ? parseFloat(precoRaw) : 0,
      imagem_url: imagePreview,
      criado_por: user?.id
    };

    if (initial?.id) {
        await supabase.from('kefel_eventos').update(evento).eq('id', initial.id);
    } else {
        await supabase.from('kefel_eventos').insert(evento);
    }
    
    setSaving(false);
    onSave(evento as any);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-6 space-y-6 max-h-[90vh] overflow-y-auto my-auto">
        <h2 className="text-2xl font-black">{initial?.id ? 'Editar' : 'Novo'} Evento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Título</label>
            <input type="text" placeholder="Nome do evento" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Descrição / Cota</label>
            <textarea placeholder="Descreva o evento ou o que levar (Cota)" value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl h-24" required />
          </div>
          <input type="datetime-local" value={data_hora} onChange={e => setDataHora(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl" required />
          <input type="text" placeholder="Local" value={endereco} onChange={e => setEndereco(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl" required />
          
          <div className="grid grid-cols-3 gap-2">
            {['gratuito', 'pago', 'cota'].map(t => (
               <button key={t} type="button" onClick={() => setTipo(t as any)} className={cn("p-3 rounded-xl font-black uppercase text-[10px]", tipo === t ? "bg-blue-600 text-white shadow-lg" : "bg-gray-100 text-gray-400")}>
                  {t}
               </button>
            ))}
          </div>

          {tipo === 'pago' && <input type="number" placeholder="Preço (R$)" value={precoRaw} onChange={e => setPrecoRaw(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold" />}
          
          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 mt-4 active:scale-95 transition-all">
            {saving ? 'Salvando...' : (initial?.id ? 'Salvar Alterações' : 'Criar Evento')}
          </button>
          <button type="button" onClick={onCancel} className="w-full text-gray-400 font-bold text-sm">Cancelar</button>
        </form>
      </div>
    </div>
  );
}

export function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<KefelEvento[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<KefelEvento | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase.from("kefel_eventos").select("*").order("data_hora", { ascending: true });
    setEvents((data || []) as KefelEvento[]);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleRegister = async (eventId: string) => {
     if (!user) return;
     const { error } = await supabase.from('kefel_event_registrations').insert({ event_id: eventId, user_id: user.id });
     if (error) alert("Você já está inscrito neste evento! 😊");
     else alert("Inscrição confirmada com sucesso! 🎉");
  };

  const viewParticipants = async (eventId: string, title: string) => {
     const { data } = await supabase.from('kefel_event_registrations').select('kefel_profiles(nome)').eq('event_id', eventId);
     const names = data?.map((d: any) => d.kefel_profiles?.nome).join('\n') || "Ninguém inscrito ainda.";
     alert(`Inscritos em "${title}":\n\n${names}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    await supabase.from("kefel_eventos").delete().eq("id", id);
    fetchEvents();
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Eventos</h1>
          <p className="text-gray-400 text-sm font-medium">Participe da nossa comunhão.</p>
        </div>
        {user?.role === 'master' && (
          <button onClick={() => { setEditingEvent(null); setShowForm(true); }} className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-transform">
            <Plus className="w-6 h-6" />
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-400 animate-spin" /></div>
      ) : (
        <div className="grid gap-4">
          {events.map(event => (
            <div key={event.id} className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                 <div className="space-y-1">
                    <h3 className="text-xl font-black text-gray-900 leading-none">{event.titulo}</h3>
                    <div className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                       <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(event.data_hora).toLocaleDateString()}</span>
                       <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(event.data_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                 </div>
                 <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm", 
                   event.tipo === 'pago' ? "bg-blue-50 text-blue-600 border border-blue-100" : 
                   event.tipo === 'cota' ? "bg-purple-50 text-purple-600 border border-purple-100" : 
                   "bg-green-50 text-green-600 border border-green-100")}>
                    {event.tipo === 'pago' ? `R$ ${event.preco}` : event.tipo}
                 </span>
              </div>
              
              <p className="text-gray-500 text-sm leading-relaxed">{event.descricao}</p>
              
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 p-3 rounded-2xl">
                 <MapPin className="w-4 h-4 text-blue-400" />
                 <span className="font-bold truncate">{event.endereco}</span>
              </div>
              
              <div className="flex gap-2 pt-2">
                 <button onClick={() => handleRegister(event.id)} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-blue-100 active:scale-95 transition-all">
                    Participar Agora
                 </button>
                 {user?.role === 'master' && (
                    <div className="flex gap-2">
                       <button onClick={() => viewParticipants(event.id, event.titulo)} className="bg-gray-100 p-4 rounded-2xl text-gray-400 active:scale-95 transition-all" title="Ver Inscritos">
                          <Users className="w-5 h-5" />
                       </button>
                       <button onClick={() => handleDelete(event.id)} className="bg-gray-50 p-4 rounded-2xl text-red-300 active:scale-95 transition-all">
                          <Trash2 className="w-5 h-5" />
                       </button>
                    </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <EventForm initial={editingEvent} onSave={() => { fetchEvents(); setShowForm(false); }} onCancel={() => setShowForm(false)} />}
    </div>
  );
}
