import React, { useState, useEffect } from "react";
import { 
  Plus, Calendar, MapPin, Clock, 
  X, Camera, Loader2, Image as ImageIcon, CheckCircle, Trash2, Tag, QrCode, AlertCircle
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
  const [saving, setSaving] = useState(false);
  
  // Estados do formulário
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [endereco, setEndereco] = useState("");
  const [preco, setPreco] = useState(0);
  const [tipo, setTipo] = useState<"gratuito" | "pago" | "cota">("gratuito");
  const [pixKey, setPixKey] = useState("");
  const [cotaDesc, setCotaDesc] = useState("");
  const [bannerPosY, setBannerPosY] = useState(50);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    const { data: eventsData, error } = await supabase
      .from("kefel_eventos")
      .select("*")
      .order("data_hora", { ascending: true });
    
    if (!error) setEventos((eventsData || []) as Evento[]);
    setLoading(false);
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
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
      const uploadRes = await supabase.storage
        .from("event-banners")
        .upload(fileName, imageFile);
      
      if (!uploadRes.error && uploadRes.data) {
        const { data: urlData } = supabase.storage
          .from("event-banners")
          .getPublicUrl(uploadRes.data.path);
        imageUrl = urlData.publicUrl;
      }
    }

    const dataHoraIso = new Date(`${data}T${hora}`).toISOString();

    const { error } = await supabase.from("kefel_eventos").insert({
      titulo,
      descricao,
      data_hora: dataHoraIso,
      endereco,
      preco: tipo === 'pago' ? preco : 0,
      tipo,
      pix_key: tipo === 'pago' ? pixKey : null,
      cota_desc: tipo === 'cota' ? cotaDesc : null,
      imagem_url: imageUrl,
      banner_pos_y: bannerPosY,
      criado_por: user.id
    });

    if (!error) {
      setShowForm(false);
      fetchEvents();
      resetForm();
    } else {
      alert(`Erro ao salvar: ${error.message}`);
    }
    setSaving(false);
  }

  const resetForm = () => {
    setTitulo(""); setDescricao(""); setData(""); setHora(""); 
    setEndereco(""); setPreco(0); setTipo("gratuito"); setPixKey(""); setCotaDesc("");
    setImageFile(null); setImagePreview(null); setBannerPosY(50);
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFD] pt-14 pb-24 px-6 overflow-y-auto">
      <header className="flex justify-between items-center mb-8 sticky top-0 bg-[#FDFDFD]/80 backdrop-blur-md pt-4 z-10">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase underline decoration-blue-600 decoration-4">Agenda</h1>
        </div>
        {(user?.role === 'master' || user?.role === 'lider') && (
          <button 
            onClick={() => setShowForm(true)} 
            className="bg-black text-white p-4 rounded-[1.5rem] shadow-2xl active:scale-90 transition-all border border-gray-800"
          >
            <Plus size={20} className="text-blue-400" />
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-600" /></div>
      ) : eventos.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
           <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-400 font-bold italic uppercase text-xs">Sem eventos por enquanto</p>
        </div>
      ) : (
        <div className="grid gap-8 pb-10">
          {eventos.map((event) => (
            <div key={event.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-900/5 group animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
              
              {(user?.role === 'master' || (user?.role === 'lider' && event.criado_por === user.id)) && (
                <button 
                  onClick={() => handleDelete(event.id)}
                  className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur p-2.5 rounded-xl text-red-500 shadow-xl active:scale-95"
                >
                  <Trash2 size={16} />
                </button>
              )}

              <div className="relative h-56 bg-gray-100 overflow-hidden">
                {event.imagem_url ? (
                  <img 
                    src={`${event.imagem_url}?t=${Date.now()}`}
                    className="w-full h-full object-cover" 
                    style={{ objectPosition: `center ${event.banner_pos_y}%` }}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544427928-c49cdfb81949?auto=format&fit=crop&q=80&w=1000'; }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50 text-gray-200"><ImageIcon size={48} /></div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-2xl shadow-xl">
                  <p className="text-[10px] font-black text-blue-600 uppercase italic">
                    {new Date(event.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                
                <div className="absolute bottom-4 right-4 bg-black text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                  <Tag size={12} className="text-blue-400" />
                  <p className="text-[10px] font-black uppercase italic">
                    {event.tipo === 'pago' ? `R$ ${event.preco.toFixed(2)}` : event.tipo === 'cota' ? 'Cota' : 'Grátis'}
                  </p>
                </div>
              </div>

              <div className="p-8">
                <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase italic tracking-tighter leading-none">{event.titulo}</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin size={12} className="text-blue-600" />
                    <p className="text-[9px] font-bold uppercase truncate">{event.endereco}</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={12} className="text-blue-600" />
                    <p className="text-[9px] font-bold uppercase">{new Date(event.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                {event.tipo === 'cota' && event.cota_desc && (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3 mb-6">
                    <AlertCircle size={16} className="text-amber-600 shrink-0" />
                    <p className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">{event.cota_desc}</p>
                  </div>
                )}

                <p className="text-sm text-gray-500 leading-relaxed font-medium line-clamp-3">{event.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de Criação */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end animate-in fade-in duration-300">
          <div className="bg-white w-full h-[92vh] rounded-t-[3.5rem] overflow-y-auto p-8 animate-in slide-in-from-bottom duration-500 pb-20">
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-2xl font-black text-gray-900 italic uppercase">Lançar Evento</h2>
               <button onClick={() => setShowForm(false)} className="bg-gray-100 p-3 rounded-full"><X /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Thumbnail / Banner</label>
                <div className="relative h-56 rounded-[2.5rem] bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden group">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} className="w-full h-full object-cover" style={{ objectPosition: `center ${bannerPosY}%` }} />
                      <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                         <Camera className="text-white w-8 h-8" />
                      </div>
                      <div className="absolute bottom-4 left-6 right-6 bg-white/90 p-4 rounded-2xl">
                          <input type="range" min="0" max="100" value={bannerPosY} onChange={(e) => setBannerPosY(parseInt(e.target.value))} className="w-full h-2 accent-blue-600" />
                      </div>
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                       <Camera className="w-10 h-10 text-gray-300 mb-2" />
                       <span className="text-[10px] font-black text-gray-400 uppercase">Selecione uma imagem</span>
                       <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <input required placeholder="TÍTULO DO EVENTO" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-black italic uppercase text-sm border-2 border-transparent focus:border-blue-600 outline-none transition-all" />
                <textarea placeholder="SOBRE O EVENTO..." value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[2rem] font-medium text-sm outline-none h-32" />
                
                <div className="grid grid-cols-2 gap-4">
                   <input required type="date" value={data} onChange={e => setData(e.target.value)} className="bg-gray-50 p-5 rounded-[1.5rem] font-black text-xs" />
                   <input required type="time" value={hora} onChange={e => setHora(e.target.value)} className="bg-gray-50 p-5 rounded-[1.5rem] font-black text-xs" />
                </div>
                <input required placeholder="LOCAL (AV, RUA, NÚMERO)" value={endereco} onChange={e => setEndereco(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-black uppercase text-xs" />
              </div>

              <div className="bg-gray-50 p-4 rounded-[2rem] space-y-4">
                <div className="flex gap-2">
                   {["gratuito", "pago", "cota"].map(t => (
                     <button key={t} type="button" onClick={() => setTipo(t as any)} className={`flex-1 p-5 rounded-2xl font-black text-[10px] uppercase transition-all ${tipo === t ? "bg-black text-white shadow-xl" : "bg-white text-gray-400"}`}>
                       {t}
                     </button>
                   ))}
                </div>
                
                {tipo === 'pago' && (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div className="bg-white p-4 rounded-2xl flex items-center gap-4">
                      <span className="font-black text-sm text-gray-400">R$</span>
                      <input type="number" step="0.01" value={preco} onChange={e => setPreco(parseFloat(e.target.value))} className="flex-1 font-black text-2xl outline-none text-blue-600" />
                    </div>
                    <div className="bg-white p-4 rounded-2xl flex items-center gap-4">
                      <QrCode size={20} className="text-gray-300" />
                      <input placeholder="CHAVE PIX" value={pixKey} onChange={e => setPixKey(e.target.value)} className="flex-1 font-black text-xs outline-none" />
                    </div>
                  </div>
                )}

                {tipo === 'cota' && (
                  <div className="bg-white p-4 rounded-2xl animate-in slide-in-from-top-2">
                    <textarea placeholder="O QUE CADA UM DEVE LEVAR? (EX: BOLO, REFRI...)" value={cotaDesc} onChange={e => setCotaDesc(e.target.value)} className="w-full h-20 outline-none font-black text-[10px] uppercase italic" />
                  </div>
                )}
              </div>

              <button disabled={saving} type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest italic disabled:opacity-50 active:scale-95">
                {saving ? <Loader2 className="animate-spin" /> : "Publicar Evento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
