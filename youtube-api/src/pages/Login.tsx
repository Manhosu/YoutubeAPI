import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const Login = () => {
  const { user, signInWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
    
    // Animação de entrada
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [user, isLoading, navigate]);
  
  const handleGoogleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
    }
  };
  
  return (
    <Layout>
      <div className={`max-w-md mx-auto mt-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Círculos decorativos */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl opacity-50 animate-pulse hidden lg:block"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl opacity-50 animate-pulse hidden lg:block"></div>
        
        <div className="card p-8 flex flex-col items-center relative overflow-hidden">
          {/* Efeito de brilho no topo do card */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl"></div>
          
          <div className="relative">
            <svg 
              className="w-16 h-16 text-red-600 mb-6 floating" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
            
            <h1 className="text-2xl font-bold text-center mb-2 gradient-text">Login</h1>
            
            <div className="w-16 h-1 mx-auto bg-gradient-to-r from-red-500 to-red-700 rounded-full mb-6"></div>
          </div>
          
          <p className="text-gray-400 text-center mb-8 max-w-xs thin-text">
            Entre com sua conta Google para analisar suas playlists e vídeos.
          </p>
          
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition duration-300 relative overflow-hidden group"
            disabled={isLoading}
          >
            {/* Efeito de brilho no botão */}
            <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out"></span>
            
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Carregando...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium">Entrar com Google</span>
              </div>
            )}
          </button>
          
          {/* Linha decorativa com gradiente */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-8"></div>
          
          <div className="text-sm text-gray-500 text-center">
            <p className="flex items-center justify-center caption">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Acesso seguro e apenas leitura para suas playlists
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Login; 