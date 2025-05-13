import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro capturado por ErrorBoundary:', error);
    console.error('Informações do erro:', errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          borderRadius: '8px',
          backgroundColor: '#fee2e2',
          color: '#b91c1c'
        }}>
          <h1>Algo deu errado.</h1>
          <p>
            {this.state.error?.message || 'Ocorreu um erro na aplicação.'}
          </p>
          <button 
            style={{
              backgroundColor: '#b91c1c',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '12px'
            }}
            onClick={() => window.location.reload()}
          >
            Recarregar a página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 