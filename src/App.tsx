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
import OneSignal from 'react-onesignal';

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

export default function App() {
  useEffect(() => {
    // Inicialização do OneSignal
    const initOneSignal = async () => {
      const appId = (import.meta as any).env.VITE_ONESIGNAL_APP_ID;
      if (appId) {
        try {
          await OneSignal.init({ 
            appId, 
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { 
              enable: true,
              position: 'bottom-right',
              size: 'medium',
              theme: 'default',
              prenotify: true,
              showCredit: false,
              text: {
                'tip.state.unsubscribed': 'Inscrever-se para notificações',
                'tip.state.subscribed': 'Você está inscrito',
                'tip.state.blocked': 'Você bloqueou as notificações',
                'message.prenotify': 'Clique para se inscrever',
                'message.action.subscribed': 'Obrigado por se inscrever!',
                'message.action.resubscribed': 'Você está inscrito novamente!',
                'message.action.unsubscribed': 'Você não receberá mais notificações',
                'message.action.subscribing': 'Inscrevendo...',
                'dialog.main.title': 'Gerenciar Notificações',
                'dialog.main.button.subscribe': 'INSCREVER',
                'dialog.main.button.unsubscribe': 'REMOVER',
                'dialog.blocked.title': 'Notificações Bloqueadas',
                'dialog.blocked.message': 'Por favor, desbloqueie as notificações nas configurações do seu navegador.'
              }
            } as any
          });

          // Mostrar prompt de permissão automaticamente com um pequeno delay para melhor UX
          setTimeout(() => {
            if ((OneSignal as any).showSlidedownPrompt) {
              (OneSignal as any).showSlidedownPrompt();
            }
          }, 2000);
        } catch (err) {
          console.error("Erro OneSignal:", err);
        }
      } else {
        console.warn("OneSignal App ID não configurado no .env");
      }
    };
    initOneSignal();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
