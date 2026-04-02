import React, { useState, useEffect } from "react";
import { 
  Plus, Calendar, MapPin, Clock, Users, ChevronRight, 
  X, Camera, Loader2, Image as ImageIcon, Map, CheckCircle, Search, Edit2, Trash2, Upload, Tag
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
  tipo: "gratuito" | "pago";
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
  const [tipo, setTipo] = useState<"gratuito" | "pago">("gratuito");
  const [bannerPosY, setBannerPosY] = useState(50);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    const { data, error } = await supabase
      .from("kefel_eventos")
      .select("*")
      .order("data_hora", { ascending: true });
    
    if (!error) setEventos(data || []);
    setLoading(false);
  }

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
      const fileName = `${Math.random()}.${fileExt}`;
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

    // Combina data e hora para ISO String
    const dataHoraIso = new Date(`${data}T${hora}`).toISOString();

    const { error } = await supabase.from("kefel_eventos").insert({
      titulo,
      descricao,
      data_hora: dataHoraIso,
      endereco,
      preco,
      tipo,
      imagem_url: imageUrl,
      banner_pos_y: bannerPosY,
      criado_por: user.id
    });

    if (!error) {
      setShowForm(false);
      fetchEvents();
      // Limpeza
      resetForm();
    } else {
      alert(`Erro ao salvar: ${error.message}`);
    }
    setSaving(false);
  }

  const resetForm = () => {
    setTitulo(""); setDescricao(""); setData(""); setHora(""); 
    setEndereco(""); setPreco(0); setTipo("gratuito");
    setImageFile(null); setImagePreview(null); setBannerPosY(50);
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFD] pt-14 pb-24 px-6 overflow-y-auto">
      <header className="flex justify-between items-center mb-8 sticky top-0 bg-[#FDFDFD]/80 backdrop-blur-md pt-4 z-10">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase underline decoration-blue-600 decoration-4">Agenda</h1>
           <p className="text-[10px] font-black text-gray-400 uppercase italic mt-1 tracking-widest">Kefel Comunitário</p>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="bg-black text-white p-4 rounded-[1.5rem] shadow-2xl active:scale-90 transition-all border border-gray-800"
        >
          <Plus size={20} className="text-blue-400" />
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-600" /></div>
      ) : eventos.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
           <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-400 font-bold italic uppercase text-xs">Nenhum evento agendado</p>
        </div>
      ) : (
        <div className="grid gap-8 pb-10">
          {eventos.map((event) => (
            <div key={event.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-900/5 group animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative h-56 bg-gray-100 overflow-hidden">
                {event.imagem_url ? (
                  <img 
                    src={event.imagem_url} 
                    className="w-full h-full object-cover" 
                    style={{ objectPosition: `center ${event.banner_pos_y}%` }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50 text-gray-200"><ImageIcon size={48} /></div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-2xl shadow-xl">
                  <p className="text-[10px] font-black text-blue-600 uppercase italic">
                    {new Date(event.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                {event.tipo === 'pago' && (
                  <div className="absolute top-4 right-4 bg-black text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                    <Tag size={12} className="text-blue-400" />
                    <p className="text-[10px] font-black uppercase italic">R$ {event.preco.toFixed(2)}</p>
                  </div>
                )}
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase italic tracking-tighter leading-none">{event.titulo}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="bg-gray-100 p-2 rounded-xl"><MapPin size={12} className="text-blue-600" /></div>
                    <p className="text-[9px] font-bold uppercase truncate">{event.endereco}</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="bg-gray-100 p-2 rounded-xl"><Clock size={12} className="text-blue-600" /></div>
                    <p className="text-[9px] font-bold uppercase">{new Date(event.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <p className="mt-6 text-sm text-gray-500 leading-relaxed font-medium line-clamp-3">{event.descricao}</p>
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
              {/* Foto do Banner */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Thumbnail / Banner</label>
                <div className="relative h-56 rounded-[2.5rem] bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden group">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} className="w-full h-full object-cover" style={{ objectPosition: `center ${bannerPosY}%` }} />
                      <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="bg-white/90 p-4 rounded-3xl shadow-xl"><Upload className="text-blue-600" /></div>
                      </div>
                      <div className="absolute bottom-4 left-6 right-6">
                         <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl">
                            <div className="flex justify-between font-black uppercase text-[10px] mb-2">
                               <span className="text-gray-400">Enquadramento</span>
                               <span className="text-blue-600">{bannerPosY}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="100" value={bannerPosY} 
                              onChange={(e) => setBannerPosY(parseInt(e.target.value))}
                              className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                         </div>
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

              {/* Informações */}
              <div className="space-y-4">
                <input required placeholder="TÍTULO DO EVENTO" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-black italic uppercase text-sm border-2 border-transparent focus:border-blue-600 outline-none transition-all" />
                <textarea placeholder="SOBRE O EVENTO..." value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[2rem] font-medium text-sm outline-none h-32 focus:border-blue-600 transition-all border-2 border-transparent" />
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <p className="text-[9px] font-black text-gray-400 uppercase ml-2">DATA</p>
                     <input required type="date" value={data} onChange={e => setData(e.target.value)} className="w-full bg-gray-50 p-5 rounded-[1.5rem] font-black text-xs outline-none" />
                   </div>
                   <div className="space-y-1">
                     <p className="text-[9px] font-black text-gray-400 uppercase ml-2">HORA</p>
                     <input required type="time" value={hora} onChange={e => setHora(e.target.value)} className="w-full bg-gray-50 p-5 rounded-[1.5rem] font-black text-xs outline-none" />
                   </div>
                </div>

                <input required placeholder="LOCAL (AV, RUA, NÚMERO)" value={endereco} onChange={e => setEndereco(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[1.5rem] font-black uppercase text-xs outline-none" />
              </div>

              {/* Tipo e Preço */}
              <div className="bg-gray-50 p-4 rounded-[2rem] space-y-4">
                <div className="flex gap-2">
                   {["gratuito", "pago"].map(t => (
                     <button key={t} type="button" onClick={() => setTipo(t as any)} className={`flex-1 p-5 rounded-2xl font-black text-[10px] uppercase italic transition-all ${tipo === t ? "bg-black text-white shadow-xl" : "bg-white text-gray-400"}`}>
                       {t === 'gratuito' ? 'Gratuito' : 'Pago'}
                     </button>
                   ))}
                </div>
                {tipo === 'pago' && (
                  <div className="bg-white p-4 rounded-2xl flex items-center gap-4 animate-in zoom-in duration-200">
                    <span className="font-black text-sm text-gray-400">R$</span>
                    <input type="number" step="0.01" value={preco} onChange={e => setPreco(parseFloat(e.target.value))} className="flex-1 font-black text-2xl outline-none text-blue-600" />
                  </div>
                )}
              </div>

              <button disabled={saving} type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest italic disabled:opacity-50 active:scale-95 transition-all">
                {saving ? <Loader2 className="animate-spin" /> : "Publicar Evento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
