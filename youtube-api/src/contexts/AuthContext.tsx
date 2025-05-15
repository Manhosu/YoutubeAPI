import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// Definimos nossas próprias interfaces em vez de usar as importações do Supabase
interface User {
  id: string;
  email?: string;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  aud: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  provider_token?: string;
  provider_refresh_token?: string;
  user: User;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {}
});

// Obtém a URL atual para usar em redirecionamentos
const getCurrentUrl = () => {
  return typeof window !== 'undefined' ? window.location.origin : '';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Efeito para inicializar a autenticação
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Verificar se há hash na URL para processamento
        if (window.location.hash && window.location.hash.includes('access_token')) {
          console.log('Token encontrado na URL, aguardando processamento pelo Supabase...');
        }

        // Obter a sessão atual
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (data.session) {
          console.log('Sessão existente encontrada');
          setSession(data.session as Session);
          setUser(data.session.user as User);
        } else {
          console.log('Nenhuma sessão encontrada');
        }
        
        // Configurar listener para mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, currentSession) => {
            console.log('Evento de autenticação:', event);
            
            if (currentSession) {
              setSession(currentSession as Session);
              setUser(currentSession.user as User);
            } else {
              setSession(null);
              setUser(null);
            }
            
            setIsLoading(false);
          }
        );
        
        // Marcar como não carregando após a verificação inicial
        setIsLoading(false);
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Erro na inicialização da autenticação:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, []);

  // Função para autenticação com Google
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      // Obter URL atual para redirecionamento
      const currentUrl = getCurrentUrl();
      const redirectUrl = `${currentUrl}/auth/callback`;
      
      console.log('Iniciando autenticação Google');
      console.log('URL de redirecionamento:', redirectUrl);
      
      // Iniciar o fluxo de OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'https://www.googleapis.com/auth/youtube.readonly',
        }
      });
      
      if (error) {
        console.error('Erro ao iniciar autenticação OAuth:', error);
        throw error;
      }
      
      console.log('Resultado da autenticação:', data);
      console.log('Redirecionando para Google...');
    } catch (error) {
      console.error('Erro na autenticação Google:', error);
      setIsLoading(false);
      throw error;
    }
  };

  // Função para logout
  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Valores do contexto
  const value = {
    session,
    user,
    isLoading,
    signInWithGoogle,
    signOut
  };

  // Exibir erro se houver
  if (error) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#fee2e2', color: '#b91c1c', margin: '20px', borderRadius: '8px' }}>
        <h2>Authentication Error</h2>
        <p>{error.message}</p>
        <p>Please check your Supabase configuration.</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
}; 