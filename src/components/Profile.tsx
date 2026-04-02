import React, { useState, useEffect } from "react";
import { User, Settings, LogOut, Shield, Users, BookOpen, Clock, Crown, Loader2, Camera, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase, type KefelCelula } from "@/lib/supabase";
import { Link } from "react-router-dom";

export function Profile() {
  const { user, setUser, logout } = useAuth();
  const [meuGrupo, setMeuGrupo] = useState<KefelCelula | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user?.celula_id) return;
    setLoading(true);
    supabase.from("kefel_celulas").select("*").eq("id", user.celula_id).single().then(({ data }) => {
      setMeuGrupo(data as any);
      setLoading(false);
    });
  }, [user?.celula_id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);
      const publicUrl = urlData.publicUrl;

      const { data: updated, error: updateError } = await supabase.from("kefel_profiles").update({ avatar_url: publicUrl }).eq("id", user.id).select("*").single();
      if (updateError) throw updateError;

      setUser(updated as any);
      alert("Foto atualizada!");
    } catch (err: any) {
      alert("Erro no upload: " + err.message);
    }
    setUploading(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0min";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}min`;
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-transparent pt-14 pb-24 px-6 overflow-y-auto">
      <header className="mb-8 pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 italic uppercase">Perfil</h1>
          <div className="h-1.5 w-12 bg-indigo-600 rounded-full mt-1"></div>
        </div>
        <button className="glass-panel p-3.5 rounded-2xl text-indigo-600 active:scale-95 transition-transform shadow-sm"><Settings className="w-5 h-5" /></button>
      </header>

      <div className="flex flex-col items-center gap-6 py-10 glass-panel rounded-[3.5rem] shadow-premium shadow-indigo-500/5 mb-8 relative border-white/50">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-rose-500 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition-soft"></div>
          <div className="relative w-32 h-32 bg-white rounded-[2.8rem] shadow-xl border-4 border-white flex items-center justify-center overflow-hidden transition-soft group-hover:scale-105">
            {uploading ? (
              <Loader2 className="animate-spin text-indigo-600" />
            ) : user.avatar_url ? (
              <img src={user.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <User size={56} className="text-indigo-100" />
            )}
          </div>
          <label className="absolute -bottom-2 -right-2 bg-black text-white p-3.5 rounded-2xl shadow-xl cursor-pointer active:scale-90 transition-soft hover:bg-indigo-600">
            <Camera size={20} />
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
          </label>
        </div>
        <div className="text-center px-4">
          <h2 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter leading-tight">{user.nome}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
             <div className="h-0.5 w-4 bg-indigo-600 opacity-20" />
             <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{user.role}</p>
             <div className="h-0.5 w-4 bg-indigo-600 opacity-20" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8">
        <div className="glass-panel p-6 rounded-[2.5rem] shadow-sm border-white/50 flex flex-col gap-3 transition-soft hover:shadow-lg">
           <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm"><Clock size={20} /></div>
           <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tempo Lido</p>
              <p className="text-xl font-black text-gray-900 italic tracking-tighter">{formatTime(user.tempo_leitura_total)}</p>
           </div>
        </div>
        <div className="glass-panel p-6 rounded-[2.5rem] shadow-sm border-white/50 flex flex-col gap-3 transition-soft hover:shadow-lg">
           <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shadow-sm"><Users size={20} /></div>
           <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Célula</p>
              <p className="text-sm font-black text-gray-900 truncate italic tracking-tighter">{meuGrupo?.nome || "Sem Célula"}</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {(user.role === 'master' || user.role === 'lider') && (
          <Link to="/celulas" className="p-6 flex items-center justify-between hover:bg-gray-50 border-b border-gray-50">
             <div className="flex items-center gap-4">
                <Users className="text-blue-600" size={20} />
                <span className="font-bold text-gray-900 text-sm">Gerenciar Células</span>
             </div>
             <ChevronRight className="text-gray-200" size={16} />
          </Link>
        )}
        <button onClick={logout} className="p-6 flex items-center justify-between hover:bg-red-50 active:bg-red-100 transition-colors">
           <div className="flex items-center gap-4">
              <LogOut className="text-red-500" size={20} />
              <span className="font-bold text-red-600 text-sm">Sair da Conta</span>
           </div>
        </button>
      </div>
    </div>
  );
}
