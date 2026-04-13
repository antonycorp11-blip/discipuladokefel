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

  // Helper para obter o objeto OneSignal — tenta o padrão do v16
  const getOS = (): Promise<any> => new Promise((resolve) => {
    if ((window as any).OneSignal?.initialized) {
      return resolve((window as any).OneSignal);
    }
    const deferred = (window as any).OneSignalDeferred || [];
    (window as any).OneSignalDeferred = deferred;
    deferred.push((os: any) => resolve(os));
  });

  // Inicialização apenas uma vez
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const appId = (import.meta as any).env.VITE_ONESIGNAL_APP_ID;
    if (!appId) return;

    const init = async () => {
      try {
        const os = await getOS();
        await os.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          notifyButton: { enable: false }, // Usamos nosso próprio UI
        });
        console.log('[OneSignal] Inicializado com sucesso');
      } catch (e) {
        console.warn('[OneSignal] Erro na inicialização:', e);
      }
    };
    init();
  }, []);

  // Sincronizar usuário, solicitar permissão e salvar token
  useEffect(() => {
    if (!user?.id) return;

    const sync = async () => {
      try {
        const os = await getOS();

        // Login do usuário no OneSignal (external_id)
        await os.login(user.id);

        // Tags para filtros de notificação
        os.User.addTag('role', user.role);
        if (user.celula_id) os.User.addTag('celula_id', user.celula_id);

        // Pedir permissão se ainda não tiver
        if (os.Notifications.permission !== 'granted') {
          setTimeout(() => os.Notifications.requestPermission(), 2500);
        }

        // Salvar push token no banco
        const saveToken = async () => {
          try {
            const pushId = os.User.PushSubscription.id;
            if (pushId) {
              await supabase.from('kefel_profiles').update({ push_token: pushId }).eq('id', user.id);
              console.log('[OneSignal] Token sincronizado:', pushId);
            }
          } catch (e) {
            console.warn('[OneSignal] Erro ao salvar token:', e);
          }
        };

        saveToken();
        os.User.PushSubscription.addEventListener('change', saveToken);
      } catch (e) {
        console.warn('[OneSignal] Erro na sincronização do usuário:', e);
      }
    };
    sync();
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
