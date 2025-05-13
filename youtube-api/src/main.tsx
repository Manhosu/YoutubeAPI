import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Capturador de erros global para evitar tela branca
const ErrorFallback = () => (
  <div style={{ 
    padding: '20px', 
    backgroundColor: '#181818', 
    color: 'white',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontFamily: 'sans-serif'
  }}>
    <h1 style={{ color: '#ff0000' }}>Erro na Aplicação</h1>
    <p>Ocorreu um erro ao carregar a aplicação. Por favor, tente novamente.</p>
    <button 
      onClick={() => window.location.reload()}
      style={{
        backgroundColor: '#ff0000',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '4px',
        cursor: 'pointer',
        marginTop: '20px'
      }}
    >
      Recarregar
    </button>
  </div>
);

const renderApp = () => {
  try {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (error) {
    console.error('Erro ao renderizar a aplicação:', error);
    // Renderizar um fallback para evitar tela branca
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = '';
      ReactDOM.createRoot(rootElement).render(<ErrorFallback />);
    }
  }
};

// Tentar renderizar a aplicação
renderApp();
