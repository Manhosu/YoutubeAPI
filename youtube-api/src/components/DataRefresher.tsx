import { useEffect } from 'react';
import { youtubeService } from '../services/youtubeService';

// Componente para gerenciar a atualização periódica dos dados
const DataRefresher: React.FC = () => {
  // Atualizar dados a cada 3 horas (reduzido para mais frequência)
  const REFRESH_INTERVAL = 3 * 60 * 60 * 1000; // 3 horas em milissegundos
  // Intervalo menor para dispositivos móveis
  const MOBILE_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutos para mobile
  
  // Verificar se é um dispositivo móvel
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };
  
  useEffect(() => {
    const mobile = isMobile();
    const interval = mobile ? MOBILE_REFRESH_INTERVAL : REFRESH_INTERVAL;
    
    console.log(`DataRefresher iniciado: ${mobile ? 'Mobile' : 'Desktop'}, intervalo: ${interval/60000} minutos`);
    
    // Função para verificar e realizar a atualização se necessário
    const checkAndRefresh = async () => {
      const lastUpdateStr = localStorage.getItem('lastDataUpdate');
      const now = new Date();
      
      let lastUpdate: Date | null = null;
      if (lastUpdateStr) {
        lastUpdate = new Date(lastUpdateStr);
      }
      
      const timeSinceLastUpdate = lastUpdate ? now.getTime() - lastUpdate.getTime() : Infinity;
      const shouldForceUpdate = mobile && navigator.onLine; // Forçar atualização em mobile quando online
      
      if (!lastUpdate || (timeSinceLastUpdate > interval) || shouldForceUpdate) {
        try {
          console.log('Iniciando atualização de playlists...');
          // Limpar cache se estiver em mobile para garantir dados frescos
          if (mobile) {
            youtubeService.clearCache();
          }
          
          await youtubeService.schedulePlaylistUpdates();
          const newUpdateTime = new Date();
          localStorage.setItem('lastDataUpdate', newUpdateTime.toISOString());
          console.log(`Dados atualizados com sucesso às ${newUpdateTime.toLocaleTimeString()}`);
        } catch (error) {
          console.error('Erro na atualização automática:', error);
        }
      } else {
        const nextUpdate = new Date(lastUpdate.getTime() + interval);
        const minutesUntilNext = Math.round((nextUpdate.getTime() - now.getTime()) / 60000);
        console.log(`Próxima atualização em aproximadamente ${minutesUntilNext} minutos`);
      }
    };
    
    // Executar imediatamente ao carregar a página
    checkAndRefresh();
    
    // Configurar um intervalo para verificar periodicamente
    const intervalId = setInterval(() => {
      checkAndRefresh();
    }, Math.min(30 * 60 * 1000, interval / 4)); // Verificar a cada 30 minutos ou 1/4 do intervalo, o que for menor
    
    // Adicionar um listener para quando o usuário volta a ficar online
    window.addEventListener('online', checkAndRefresh);
    
    // Adicionar um listener para quando o app volta a ficar visível
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh();
      }
    });
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', checkAndRefresh);
      document.removeEventListener('visibilitychange', checkAndRefresh);
    };
  }, []); // <- Array vazio, roda só uma vez
  
  // Componente não renderiza nada visualmente
  return null;
};

export default DataRefresher; 