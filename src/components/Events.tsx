import React, { useState, useEffect } from "react";
import { 
  Plus, Calendar, MapPin, Clock, 
  X, Camera, Loader2, Image as ImageIcon, Trash2, Tag, QrCode, AlertCircle, Users, User
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  data_hora: string;
  preco: number;
  endereco: string;
  imagem_url: string;
  banner_pos_y: number;
  tipo: "gratuito" | "pago" | "cota";
  pix_key?: string;
  cota_desc?: string;
  criado_por: string;
}

export default function Events() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showInscriptions, setShowInscriptions] = useState<string | null>(null);
  const [inscribedUsers, setInscribedUsers] = useState<any[]>([]);
  const [loadingInsc, setLoadingInsc] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [endereco, setEndereco] = useState("");
  const [preco, setPreco] = useState(0);
  const [tipo, setTipo] = useState<"gratuito" | "pago" | "cota">("gratuito");
  const [pixKey, setPixKey] = useState("");
  const [cotaDesc, setCotaDesc] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    const { data: eventsData, error } = await supabase.from("kefel_eventos").select("*").order("data_hora", { ascending: true });
    if (!error) setEventos((eventsData || []) as Evento[]);
    setLoading(false);
  }

  async function fetchInscriptions(eventId: string) {
    setLoadingInsc(true);
    const { data, error } = await supabase.from("kefel_eventos_inscritos").select("*, kefel_profiles(*)").eq("evento_id", eventId);
    if (!error) setInscribedUsers(data || []);
    setLoadingInsc(false);
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este evento?")) return;
    const { error } = await supabase.from("kefel_eventos").delete().eq("id", id);
    if (!error) fetchEvents();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    let imageUrl = "";
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data: upData, error: upErr } = await supabase.storage.from("event-banners").upload(fileName, imageFile);
      if (upData) {
        const { data: urlData } = supabase.storage.from("event-banners").getPublicUrl(upData.path);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("kefel_eventos").insert({
      titulo,
      descricao,
      data_hora: new Date(`${data}T${hora}`).toISOString(),
      endereco,
      preco: tipo === 'pago' ? preco : 0,
      tipo,
      pix_key: tipo === 'pago' ? pixKey : null,
      cota_desc: tipo === 'cota' ? cotaDesc : null,
      imagem_url: imageUrl,
      criado_por: user.id
    });

    if (!error) {
      setShowForm(false);
      fetchEvents();
      resetForm();
    } else alert("Erro: " + error.message);
    setSaving(false);
  }

  const resetForm = () => {
    setTitulo(""); setDescricao(""); setData(""); setHora(""); 
    setEndereco(""); setPreco(0); setTipo("gratuito"); setPixKey(""); setCotaDesc("");
    setImageFile(null); setImagePreview(null);
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFD] pt-14 pb-24 px-6 overflow-y-auto">
      <header className="flex justify-between items-center mb-8 pt-4">
        <h1 className="text-2xl font-bold text-gray-900 italic uppercase underline decoration-blue-600 decoration-4">Agenda</h1>
        {user?.role !== 'member' && (
          <button onClick={() => setShowForm(true)} className="bg-black text-white p-3 rounded-2xl shadow-xl active:scale-95 transition-all">
            <Plus size={20} />
          </button>
        )}
      </header>

      {loading ? <Loader2 className="animate-spin mx-auto text-blue-600" /> : (
        <div className="grid gap-8 pb-10">
          {eventos.map(event => (
            <div key={event.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 flex flex-col relative">
              <div className="relative h-48 bg-gray-100">
                {event.imagem_url ? (
                  <img src={event.imagem_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-200"><ImageIcon size={48} /></div>
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                   {user?.id === event.criado_por && (
                     <button onClick={() => { setShowInscriptions(event.id); fetchInscriptions(event.id); }} className="bg-white/90 backdrop-blur p-2.5 rounded-xl text-blue-600 shadow-xl active:scale-95">
                       <Users size={18} />
                     </button>
                   )}
                   {(user?.role === 'master' || user?.id === event.criado_por) && (
                     <button onClick={() => handleDelete(event.id)} className="bg-white/90 backdrop-blur p-2.5 rounded-xl text-red-500 shadow-xl active:scale-95">
                       <Trash2 size={18} />
                     </button>
                   )}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase italic">{event.titulo}</h3>
                <div className="flex items-center gap-4 text-gray-400 text-[10px] font-bold uppercase mb-4">
                  <div className="flex items-center gap-1"><Calendar size={12} className="text-blue-600" /> {new Date(event.data_hora).toLocaleDateString('pt-BR')}</div>
                  <div className="flex items-center gap-1"><MapPin size={12} className="text-blue-600" /> {event.endereco}</div>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{event.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Relatório de Inscrições */}
      {showInscriptions && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md flex items-end animate-in fade-in">
          <div className="bg-white w-full h-[80vh] rounded-t-[3rem] p-8 flex flex-col animate-in slide-in-from-bottom duration-300">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold italic uppercase">Inscritos no Evento</h2>
                <button onClick={() => setShowInscriptions(null)} className="bg-gray-100 p-3 rounded-full"><X size={20} /></button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-4">
                {loadingInsc ? <Loader2 className="animate-spin mx-auto text-blue-600" /> : inscribedUsers.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 font-bold uppercase text-xs">Ninguém inscrito ainda</p>
                ) : inscribedUsers.map(insc => (
                  <div key={insc.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                    <div className="w-10 h-10 bg-white rounded-xl overflow-hidden border border-gray-100">
                       {insc.kefel_profiles?.avatar_url ? <img src={insc.kefel_profiles.avatar_url} className="w-full h-full object-cover" /> : <User className="p-2 text-blue-200" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{insc.kefel_profiles?.nome || "Usuário"}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(insc.confirmado_em).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Modal Criar Evento */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end animate-in fade-in">
          <div className="bg-white w-full h-[90vh] rounded-t-[3.5rem] p-8 overflow-y-auto animate-in slide-in-from-bottom duration-500 pb-20">
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-xl font-bold italic uppercase underline decoration-blue-600 decoration-4">Novo Evento</h2>
               <button onClick={() => setShowForm(false)} className="bg-gray-100 p-3 rounded-full"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Banner do Evento</p>
                <div className="relative h-48 rounded-[2rem] bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" />
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center">
                       <Camera size={32} className="text-gray-300" />
                       <span className="text-[10px] font-bold text-gray-400 uppercase mt-2">Escolher Foto</span>
                       <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>

              <input required placeholder="TÍTULO DO EVENTO" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-bold italic uppercase text-xs" />
              <textarea placeholder="DESCRIÇÃO..." value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] text-sm h-32" />
              <div className="grid grid-cols-2 gap-4">
                 <input required type="date" value={data} onChange={e => setData(e.target.value)} className="bg-gray-50 p-6 rounded-[1.5rem] font-bold text-xs" />
                 <input required type="time" value={hora} onChange={e => setHora(e.target.value)} className="bg-gray-50 p-6 rounded-[1.5rem] font-bold text-xs" />
              </div>
              <input required placeholder="LOCAL" value={endereco} onChange={e => setEndereco(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-bold italic uppercase text-xs" />
              
              <div className="bg-gray-50 p-4 rounded-[2rem] space-y-4">
                 <div className="flex gap-2">
                    {['gratuito', 'pago', 'cota'].map(t => (
                      <button key={t} type="button" onClick={() => setTipo(t as any)} className={`flex-1 py-4 rounded-xl font-bold text-[10px] uppercase transition-all ${tipo === t ? 'bg-black text-white shadow-xl' : 'bg-white text-gray-400'}`}>{t}</button>
                    ))}
                 </div>
                 {tipo === 'pago' && (
                   <div className="space-y-4">
                     <input type="number" placeholder="VALOR R$" value={preco} onChange={e => setPreco(Number(e.target.value))} className="w-full bg-white p-6 rounded-2xl font-bold" />
                     <input placeholder="CHAVE PIX" value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full bg-white p-6 rounded-2xl font-bold text-xs uppercase" />
                   </div>
                 )}
                 {tipo === 'cota' && (
                   <textarea placeholder="O QUE TRAZER?" value={cotaDesc} onChange={e => setCotaDesc(e.target.value)} className="w-full bg-white p-6 rounded-2xl font-bold text-xs h-24" />
                 )}
              </div>

              <button disabled={saving} type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[1.5rem] font-black shadow-xl uppercase italic disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin mx-auto" /> : "Publicar Evento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
