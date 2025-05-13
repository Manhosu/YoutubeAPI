import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  
  // Animação na entrada da página
  useEffect(() => {
    setIsVisible(true);
    
    // Configura a animação para os cards de recursos
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
        }
      });
    }, { threshold: 0.1 });
    
    if (featuresRef.current) {
      const featureCards = featuresRef.current.querySelectorAll('.feature-card');
      featureCards.forEach(card => {
        observer.observe(card);
      });
    }
    
    return () => {
      if (featuresRef.current) {
        const featureCards = featuresRef.current.querySelectorAll('.feature-card');
        featureCards.forEach(card => {
          observer.unobserve(card);
        });
      }
    };
  }, []);
  
  // Uso mais seguro do AuthContext
  let user = null;
  
  try {
    const auth = useAuth();
    user = auth.user;
  } catch (error) {
    console.error("Erro ao acessar AuthContext:", error);
  }

  return (
    <Layout>
      <div 
        className={`max-w-5xl mx-auto text-center pt-8 md:pt-16 transition-opacity duration-1000 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="mb-16 relative">
          {/* Círculos decorativos */}
          <div className="absolute -top-20 -left-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl opacity-70 animate-pulse"></div>
          <div className="absolute -bottom-40 -right-10 w-80 h-80 bg-red-600/10 rounded-full blur-3xl opacity-70 animate-pulse"></div>
          
          <div className="relative">
            <svg 
              className="w-24 h-24 mx-auto text-red-600 mb-8 floating" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
          
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
              <span className="gradient-text">Análise de Playlists</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-4 max-w-2xl mx-auto thin-text">
              Analise suas playlists e descubra onde seus vídeos aparecem.
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto caption">
              Obtenha estatísticas valiosas sobre vídeos, playlists e desempenho do seu canal.
            </p>
          </div>
        </div>
        
        <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="feature-card card p-6 opacity-0" style={{ transitionDelay: '100ms' }}>
            <div className="text-red-600 text-4xl mb-4">
              <div className="w-16 h-16 mx-auto bg-red-600/10 rounded-full flex items-center justify-center group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 group-hover:scale-110 transition-transform duration-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2 text-white subtle-gradient-text">Análise Detalhada</h2>
            <p className="text-gray-400">
              Acompanhe o desempenho dos seus vídeos e playlists ao longo do tempo
            </p>
          </div>
          
          <div className="feature-card card p-6 opacity-0" style={{ transitionDelay: '200ms' }}>
            <div className="text-red-600 text-4xl mb-4">
              <div className="w-16 h-16 mx-auto bg-red-600/10 rounded-full flex items-center justify-center group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 group-hover:scale-110 transition-transform duration-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2 text-white subtle-gradient-text">Pesquisa Avançada</h2>
            <p className="text-gray-400">
              Descubra rapidamente em quais playlists seus vídeos estão incluídos
            </p>
          </div>
          
          <div className="feature-card card p-6 opacity-0" style={{ transitionDelay: '300ms' }}>
            <div className="text-red-600 text-4xl mb-4">
              <div className="w-16 h-16 mx-auto bg-red-600/10 rounded-full flex items-center justify-center group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 group-hover:scale-110 transition-transform duration-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2 text-white subtle-gradient-text">Exportar Dados</h2>
            <p className="text-gray-400">
              Baixe seus dados para análise mais profunda em outros programas
            </p>
          </div>
        </div>
        
        <div className="relative py-10">
          {/* Linha decorativa */}
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent"></div>
          
          <div className="glass-effect py-10 px-8 rounded-xl">
            <h3 className="text-2xl font-bold mb-6 text-white uppercase-title">Comece a analisar seus dados agora</h3>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="btn-primary text-center text-lg py-3 px-10 group"
                  >
                    <span className="flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 group-hover:animate-pulse">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                      </svg>
                      Acessar Painel
                    </span>
                  </Link>
                  <Link
                    to="/search"
                    className="btn-secondary text-center text-lg py-3 px-10 group"
                  >
                    <span className="flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 group-hover:animate-pulse">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                      Pesquisar Vídeos
                    </span>
                  </Link>
                </>
              ) : (
                <Link
                  to="/login"
                  className="btn-primary text-center text-lg py-3 px-10 flex items-center justify-center mx-auto group relative overflow-hidden"
                >
                  <span className="flex items-center justify-center relative z-10">
                    <svg className="w-5 h-5 mr-3 group-hover:animate-pulse" viewBox="0 0 24 24">
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
                    Entrar com Google
                  </span>
                </Link>
              )}
            </div>
          </div>
          
          {/* Linha decorativa */}
          <div className="absolute left-0 right-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent"></div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;