import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize any global polyfills that might be needed
if (typeof window !== 'undefined' && !window.process) {
  window.process = { env: {} } as any;
}

// Setup global error handling
const handleGlobalError = (event: ErrorEvent) => {
  console.error('Global error caught:', event.error);
  // Prevent the browser from showing the default error dialog
  event.preventDefault();
};

window.addEventListener('error', handleGlobalError);
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default handling
  event.preventDefault();
});

// Certifica-se que o elemento root existe
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const root = createRoot(rootElement)

// Renderiza a aplicação
try {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  console.error('Error rendering the application:', error);
  // Display a fallback UI
  root.render(
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Something went wrong</h1>
      <p>The application could not be loaded. Please try refreshing the page.</p>
      <button onClick={() => window.location.reload()}>
        Refresh
      </button>
    </div>
  );
}
