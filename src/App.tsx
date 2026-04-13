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
import { DarkModeProvider } from "./context/DarkModeContext";
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
  const initDone = React.useRef(false);

  // Inicialização apenas uma vez
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    
    // Inicialização do OneSignal v16 Nativa
    const OneSignal = (window as any).OneSignalDeferred || [];
    (window as any).OneSignalDeferred = OneSignal;
    
    OneSignal.push(async function(OneSignalObj: any) {
      const appId = (import.meta as any).env.VITE_ONESIGNAL_APP_ID;
      if (!appId) return;

      await OneSignalObj.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: true,
          position: 'bottom-right',
          size: 'medium',
          theme: 'default',
        }
      });

      // Solicitar permissão (promptOptions nativo)
      if (OneSignalObj.Notifications.permission !== 'granted') {
          setTimeout(() => {
             OneSignalObj.Notifications.requestPermission();
          }, 3000);
      }
    });

  }, []);

  // Sincronizar usuário e tags
  useEffect(() => {
    if (!user?.id) return;

    const OneSignal = (window as any).OneSignalDeferred || [];
    OneSignal.push(async function(OneSignalObj: any) {
      try {
        // Logar o usuário no OneSignal para vincular o external_id
        await OneSignalObj.login(user.id);
        
        // Adicionar tag para role-based filters (necessário para 'master')
        if (user.role) {
          OneSignalObj.User.addTag("role", user.role);
        }

        // Sincronizar token
        const syncToken = async () => {
          try {
            const pushId = await OneSignalObj.User.PushSubscription.id;
            if (pushId && user?.id) {
              console.log("Sincronizando OneSignal Token:", pushId);
              await supabase.from('kefel_profiles').update({ push_token: pushId }).eq('id', user.id);
            }
          } catch (e) {
            console.error("Erro ao sincronizar token OneSignal:", e);
          }
        };

        // Tenta sincronizar agora
        syncToken();

        // Ouvir mudanças de inscrição
        OneSignalObj.User.PushSubscription.addEventListener("change", syncToken);
      } catch (e) {
        console.error("Erro no OneSignal sync:", e);
      }
    });
  }, [user?.id, user?.role]);

  return null;
}

export default function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <OneSignalHandler />
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </DarkModeProvider>
  );
}
