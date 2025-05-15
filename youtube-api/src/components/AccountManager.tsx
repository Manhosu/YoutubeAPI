import { useState } from 'react';
import { useMultiAccount, type GoogleAccount } from '../contexts/MultiAccountContext';
import { youtubeService } from '../services/youtubeService';
import AccountSwitcher from './AccountSwitcher';

interface AccountManagerProps {
  className?: string;
}

const AccountManager = ({ className = '' }: AccountManagerProps) => {
  const { accounts, activeAccount, addAccount, removeAccount, isLoading } = useMultiAccount();
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manipular adição de nova conta
  const handleAddAccount = async () => {
    try {
      setError(null);
      await addAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar conta');
    }
  };

  // Manipular remoção de conta
  const handleRemoveAccount = (accountId: string) => {
    try {
      setError(null);
      removeAccount(accountId);
      // Limpar cache específico da conta
      youtubeService.clearCache(accountId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover conta');
    }
  };

  // Manipular quando um usuário troca de conta via AccountSwitcher
  const handleAccountSwitched = () => {
    setIsMenuOpen(false); // Fechar o menu após a troca
    
    // Opcionalmente, recarregar dados se necessário
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Botão principal com avatar da conta ativa */}
      <div
        className="flex items-center cursor-pointer group AccountManager-dropdown-trigger"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {activeAccount ? (
          <div className="flex items-center">
            <img
              src={activeAccount.avatarUrl || 'https://via.placeholder.com/40'}
              alt={activeAccount.displayName}
              className={`w-8 h-8 rounded-full border-2 ${isMenuOpen ? 'border-red-600' : 'border-gray-700 group-hover:border-red-600'} transition-colors`}
            />
            <span className="ml-2 text-sm text-gray-300 hidden md:block group-hover:text-white transition-colors">
              {activeAccount.displayName.split(' ')[0]}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 inline-block ml-1 text-gray-400">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown menu */}
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-gray-800 border border-gray-700 rounded-md shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-medium text-white">Gerenciar Contas</h3>
            <p className="text-xs text-gray-400 mt-1">
              Adicione e gerencie até 3 contas do Google
            </p>
          </div>

          {/* Lista de contas usando o novo componente AccountSwitcher */}
          <div className="max-h-64 overflow-y-auto p-2">
            <AccountSwitcher onAccountSwitch={handleAccountSwitched} />
          </div>

          {/* Seção de gerenciamento com botões de ação */}
          <div className="p-3 border-t border-gray-700">
            {/* Botão de remover conta */}
            {activeAccount && (
              <button
                onClick={() => activeAccount && handleRemoveAccount(activeAccount.id)}
                disabled={isLoading || accounts.length <= 1}
                className={`
                  w-full flex items-center justify-center py-2 px-3 
                  ${accounts.length <= 1 ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' : 'bg-red-700/30 hover:bg-red-700/50 text-red-300'}
                  rounded-md text-sm transition-colors mb-2
                `}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Remover Conta Atual
              </button>
            )}

            {/* Botão de adicionar conta */}
            {accounts.length < 3 && (
              <button
                onClick={handleAddAccount}
                disabled={isLoading}
                className="w-full flex items-center justify-center py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm transition-colors"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                )}
                Adicionar Conta do Google
              </button>
            )}
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="p-3 text-xs text-red-400 border-t border-gray-700 bg-red-900/20">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountManager; 