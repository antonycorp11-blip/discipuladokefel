import React, { useState, useEffect } from "react";
import { 
  Plus, Calendar, MapPin, Clock, Users, ChevronRight, 
  X, Camera, Loader2, Image as ImageIcon, Map, CheckCircle, Search, Edit2, Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  horario: string;
  local: string;
  imagem_url: string;
  banner_pos_y: number;
  tipo: "gratis" | "pago" | "cota";
  vagas_totais: number;
  vagas_preenchidas: number;
  cota_itens: string[];
}

export default function Events() {
  const { user, profile } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");
  const [tipo, setTipo] = useState<Evento["tipo"]>("gratis");
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
      .order("data", { ascending: true });
    
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
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("event-banners")
        .upload(fileName, imageFile);
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("event-banners")
          .getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("kefel_eventos").insert({
      titulo,
      descricao,
      data,
      horario,
      local,
      imagem_url: imageUrl,
      banner_pos_y: bannerPosY,
      tipo,
      vagas_totais: 100,
      vagas_preenchidas: 0
    });

    if (!error) {
      setShowForm(false);
      fetchEvents();
      // Reset
      setTitulo(""); setDescricao(""); setData(""); setHorario(""); setLocal(""); setImageFile(null); setImagePreview(null);
    } else {
      alert(`Erro: ${error.message}`);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 pb-28 pt-14 px-4 bg-[#FDFDFD]" style={{ minHeight: "100vh" }}>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase underline decoration-blue-600 decoration-4">Eventos</h1>
        </div>
        {user && (
          <button 
            onClick={() => setShowForm(true)} 
            className="bg-black text-white p-4 rounded-3xl shadow-2xl active:scale-90 transition-all"
          >
            <Plus />
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
      ) : eventos.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
           <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-400 font-bold italic uppercase text-xs">Nenhum evento agendado</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {eventos.map((event) => (
            <div key={event.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-900/5 group">
              <div className="relative h-48 bg-gray-100 overflow-hidden">
                {event.imagem_url ? (
                  <img 
                    src={event.imagem_url} 
                    className="w-full h-full object-cover" 
                    style={{ objectPosition: `center ${event.banner_pos_y}%` }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full"><ImageIcon className="text-gray-200" /></div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-2xl">
                  <p className="text-[10px] font-black text-blue-600 uppercase italic">
                    {new Date(event.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic">{event.titulo}</h3>
                <div className="flex flex-wrap gap-4 text-gray-400">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase"><MapPin size={12} /> {event.local}</div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase"><Clock size={12} /> {event.horario}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end">
          <div className="bg-white w-full h-[92vh] rounded-t-[3.5rem] overflow-y-auto pt-14 pb-10 px-6">
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-2xl font-black text-gray-900 italic uppercase">Novo Evento</h2>
               <button onClick={() => setShowForm(false)} className="bg-gray-100 p-3 rounded-full"><X /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Imagem do Banner</label>
                <div className="relative h-48 rounded-[2rem] bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden group">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} className="w-full h-full object-cover" style={{ objectPosition: `center ${bannerPosY}%` }} />
                      <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="bg-white/90 p-4 rounded-3xl shadow-xl"><Upload className="text-blue-600" /></div>
                      </div>
                      <div className="absolute bottom-4 left-6 right-6">
                         <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl">
                            <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                               <span>Enquadramento</span>
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
                       <span className="text-[10px] font-black text-gray-400 uppercase">Toque para Upload</span>
                       <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <input required placeholder="TÍTULO DO EVENTO" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full bg-gray-50 p-5 rounded-2xl font-black italic uppercase text-sm border-2 border-transparent focus:border-blue-600 outline-none" />
                <textarea placeholder="DESCRIÇÃO" value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full bg-gray-50 p-5 rounded-3xl font-medium text-sm outline-none h-32" />
                <div className="grid grid-cols-2 gap-4">
                   <input required type="date" value={data} onChange={e => setData(e.target.value)} className="bg-gray-50 p-4 rounded-2xl font-black text-xs outline-none" />
                   <input required type="time" value={horario} onChange={e => setHorario(e.target.value)} className="bg-gray-50 p-4 rounded-2xl font-black text-xs outline-none" />
                </div>
                <input required placeholder="LOCAL" value={local} onChange={e => setLocal(e.target.value)} className="w-full bg-gray-50 p-5 rounded-2xl font-black uppercase text-xs outline-none" />
              </div>

              <div className="grid grid-cols-3 gap-2 py-4">
                {["gratis", "pago", "cota"].map((t) => (
                  <button key={t} type="button" onClick={() => setTipo(t as any)} className={`p-4 rounded-2xl font-black text-[10px] uppercase italic transition-all ${tipo === t ? "bg-blue-600 text-white shadow-xl shadow-blue-100" : "bg-gray-50 text-gray-400"}`}>
                    {t === 'gratis' ? 'Grátis' : t === 'pago' ? 'Pago' : 'Cota'}
                  </button>
                ))}
              </div>

              <button disabled={saving} type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest italic disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" /> : "Criar Evento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
