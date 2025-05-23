import { useEffect } from 'react';
import { youtubeService } from '../services/youtubeService';

// Componente para gerenciar a atualização periódica dos dados
const DataRefresher: React.FC = () => {
  // Atualizar dados a cada 24 horas
  const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
  
  useEffect(() => {
    // Função para verificar e realizar a atualização se necessário
    const checkAndRefresh = async () => {
      const lastUpdateStr = localStorage.getItem('lastDataUpdate');
      const now = new Date();

      let lastUpdate: Date | null = null;
      if (lastUpdateStr) {
        lastUpdate = new Date(lastUpdateStr);
      }

      if (!lastUpdate || (now.getTime() - lastUpdate.getTime() > REFRESH_INTERVAL)) {
        try {
          await youtubeService.schedulePlaylistUpdates();
          const newUpdateTime = new Date();
          localStorage.setItem('lastDataUpdate', newUpdateTime.toISOString());
        } catch (error) {
          console.error('Erro na atualização automática:', error);
        }
      } else {
        const nextUpdate = new Date(lastUpdate.getTime() + REFRESH_INTERVAL);
        console.log('Próxima atualização automática:', nextUpdate.toLocaleString());
      }
    };
    
    checkAndRefresh();
    
    // Configurar um intervalo para verificar periodicamente
    const intervalId = setInterval(() => {
      checkAndRefresh();
    }, 60 * 60 * 1000); // Verificar a cada 1 hora
    
    return () => clearInterval(intervalId);
  }, []); // <- Array vazio, roda só uma vez
  
  // Componente não renderiza nada visualmente
  return null;
};

export default DataRefresher; 