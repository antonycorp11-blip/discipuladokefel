import { User, Settings, LogOut, Shield, Users, BookOpen, Clock, Crown, Loader2, Camera, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
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
    <div className="flex flex-col h-screen bg-[#FDFDFD] pt-14 pb-24 px-6 overflow-y-auto">
      <header className="mb-8 pt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 italic uppercase underline decoration-blue-600 decoration-4">Perfil</h1>
        <button className="bg-gray-100 p-3 rounded-2xl text-gray-400 active:scale-95 transition-transform"><Settings className="w-5 h-5" /></button>
      </header>

      <div className="flex flex-col items-center gap-4 py-8 bg-white rounded-[3rem] shadow-sm border border-gray-100 mb-8 relative">
        <div className="relative">
          <div className="w-28 h-28 bg-gray-50 rounded-[2.5rem] shadow-sm border-4 border-white flex items-center justify-center overflow-hidden">
            {uploading ? (
              <Loader2 className="animate-spin text-blue-600" />
            ) : user.avatar_url ? (
              <img src={user.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-blue-100" />
            )}
          </div>
          <label className="absolute bottom-0 right-0 bg-blue-600 p-2.5 rounded-2xl text-white shadow-xl cursor-pointer active:scale-90 transition-transform">
            <Camera size={18} />
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
          </label>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-900 italic uppercase underline decoration-blue-600 decoration-4">{user.nome}</h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">{user.role}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-2">
           <Clock size={20} className="text-blue-600" />
           <p className="text-[10px] font-black text-gray-400 uppercase">Tempo Lido</p>
           <p className="text-lg font-black text-gray-900 italic">{formatTime(user.tempo_leitura_total)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-2">
           <Users size={20} className="text-green-600" />
           <p className="text-[10px] font-black text-gray-400 uppercase">Célula</p>
           <p className="text-sm font-black text-gray-900 truncate italic">{meuGrupo?.nome || "Sem Célula"}</p>
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
