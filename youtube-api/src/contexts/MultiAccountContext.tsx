import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// Interface para um perfil de conta Google
export interface GoogleAccount {
  id: string;
  email: string;
  avatarUrl: string;
  displayName: string;
  providerToken: string;
  channelId?: string;
  channelTitle?: string;
  channelThumbnail?: string;
  isActive: boolean;
}

interface MultiAccountContextType {
  accounts: GoogleAccount[];
  activeAccount: GoogleAccount | null;
  isLoading: boolean;
  addAccount: () => Promise<void>;
  removeAccount: (accountId: string) => void;
  switchAccount: (accountId: string) => void;
  refreshAccountData: (accountId: string) => Promise<void>;
  getAllAccountsData: () => GoogleAccount[];
}

// Chave para armazenar contas no localStorage
const ACCOUNTS_STORAGE_KEY = 'youtube_analyzer_accounts';

// Criar o contexto
const MultiAccountContext = createContext<MultiAccountContextType>({
  accounts: [],
  activeAccount: null,
  isLoading: true,
  addAccount: async () => {},
  removeAccount: () => {},
  switchAccount: () => {},
  refreshAccountData: async () => {},
  getAllAccountsData: () => []
});

export const MultiAccountProvider = ({ children }: { children: ReactNode }) => {
  // Estado para controlar as contas
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<GoogleAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user, session } = useAuth();

  // Efeito para inicializar o provedor com a conta principal
  useEffect(() => {
    const initializeWithPrimaryAccount = async () => {
      // Se não tiver usuário logado ainda, não faz nada
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('Inicializando MultiAccountContext com usuário:', user.id);
        // Se não tiver token do provedor, tenta obter da sessão
        if (!session?.provider_token) {
          console.warn('Provider token não disponível na sessão');
          setIsLoading(false);
          return;
        }

        // Carregar contas salvas anteriormente
        const savedAccounts = loadAccountsFromStorage();
        
        // Verificar se o usuário atual já existe nas contas salvas
        const existingAccount = savedAccounts.find(acc => acc.id === user.id);
        
        if (existingAccount) {
          console.log('Conta existente encontrada:', existingAccount.email);
          // Atualizar o token do provedor se necessário
          existingAccount.providerToken = session.provider_token;
          
          // Definir como ativa se não houver outra conta ativa
          const activeAcc = savedAccounts.find(acc => acc.isActive);
          if (!activeAcc) {
            existingAccount.isActive = true;
          }
          
          // Atualizar as contas e definir a conta ativa
          setAccounts(savedAccounts);
          setActiveAccount(existingAccount.isActive ? existingAccount : activeAcc || null);
          
          // Salvar atualizações no storage
          saveAccountsToStorage(savedAccounts);
        } else {
          console.log('Criando nova conta para o usuário atual');
          // Criar uma nova conta com o usuário atual
          const newAccount: GoogleAccount = {
            id: user.id,
            email: user.email || '',
            avatarUrl: user.user_metadata?.avatar_url || '',
            displayName: user.user_metadata?.full_name || user.email || '',
            providerToken: session.provider_token,
            isActive: true
          };
          
          // Adicionar a nova conta
          const updatedAccounts = [...savedAccounts, newAccount];
          
          // Desativar outras contas se a nova for ativa
          if (newAccount.isActive) {
            updatedAccounts.forEach(acc => {
              if (acc.id !== newAccount.id) {
                acc.isActive = false;
              }
            });
          }
          
          setAccounts(updatedAccounts);
          setActiveAccount(newAccount);
          
          // Salvar no localStorage
          saveAccountsToStorage(updatedAccounts);
        }
      } catch (error) {
        console.error('Erro ao inicializar com conta primária:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeWithPrimaryAccount();
  }, [user, session]);

  // Função para adicionar uma nova conta
  const addAccount = async (): Promise<void> => {
    // Verificar se já temos 3 contas (limite)
    if (accounts.length >= 3) {
      throw new Error('Limite de 3 contas atingido. Remova uma conta antes de adicionar outra.');
    }

    try {
      setIsLoading(true);
      
      // Iniciar fluxo de autenticação para nova conta
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?multi_account=true`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent select_account',
          },
          scopes: 'https://www.googleapis.com/auth/youtube.readonly',
        }
      });

      if (error) throw error;
      
      // A página será redirecionada, então a adição da conta será concluída após o redirecionamento
    } catch (error) {
      console.error('Erro ao adicionar nova conta:', error);
      setIsLoading(false);
      throw error;
    }
  };

  // Função para remover uma conta
  const removeAccount = (accountId: string): void => {
    const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
    
    // Se a conta ativa for removida, definir outra como ativa
    if (activeAccount?.id === accountId && updatedAccounts.length > 0) {
      updatedAccounts[0].isActive = true;
      setActiveAccount(updatedAccounts[0]);
    } else if (updatedAccounts.length === 0) {
      setActiveAccount(null);
    }
    
    setAccounts(updatedAccounts);
    saveAccountsToStorage(updatedAccounts);
  };

  // Função para alternar entre contas
  const switchAccount = (accountId: string): void => {
    console.log(`Iniciando troca para a conta ${accountId}...`);
    
    // Verificar se a conta existe
    const accountToActivate = accounts.find(acc => acc.id === accountId);
    if (!accountToActivate) {
      console.error(`Conta ${accountId} não encontrada`);
      return;
    }
    
    try {
      // Atualizar estado de ativo para todas as contas
      const updatedAccounts = accounts.map(acc => ({
        ...acc,
        isActive: acc.id === accountId
      }));
      
      // Atualizar o token do provedor para a nova conta ativa, se necessário
      if (session?.provider_token) {
        const newActiveAccount = updatedAccounts.find(acc => acc.id === accountId);
        if (newActiveAccount) {
          newActiveAccount.providerToken = session.provider_token;
          console.log(`Token de acesso atualizado para a conta ${accountId}`);
          
          // Armazenar associação de token -> userId no serviço YouTube
          try {
            // Importar serviço diretamente para evitar dependência circular
            const youtubeServiceModule = require('../services/youtubeService');
            if (youtubeServiceModule && youtubeServiceModule.youtubeService) {
              youtubeServiceModule.youtubeService.tokenToUserIdMap.set(
                session.provider_token,
                accountId
              );
              console.log('Token mapeado para ID de usuário no serviço YouTube');
              
              // Limpar cache específico da conta para forçar nova busca com token atualizado
              if (youtubeServiceModule.youtubeService.clearCache) {
                youtubeServiceModule.youtubeService.clearCache(accountId);
                console.log(`Cache limpo para a conta ${accountId}`);
              }
            }
          } catch (error) {
            console.error('Erro ao mapear token para usuário:', error);
          }
        }
      } else {
        console.warn('Token de provider não disponível na sessão ao trocar de conta');
      }
      
      // Atualizar o estado global
      setAccounts(updatedAccounts);
      setActiveAccount(accountToActivate);
      
      // Salvar no localStorage
      saveAccountsToStorage(updatedAccounts);
      
      // Atualizar dados da conta ativada
      try {
        console.log(`Tentando atualizar dados da conta ${accountId} após ativação...`);
        refreshAccountData(accountId)
          .then(() => {
            console.log(`Dados da conta ${accountId} atualizados com sucesso após ativação`);
          })
          .catch((err) => {
            console.error(`Erro ao atualizar dados da conta ${accountId} após ativação:`, err);
          });
      } catch (refreshError) {
        console.error(`Erro ao iniciar atualização de dados para conta ${accountId}:`, refreshError);
      }
      
      console.log(`Conta ativa alterada para: ${accountId}`);
    } catch (error) {
      console.error(`Erro ao trocar para a conta ${accountId}:`, error);
    }
  };

  // Função para atualizar dados específicos de uma conta
  const refreshAccountData = async (accountId: string): Promise<void> => {
    // Implementação para atualizar dados do canal da conta
    try {
      const accountIndex = accounts.findIndex(acc => acc.id === accountId);
      if (accountIndex === -1) return;
      
      console.log(`Atualizando dados da conta ${accountId}...`);
      
      // Obter token atualizado da sessão, se disponível
      let currentToken = accounts[accountIndex].providerToken;
      if (session?.provider_token && accounts[accountIndex].isActive) {
        currentToken = session.provider_token;
        console.log(`Usando token mais recente da sessão para conta ${accountId}`);
      } else {
        console.log(`Usando token armazenado para conta ${accountId}`);
      }
      
      if (!currentToken) {
        console.error(`Nenhum token disponível para a conta ${accountId}`);
        
        // Tentar recuperar token da sessão
        try {
          const currentSession = await supabase.auth.getSession();
          if (currentSession?.data?.session?.provider_token) {
            currentToken = currentSession.data.session.provider_token;
            console.log('Obtido novo token da sessão atual');
          }
        } catch (error) {
          console.error('Erro ao obter token da sessão:', error);
        }
        
        // Se ainda não tiver token, não podemos prosseguir
        if (!currentToken) {
          throw new Error('Nenhum token de acesso disponível');
        }
      }
      
      // Importar serviço diretamente para evitar dependência circular
      const youtubeServiceModule = require('../services/youtubeService');
      if (youtubeServiceModule && youtubeServiceModule.youtubeService) {
        try {
          // Atualizar token no serviço YouTube
          youtubeServiceModule.youtubeService.tokenToUserIdMap.set(
            currentToken,
            accountId
          );
          
          // Buscar dados do canal para atualizar informações
          const channels = await youtubeServiceModule.youtubeService.getMyChannels(
            accountId,
            currentToken
          );
          
          if (channels && channels.length > 0) {
            const primaryChannel = channels[0];
            
            // Atualizar dados do canal na conta
            const updatedAccounts = [...accounts];
            updatedAccounts[accountIndex] = { 
              ...updatedAccounts[accountIndex],
              channelId: primaryChannel.id,
              channelTitle: primaryChannel.title,
              channelThumbnail: primaryChannel.thumbnailUrl,
              providerToken: currentToken // Atualizar token
            };
            
            setAccounts(updatedAccounts);
            
            if (updatedAccounts[accountIndex].isActive) {
              setActiveAccount(updatedAccounts[accountIndex]);
              
              // Garantir que o token está atualizado no supabase para a conta ativa
              try {
                const session = await supabase.auth.getSession();
                if (session?.data?.session && !session.data.session.provider_token) {
                  console.log('Tentando recuperar token do provider...');
                  // Token do provedor não está disponível na sessão,
                  // podemos precisar fazer uma nova autenticação
                }
              } catch (sessionError) {
                console.error('Erro ao verificar sessão:', sessionError);
              }
            }
            
            // Salvar no localStorage (sem o token)
            saveAccountsToStorage(updatedAccounts);
            
            console.log(`Dados da conta ${accountId} atualizados com sucesso`);
            
            // Tentar buscar algumas playlists para verificar se o token funciona
            try {
              const playlistResult = await youtubeServiceModule.youtubeService.getMyPlaylists(
                undefined,
                accountId,
                currentToken
              );
              console.log(`Playlists verificadas: ${playlistResult.playlists.length} playlists encontradas`);
            } catch (playlistError) {
              console.error('Erro ao verificar playlists:', playlistError);
            }
          }
        } catch (error) {
          console.error(`Erro ao buscar dados atualizados para conta ${accountId}:`, error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar dados da conta:', error);
      throw error;
    }
  };

  // Função para obter dados de todas as contas
  const getAllAccountsData = (): GoogleAccount[] => {
    return accounts;
  };

  // Funções auxiliares para manipular o storage
  const saveAccountsToStorage = (accountsToSave: GoogleAccount[]): void => {
    try {
      // Criar uma versão segura para armazenamento (sem tokens)
      const accountsForStorage = accountsToSave.map(({ providerToken, ...rest }) => rest);
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accountsForStorage));
      
      // Tentar atualizar os tokens no serviço YouTube
      try {
        const youtubeServiceModule = require('../services/youtubeService');
        if (youtubeServiceModule && youtubeServiceModule.youtubeService) {
          // Atualizar mapeamento de tokens para IDs de usuário
          accountsToSave.forEach(account => {
            if (account.providerToken) {
              youtubeServiceModule.youtubeService.tokenToUserIdMap.set(
                account.providerToken,
                account.id
              );
            }
          });
        }
      } catch (error) {
        console.error('Erro ao atualizar tokens no serviço YouTube:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar contas no localStorage:', error);
    }
  };

  const loadAccountsFromStorage = (): GoogleAccount[] => {
    try {
      const savedAccounts = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!savedAccounts) return [];
      
      // Restaurar contas e adicionar um token vazio para satisfazer a tipagem
      const parsedAccounts = JSON.parse(savedAccounts);
      return parsedAccounts.map((acc: any) => ({
        ...acc,
        providerToken: '' // Token vazio que será atualizado depois
      }));
    } catch (error) {
      console.error('Erro ao carregar contas do localStorage:', error);
      return [];
    }
  };

  // Valores do contexto
  const contextValue = {
    accounts,
    activeAccount,
    isLoading,
    addAccount,
    removeAccount,
    switchAccount,
    refreshAccountData,
    getAllAccountsData
  };

  return (
    <MultiAccountContext.Provider value={contextValue}>
      {children}
    </MultiAccountContext.Provider>
  );
};

// Hook para acessar o contexto
export const useMultiAccount = () => useContext(MultiAccountContext); 