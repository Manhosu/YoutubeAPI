import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import PlaylistDetails from './pages/PlaylistDetails';
import Fallback from './components/Fallback';
import ErrorBoundary from './components/ErrorBoundary';
import DataRefresher from './components/DataRefresher';

// Componente para receber o callback OAuth e redirecionar para o dashboard
const AuthCallback = () => {
  const { isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('AuthCallback ativado');
  console.log('URL completa:', window.location.href);
  
  // Efeito para lidar com o redirecionamento após autenticação
  useEffect(() => {
    // Se não estiver carregando e o usuário estiver autenticado, redirecionar para o dashboard
    if (!isLoading && user) {
      console.log('Usuário autenticado, redirecionando para dashboard');
      navigate('/dashboard', { replace: true });
    }
    
    // Se não estiver carregando e não houver usuário, mas houver hash na URL
    if (!isLoading && !user && location.hash && location.hash.includes('access_token')) {
      console.log('Token encontrado no hash, mas usuário não autenticado. Tentando processar...');
      
      // Tentar processar a sessão manualmente após um pequeno atraso
      const processHash = async () => {
        try {
          // Dar tempo para o Supabase processar o hash
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verificar novamente a sessão
          const { data } = await supabase.auth.getSession();
          
          if (data.session) {
            console.log('Sessão obtida com sucesso!');
            navigate('/dashboard', { replace: true });
          } else {
            console.log('Falha ao obter sessão');
            navigate('/login', { replace: true });
          }
        } catch (error) {
          console.error('Erro ao processar hash:', error);
          navigate('/login', { replace: true });
        }
      };
      
      processHash();
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
          <Router>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/search" element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              } />
              <Route path="/playlist/:id" element={
                <ProtectedRoute>
                  <PlaylistDetails />
                </ProtectedRoute>
              } />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            {/* Componente invisível para gerenciar atualizações automáticas de dados */}
            <DataRefresher />
          </Router>
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;
