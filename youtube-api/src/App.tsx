import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import PlaylistDetails from './pages/PlaylistDetails';
import Fallback from './components/Fallback';
import ErrorBoundary from './components/ErrorBoundary';
import DataRefresher from './components/DataRefresher';
import DebugInfo from './components/DebugInfo';

// Componente para receber o callback OAuth e redirecionar para o dashboard
const AuthCallback = () => {
  const { isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Log detalhado para debug
  console.log('AuthCallback ativado');
  console.log('URL completa:', window.location.href);
  console.log('Parâmetros URL:', location.search);
  console.log('Hash:', location.hash);

  useEffect(() => {
    // Se houver um erro no URL, capture e exiba
    const searchParams = new URLSearchParams(location.search);
    const errorCode = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (errorCode) {
      console.error('Erro de autenticação:', errorCode, errorDescription);
      setError(`Erro: ${errorDescription || errorCode}`);
    }
  }, [location]);
  
  // Mostrar um spinner enquanto estiver carregando
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4">Finalizando autenticação...</p>
        <p className="text-xs mt-2 max-w-md text-center">Redirecionando para o dashboard...</p>
      </div>
    );
  }

  // Exibir mensagem de erro se houver
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-red-800 text-white p-4 rounded-md max-w-md">
          <h2 className="text-xl font-bold mb-2">Erro de Autenticação</h2>
          <p>{error}</p>
          <button 
            className="mt-4 bg-white text-red-800 px-4 py-2 rounded-md"
            onClick={() => navigate('/login')}
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }
  
  // Se não estiver carregando e não houver erro, redirecionar para o dashboard
  return <Navigate to="/dashboard" replace />;
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
            {/* Mostrar componente de debug */}
            <DebugInfo />
          </Router>
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;
