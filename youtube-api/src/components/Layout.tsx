import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CacheManager from './CacheManager';
import AccountManager from './AccountManager';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  let user = null;
  let signOut = () => {};
  
  // Detecção de scroll para efeitos no header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Tente obter os valores do AuthContext, mas não falhe se houver erro
  try {
    const auth = useAuth();
    user = auth.user;
    signOut = auth.signOut;
  } catch (error) {
    console.error("Erro ao acessar AuthContext:", error);
  }
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="min-h-screen flex flex-col bg-[var(--primary-bg)] text-[var(--text-primary)]">
      <header 
        className={`${
          scrolled ? 'bg-black/90 backdrop-blur-md shadow-lg' : 'bg-[var(--secondary-bg)]'
        } transition-all duration-300 z-20 sticky top-0`}
      >
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center group">
            <div className="relative">
              <svg 
                className="w-8 h-8 text-red-600 transition-transform duration-300 group-hover:scale-110" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-red-600 transform scale-x-0 transition-transform group-hover:scale-x-100 origin-left"></span>
            </div>
            <span className="ml-2 font-semibold text-white hidden sm:block" style={{ fontFamily: 'var(--font-heading)' }}>PlaylistAnalyzer</span>
          </Link>
          
          {/* Menu para desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={`font-medium relative overflow-hidden group ${isActive('/dashboard') ? 'text-red-500' : 'text-[var(--text-secondary)] hover:text-white'}`}
                >
                  <span className="transition-colors duration-300">Painel</span>
                  <span className={`absolute -bottom-0.5 left-0 w-full h-0.5 bg-red-600 transform ${isActive('/dashboard') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'} transition-transform duration-300 origin-left`}></span>
                </Link>
                <CacheManager />
                <AccountManager />
                <Link 
                  to="/consolidated-report" 
                  className={`font-medium relative overflow-hidden group ${isActive('/consolidated-report') ? 'text-blue-400' : 'text-[var(--text-secondary)] hover:text-white'}`}
                >
                  <span className="transition-colors duration-300 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                    Relatório
                  </span>
                </Link>
                <button 
                  onClick={signOut}
                  className="btn-primary text-sm"
                >
                  Sair
                </button>
                
                {/* Avatar do usuário com tooltip */}
                {user.user_metadata?.avatar_url && (
                  <div className="relative tooltip" data-tooltip={user.user_metadata?.full_name || user.email}>
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Avatar" 
                      className="w-9 h-9 rounded-full ml-2 border-2 border-transparent hover:border-red-500 transition-all duration-300"
                    />
                  </div>
                )}
              </>
            ) : (
              <Link 
                to="/login" 
                className="btn-primary text-sm"
              >
                Entrar
              </Link>
            )}
          </nav>
          
          {/* Ícone de menu para dispositivos móveis */}
          <button 
            className="md:hidden text-white focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--card-bg)] border-t border-gray-800 absolute w-full z-50 slide-in-left">
            <nav className="container mx-auto px-4 py-2 flex flex-col space-y-3">
              {user ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className={`py-2 px-4 rounded-md ${isActive('/dashboard') ? 'bg-[#2a2a2a] text-red-500' : 'text-[var(--text-secondary)]'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Painel
                  </Link>
                  <div className="flex items-center justify-between py-2 px-4 border-b border-gray-800">
                    <AccountManager className="w-full" />
                  </div>
                  <div className="flex items-center justify-between py-2 px-4 border-b border-gray-800">
                    <CacheManager className="w-full" />
                  </div>
                  <Link 
                    to="/consolidated-report" 
                    className="py-2 px-4 flex items-center text-blue-400 hover:bg-gray-800/50 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                    Relatório Consolidado
                  </Link>
                  <div className="flex items-center justify-between py-2 px-4">
                    <div className="flex items-center">
                      {user.user_metadata?.avatar_url && (
                        <img 
                          src={user.user_metadata.avatar_url} 
                          alt="Avatar" 
                          className="w-8 h-8 rounded-full mr-2"
                        />
                      )}
                      <span className="text-sm text-gray-400 truncate max-w-[150px]">
                        {user.user_metadata?.full_name || user.email}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      className="text-sm bg-red-600 text-white px-3 py-1 rounded-md"
                    >
                      Sair
                    </button>
                  </div>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="py-2 px-4 bg-red-600 text-white rounded-md text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Entrar
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-8 relative">
        <div className="page-transition">
          {children}
        </div>
      </main>
      
      {/* Efeito decorativo na lateral esquerda */}
      <div className="fixed left-0 top-1/2 transform -translate-y-1/2 h-64 w-1 bg-gradient-to-b from-transparent via-red-600 to-transparent opacity-50 hidden lg:block"></div>
      
      {/* Efeito decorativo na lateral direita */}
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 h-64 w-1 bg-gradient-to-b from-transparent via-red-600 to-transparent opacity-50 hidden lg:block"></div>
    </div>
  );
};

export default Layout; 