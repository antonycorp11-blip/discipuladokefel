import React, { useState } from "react";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message || "Credenciais inválidas.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header com logo */}
      <div className="flex flex-col items-center pt-16 pb-8 px-8">
        <img
          src="/logo.png"
          alt="Kefel Discipulado"
          className="w-40 h-40 object-contain mb-2"
          draggable={false}
        />
        <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center">
          Discipulado Kefel
        </h1>
        <p className="text-gray-400 text-sm font-medium text-center mt-1">
          Cresça na palavra. Avance no discipulado.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex-1 px-8 pb-10 space-y-6">
        <div className="bg-blue-950 rounded-3xl p-1.5">
          <p className="text-center text-blue-300 text-xs font-bold uppercase tracking-widest py-1.5">
            Entrar na sua conta
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-medium text-gray-900"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-medium text-gray-900"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-70 mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Entrar Agora <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-gray-500 text-sm font-medium">
            Não tem uma conta?{" "}
            <Link to="/register" className="text-blue-700 font-bold">
              Criar Conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
