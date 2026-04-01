import React, { useState, useEffect } from "react";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, CheckCircle, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase, type KefelCelula } from "@/lib/supabase";
import { Link } from "react-router-dom";

export function Register() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [celulaId, setCelulaId] = useState("");
  const [celulas, setCelulas] = useState<KefelCelula[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();

  useEffect(() => {
    supabase.from("kefel_celulas").select("*").order("nome").then(({ data }) => {
      setCelulas((data || []) as KefelCelula[]);
    });
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }

    setLoading(true);
    const result = await register(nome.trim(), email, password, celulaId || undefined);
    setLoading(false);

    if (!result.success) {
      setError(result.message || "Erro ao criar conta.");
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-6 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Conta criada!</h1>
          <p className="text-gray-500 text-sm mt-2">
            Verifique seu e-mail para confirmar o cadastro e depois faça o login.
          </p>
        </div>
        <Link
          to="/login"
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-100"
        >
          Ir para Login <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center pt-12 pb-6 px-8">
        <img src="/logo.png" alt="Kefel" className="w-24 h-24 object-contain mb-2" draggable={false} />
        <h1 className="text-2xl font-black text-gray-900">Criar Conta</h1>
        <p className="text-gray-400 text-sm font-medium text-center">
          Junte-se à comunidade Kefel.
        </p>
      </div>

      <form onSubmit={handleRegister} className="flex-1 px-8 pb-10 space-y-4">
        {/* Nome */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text" value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-gray-900"
              placeholder="Seu nome completo" required autoComplete="name"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-gray-900"
              placeholder="seu@email.com" required autoComplete="email"
            />
          </div>
        </div>

        {/* Senha */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-gray-900"
              placeholder="Mínimo 6 caracteres" required autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Confirmar */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Confirmar Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"} value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-gray-900"
              placeholder="Repita a senha" required autoComplete="new-password"
            />
            {confirmPassword && password === confirmPassword && (
              <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
          </div>
        </div>

        {/* Seletor de célula */}
        {celulas.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Minha Célula
            </label>
            <select
              value={celulaId}
              onChange={(e) => setCelulaId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-gray-900"
            >
              <option value="">— Selecionar mais tarde —</option>
              {celulas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} ({c.dia_semana})</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl px-4 py-3">{error}</div>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full bg-blue-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-70"
        >
          {loading
            ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <> Criar Conta <ArrowRight className="w-5 h-5" /></>
          }
        </button>

        <div className="text-center pt-1">
          <p className="text-gray-500 text-sm">
            Já tem conta?{" "}
            <Link to="/login" className="text-blue-700 font-bold">Entrar</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
