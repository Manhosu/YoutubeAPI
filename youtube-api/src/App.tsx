import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MultiAccountProvider } from './contexts/MultiAccountContext';
import { supabase } from './lib/supabase';
import './App.css';

// Componentes
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Páginas
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import PlaylistDetails from './pages/PlaylistDetails';
import ConsolidatedReport from './pages/ConsolidatedReport';
import AuthCallback from './pages/AuthCallback';
import Fallback from './components/Fallback';
import DataRefresher from './components/DataRefresher';
import VideoDetail from './pages/VideoDetail';
import NotFound from './pages/NotFound';
import Preview from './pages/Preview';
import VideoAnalytics from './pages/VideoAnalytics';

// Componente para receber o callback OAuth e redirecionar para o dashboard
const OAuth2Callback = () => {
  const { isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('AuthCallback ativado');
  console.log('URL completa:', window.location.href);
  
  // Efeito para lidar com o redirecionamento após autenticação
  useEffect(() => {
    console.log('OAuth2Callback effect - loading:', isLoading, 'user:', user ? 'exists' : 'null');
    
    // Se não estiver carregando e o usuário estiver autenticado, redirecionar para o dashboard
    if (!isLoading && user) {
      console.log('Usuário autenticado, redirecionando para dashboard');
      navigate('/dashboard', { replace: true });
      return;
    }
    
    // Se não estiver carregando e não houver usuário, mas houver hash na URL
    if (!isLoading && !user && location.hash && location.hash.includes('access_token')) {
      console.log('Token encontrado no hash, mas usuário não autenticado. Tentando processar...');
      
      // Tentar processar a sessão manualmente após um pequeno atraso
      const processHash = async () => {
        try {
          console.log('Iniciando processamento manual de hash...');
          
          // Dar tempo para o Supabase processar o hash
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verificar novamente a sessão
          const { data } = await supabase.auth.getSession();
          console.log('Sessão após processamento:', data.session ? 'encontrada' : 'não encontrada');
          
          if (data.session) {
            console.log('Sessão obtida com sucesso! Redirecionando para dashboard');
            navigate('/dashboard', { replace: true });
          } else {
            console.log('Falha ao obter sessão após processamento, redirecionando para login');
            navigate('/login', { replace: true });
          }
        } catch (error) {
          console.error('Erro ao processar hash:', error);
          navigate('/login', { replace: true });
        }
      };
      
      processHash();
    } else if (!isLoading && !user) {
      // Se não há usuário e não está carregando, redirecionar para login
      console.log('Não há usuário ou token na URL, redirecionando para login');
      navigate('/login', { replace: true });
    }
  }, [isLoading, user, navigate, location]);
  
  // Mostrar um spinner enquanto estiver carregando
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4">Processando autenticação...</p>
      <p className="text-xs mt-2 max-w-md text-center text-gray-300">
        Redirecionando automaticamente...
      </p>
    </div>
  );
};

// Componente para rota protegida
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  
  // Enquanto estiver carregando, não redirecionamos
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--primary-bg)]">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Se não tiver usuário autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Se estiver autenticado, renderiza a rota normalmente
  return <>{children}</>;
};

function App() {
  console.log('App rendering');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulando um pequeno atraso para garantir que os estilos sejam aplicados
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Mostrar informações sobre variáveis de ambiente
  console.log('=== App Environment ===');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL || 'não definido');
  console.log('VITE_SITE_URL:', import.meta.env.VITE_SITE_URL || 'não definido');
  console.log('Tem chave Supabase:', Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY));
  console.log('Window Origin:', window.location.origin);
  console.log('Environment:', import.meta.env.DEV ? 'development' : 'production');

  const appStyle = {
    backgroundColor: '#f9fafb',
    color: '#1f2937',
    minHeight: '100vh',
    display: 'block',
  };

  if (isLoading) {
    return <Fallback />;
  }
  
  const emergencyFallback = (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f9fafb', 
      color: '#1f2937', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <h1>YouTube Playlist Analyzer</h1>
      <p>Ocorreu um erro ao carregar a aplicação.</p>
      <p>Por favor, verifique o console para mais detalhes.</p>
      <button 
        style={{
          padding: '10px 20px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '20px',
        }}
        onClick={() => window.location.reload()}
      >
        Tentar novamente
        </button>
    </div>
  );

  return (
    <ErrorBoundary fallback={emergencyFallback}>
      <div style={appStyle} className="app-container">
        <AuthProvider>
          <MultiAccountProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<OAuth2Callback />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
                <Route path="/playlist/:id" element={<ProtectedRoute><PlaylistDetails /></ProtectedRoute>} />
                <Route path="/video/:id" element={<ProtectedRoute><VideoDetail /></ProtectedRoute>} />
                <Route path="/preview" element={<ProtectedRoute><Preview /></ProtectedRoute>} />
                <Route path="/report" element={<ProtectedRoute><ConsolidatedReport /></ProtectedRoute>} />
                <Route path="/video-analytics" element={<ProtectedRoute><VideoAnalytics /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              {/* Componente invisível para gerenciar atualizações automáticas de dados */}
              <DataRefresher />
            </Router>
          </MultiAccountProvider>
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;
