import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  let user = null;
  let signOut = () => {};
  
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f9fafb', color: '#1f2937' }}>
      <header className="bg-gray-800 text-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">YouTube Playlist Analyzer</Link>
          
          <nav className="flex items-center space-x-6">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={`hover:text-blue-300 ${isActive('/dashboard') ? 'text-blue-300' : ''}`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/search" 
                  className={`hover:text-blue-300 ${isActive('/search') ? 'text-blue-300' : ''}`}
                >
                  Search
                </Link>
                <button 
                  onClick={signOut}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className={`hover:text-blue-300 ${isActive('/login') ? 'text-blue-300' : ''}`}
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8" style={{ backgroundColor: '#f9fafb' }}>
        {children}
      </main>
      
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4 text-center">
          <p>YouTube Playlist Analyzer &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 