import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./components/Home";
import BibleReader from "./components/BibleReader";
import { Ranking } from "./components/Ranking";
import Events from "./components/Events";
import { Profile } from "./components/Profile";
import { Login } from "./components/Login";
import { CellManagement } from "./components/CellManagement";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Onboarding } from "./components/Onboarding";
import { Library } from "./components/Library";
import { PDFViewer } from "./components/PDFViewer";
import { Reports } from "./components/Reports";
import { WhatsAppRequired } from "./components/WhatsAppRequired";
import { UserManagement } from "./components/UserManagement";
import { supabase } from "./lib/supabase";
// import OneSignal from 'react-onesignal'; // Removido em favor da v16 nativa

// ── Tela de loading global ──────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <img src="/logo.png" alt="Kefel" className="w-24 h-24 object-contain animate-pulse" />
      <p className="text-gray-400 text-sm font-medium">Carregando...</p>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // Se o usuário não tiver WhatsApp, forçamos o registro (Blindagem de Conta)
  if (user && !user.telefone && user.role !== 'master') {
    return <WhatsAppRequired />;
  }

  // Se o usuário não tiver uma célula, forçamos o Onboarding
  if (!user.celula_id && user.role !== 'master') {
    return <Onboarding />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/biblia" element={<Library />} />
        <Route path="/biblia-leitura" element={<BibleReader />} />
        <Route path="/livro/:id" element={<PDFViewer />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/eventos" element={<Events />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/perfil/:id" element={<Profile />} />
        <Route path="/celulas" element={<CellManagement />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/usuarios" element={<UserManagement />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

function OneSignalHandler() {
  const { user } = useAuth();

  useEffect(() => {
    // Inicialização do OneSignal v16 Nativa (Espelhado do projeto de referência)
    const OneSignal = (window as any).OneSignal || [];
    
    OneSignal.push(() => {
      const appId = (import.meta as any).env.VITE_ONESIGNAL_APP_ID;
      
      if (appId) {
        OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: true,
            position: 'bottom-right',
            size: 'medium',
            theme: 'default'
          }
        });

        // Sincronizar token se o usuário já estiver logado
        const syncToken = async () => {
          try {
            const pushId = OneSignal.User?.PushSubscription?.id;
            if (pushId && user?.id) {
              console.log("Sincronizando OneSignal Token:", pushId);
              await supabase.from('profiles').update({ push_token: pushId }).eq('id', user.id);
            }
          } catch (e) {
            console.error("Erro ao sincronizar token OneSignal:", e);
          }
        };

        // Tenta sincronizar após 5 segundos
        setTimeout(syncToken, 5000);

        // Ouvir mudanças de permissão
        OneSignal.Notifications?.addEventListener("permissionChange", (permission: boolean) => {
          console.log("Mudança de permissão OneSignal:", permission);
          if (permission) syncToken();
        });
      }
    });

  }, [user?.id]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <OneSignalHandler />
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
