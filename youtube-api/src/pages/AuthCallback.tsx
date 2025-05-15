import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Página de callback ativada, processando autenticação...');

        // O Supabase deve detectar automaticamente os parâmetros na URL
        // Mas podemos forçar uma verificação da sessão
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao verificar sessão:', sessionError);
          setError('Falha na autenticação. Por favor, tente novamente.');
          
          // Aguardar um momento antes de redirecionar
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        if (data.session) {
          console.log('Autenticação bem-sucedida!');
          // Redirecionar para o dashboard após autenticação bem-sucedida
          navigate('/dashboard');
        } else {
          console.log('Nenhuma sessão encontrada após callback OAuth');
          setError('Nenhuma sessão encontrada. Por favor, tente fazer login novamente.');
          
          // Aguardar um momento antes de redirecionar
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (err) {
        console.error('Erro no processo de callback:', err);
        setError('Ocorreu um erro durante a autenticação. Por favor, tente novamente.');
        
        // Aguardar um momento antes de redirecionar
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="card p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Processando Autenticação</h1>
        
        {error ? (
          <div className="bg-red-900/30 border border-red-800 p-4 rounded-md mb-6 text-center">
            <p className="text-red-300">{error}</p>
            <p className="text-gray-400 text-sm mt-2">Redirecionando para a página de login...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-red-600 border-gray-600 rounded-full animate-spin mb-4"></div>
            <p className="text-center text-gray-300">
              Estamos processando sua autenticação. Por favor, aguarde...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 