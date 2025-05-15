import { useState } from 'react';
import { useMultiAccount, type GoogleAccount } from '../contexts/MultiAccountContext';
import { youtubeService } from '../services/youtubeService';

interface AccountSwitcherProps {
  showAvatar?: boolean;
  showActiveIndicator?: boolean;
  onAccountSwitch?: () => void;
}

const AccountSwitcher = ({ 
  showAvatar = true, 
  showActiveIndicator = true,
  onAccountSwitch
}: AccountSwitcherProps) => {
  const { accounts, activeAccount, switchAccount, isLoading } = useMultiAccount();
  const [isSwitching, setIsSwitching] = useState(false);

  // Manipulador para trocar de conta
  const handleAccountSwitch = async (accountId: string) => {
    if (activeAccount?.id === accountId) return;
    
    setIsSwitching(true);
    
    try {
      console.log(`Trocando para a conta ${accountId}...`);
      
      // Trocar a conta no contexto
      switchAccount(accountId);
      
      // Limpar caches específicos se necessário
      try {
        // Forçar uma nova busca de dados
        await youtubeService.getMyChannels(accountId);
      } catch (error) {
        console.error('Erro ao buscar dados do canal:', error);
      }
      
      // Notificar o componente pai se necessário
      if (onAccountSwitch) {
        onAccountSwitch();
      }
    } catch (error) {
      console.error('Erro ao trocar de conta:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="animate-spin h-4 w-4 border-2 border-red-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="account-switcher">
      <ul className="flex flex-col space-y-2">
        {accounts.map((account) => (
          <li 
            key={account.id} 
            className={`
              flex items-center p-2 rounded-lg cursor-pointer 
              transition-all duration-200 
              ${account.isActive ? 'bg-red-500/10 border border-red-500/30' : 'hover:bg-gray-800'}
            `}
            onClick={() => handleAccountSwitch(account.id)}
          >
            {showAvatar && (
              <div className="relative">
                {account.avatarUrl ? (
                  <img 
                    src={account.avatarUrl} 
                    alt={account.displayName} 
                    className="w-8 h-8 rounded-full mr-3 border border-gray-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full mr-3 bg-gray-700 flex items-center justify-center">
                    <span className="text-white text-sm">
                      {account.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                {showActiveIndicator && account.isActive && (
                  <div className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full"></div>
                )}
              </div>
            )}
            
            <div className="flex flex-col overflow-hidden">
              <span className="text-white text-sm font-medium truncate">
                {account.displayName}
              </span>
              <span className="text-gray-400 text-xs truncate">
                {account.email}
              </span>
            </div>
            
            {isSwitching && activeAccount?.id !== account.id && (
              <div className="ml-auto">
                <div className="animate-spin h-4 w-4 border-2 border-red-500 rounded-full border-t-transparent"></div>
              </div>
            )}
            
            {account.isActive && (
              <div className="ml-auto text-xs font-medium px-2 py-1 rounded bg-red-500/20 text-red-400">
                Ativa
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AccountSwitcher; 