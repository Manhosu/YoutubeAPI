import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase, siteUrl } from '../lib/supabase';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  console.log('AuthProvider rendering');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('AuthProvider useEffect running');
    const setInitialData = async () => {
      try {
        // Get the initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log('Initial session:', initialSession ? 'exists' : 'null');
        setSession(initialSession as Session | null);
        setUser(initialSession?.user as User | null);
        setIsLoading(false);

        // Set up the auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state change:', event);
          setSession(session as Session | null);
          setUser(session?.user as User | null);
          setIsLoading(false);
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Error in auth setup:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };

    setInitialData();
  }, []);

  // Solução mais simples e direta de autenticação
  const signInWithGoogle = async () => {
    try {
      // Log completo das informações de URL para debug
      console.log('=== Autenticação Google - Informações de URL ===');
      console.log('siteUrl (da lib/supabase):', siteUrl);
      console.log('URL de redirecionamento completa:', `${siteUrl}/auth/callback`);
      console.log('window.location.origin:', window.location.origin);
      console.log('VITE_SITE_URL:', import.meta.env.VITE_SITE_URL);
      
      // Usar a URL do Vercel quando estiver em produção
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'https://www.googleapis.com/auth/youtube.readonly',
        }
      });
      
      // Log após o redirecionamento
      console.log('Redirecionando para o Google...');
    } catch (error) {
      console.error('Erro crítico durante autenticação:', error);
      alert('Erro durante autenticação com Google. Verifique o console para detalhes.');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    session,
    user,
    isLoading,
    signInWithGoogle,
    signOut
  };

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