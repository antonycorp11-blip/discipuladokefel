import React, { useEffect, useRef } from "react";
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

// ── Tela de loading global ──────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-4 transition-colors">
      <img src="/logo.png" alt="Kefel" className="w-24 h-24 object-contain animate-pulse" />
      <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">Carregando...</p>
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

// ── Helper: enfileira callback no OneSignalDeferred (padrão v16) ─
function pushToOneSignal(callback: (os: any) => void) {
  const win = window as any;
  win.OneSignalDeferred = win.OneSignalDeferred || [];
  win.OneSignalDeferred.push(callback);
}

function OneSignalHandler() {
  const { user } = useAuth();
  const initDone = useRef(false);
  const permissionRequested = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const appId = (import.meta as any).env.VITE_ONESIGNAL_APP_ID;
    if (!appId) {
      console.warn('[OneSignal] VITE_ONESIGNAL_APP_ID não definido.');
      return;
    }

    pushToOneSignal(async (os) => {
      try {
        await os.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          notifyButton: { enable: false },
        });
        console.log('[OneSignal] Inicializado com sucesso ✅');
      } catch (e) {
        console.warn('[OneSignal] Erro na inicialização:', e);
      }
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;

        pushToOneSignal(async (os) => {
          try {
            if (!os || !os.login) {
              console.warn('[OneSignal] SDK não carregou corretamente ou está bloqueado.');
              return;
            }

            await os.login(user.id);
            console.log('[OneSignal] Usuário associado:', user.id);

            if (os.User) {
              os.User.addTag('role', user.role);
              if (user.celula_id) os.User.addTag('celula_id', String(user.celula_id));
            }

            if (!permissionRequested.current && os.Notifications && os.Notifications.permission !== 'granted') {
              permissionRequested.current = true;
              setTimeout(async () => {
                try {
                  await os.Notifications.requestPermission();
                } catch (pe) {
                  console.warn('[OneSignal] Falha ao pedir permissão:', pe);
                }
              }, 4000);
            }

            // Salvar push subscription ID no banco
            const savePushId = async () => {
              try {
                const pushId = os.User?.PushSubscription?.id;
                if (pushId) {
                  await supabase
                    .from('kefel_profiles')
                    .update({ push_token: pushId })
                    .eq('id', user.id);
                  console.log('[OneSignal] Token salvo:', pushId);
                }
              } catch (te) {
                console.warn('[OneSignal] Erro ao salvar token:', te);
              }
            };

            savePushId();
            os.User?.PushSubscription?.addEventListener('change', savePushId);
          } catch (e) {
            console.warn('[OneSignal] Erro na sincronização:', e.message);
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
