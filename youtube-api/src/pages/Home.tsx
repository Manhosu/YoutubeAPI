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
      </div>
    </Layout>
  );
};

export default Home;