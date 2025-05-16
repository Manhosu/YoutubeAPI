import React from 'react';
import Layout from '../components/Layout';
import VideoPlaylistImpactPreview from '../components/VideoPlaylistImpactPreview';
import { videoTrackingService } from '../services/videoTrackingService';

const PreviewPage: React.FC = () => {
  // Função para simular snapshots dummy
  const createDummySnapshots = () => {
    try {
      // Verificar se já temos snapshots para o vídeo de teste
      const videoId = "dQw4w9WgXcQ"; // ID de exemplo
      const existingSnapshots = videoTrackingService.getVideoSnapshots(videoId);
      
      if (existingSnapshots.length > 0) {
        alert(`Já existem ${existingSnapshots.length} snapshots para o vídeo de exemplo!`);
        return;
      }
      
      // Simular alguns snapshots manualmente
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const dayBefore = new Date();
      dayBefore.setDate(dayBefore.getDate() - 2);
      const dayBeforeStr = dayBefore.toISOString().split('T')[0];
      
      // Simular snapshots para os últimos 3 dias
      const snapshots = [
        {
          videoId,
          date: dayBeforeStr,
          title: "Vídeo de Demonstração",
          totalViews: 1000,
          playlists: [
            {
              playlistId: "PL1234567890",
              playlistTitle: "Melhores Vídeos 2023"
            },
            {
              playlistId: "PL9876543210",
              playlistTitle: "Conteúdo Recomendado"
            }
          ]
        },
        {
          videoId,
          date: yesterdayStr,
          title: "Vídeo de Demonstração",
          totalViews: 1245,
          playlists: [
            {
              playlistId: "PL1234567890",
              playlistTitle: "Melhores Vídeos 2023"
            },
            {
              playlistId: "PL9876543210",
              playlistTitle: "Conteúdo Recomendado"
            },
            {
              playlistId: "PL5432167890",
              playlistTitle: "Tutoriais Avançados"
            }
          ]
        },
        {
          videoId,
          date: todayStr,
          title: "Vídeo de Demonstração",
          totalViews: 1500,
          playlists: [
            {
              playlistId: "PL1234567890",
              playlistTitle: "Melhores Vídeos 2023"
            },
            {
              playlistId: "PL9876543210",
              playlistTitle: "Conteúdo Recomendado"
            },
            {
              playlistId: "PL5432167890",
              playlistTitle: "Tutoriais Avançados"
            },
            {
              playlistId: "PL1357924680",
              playlistTitle: "Outros Vídeos"
            }
          ]
        }
      ];
      
      // Inserir os snapshots no localStorage
      const storage = window.localStorage;
      const storageKey = 'video_tracking_snapshots';
      
      try {
        const existingData = JSON.parse(storage.getItem(storageKey) || '{}');
        existingData[videoId] = snapshots;
        
        storage.setItem(storageKey, JSON.stringify(existingData));
        alert('Snapshots de demonstração criados com sucesso! Recarregue a página para ver o resultado.');
      } catch (error) {
        console.error('Erro ao salvar snapshots:', error);
      }
    } catch (error) {
      console.error('Erro ao criar snapshots de exemplo:', error);
    }
  };

  return (
    <Layout>
      <div className="page-transition">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">Prévia do Sistema de Tracking</h1>
          <button 
            onClick={createDummySnapshots}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Criar Snapshots de Teste
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Dados Simulados</h2>
            <VideoPlaylistImpactPreview />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Dados Reais (se disponíveis)</h2>
            <div className="card p-4">
              <p className="text-gray-400">
                Para ver dados reais:
              </p>
              <ol className="list-decimal list-inside text-gray-400 mt-2 space-y-2">
                <li>Clique no botão "Criar Snapshots de Teste" acima</li>
                <li>Recarregue a página</li>
                <li>Os dados serão calculados com base nos 3 snapshots simulados</li>
              </ol>
              
              <div className="mt-6">
                <h3 className="text-white font-medium mb-2">Visualização do componente real:</h3>
                {/* Este é o componente real que usa os dados do serviço */}
                <div className="border border-dashed border-gray-700 p-4 rounded">
                  <iframe 
                    src="/video/dQw4w9WgXcQ" 
                    className="w-full h-96 border-0" 
                    title="Visualização do Componente Real"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Como o Sistema Funciona</h2>
            
            <div className="space-y-4 text-gray-300">
              <div>
                <h3 className="text-lg font-medium text-white">1. Captura de Snapshots</h3>
                <p>O sistema captura diariamente o número total de visualizações de um vídeo e em quais playlists ele está presente.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-white">2. Cálculo de Impacto</h3>
                <p>Quando um vídeo ganha visualizações entre dois snapshots, o sistema atribui esse crescimento proporcionalmente às playlists em que o vídeo estava presente naquele dia.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-white">3. Análise de Dados</h3>
                <p>Com o tempo, surge um padrão de quais playlists estão contribuindo mais para as visualizações do vídeo.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-white">4. Exportação</h3>
                <p>Os dados de impacto podem ser exportados em formatos CSV e JSON para análises mais detalhadas.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PreviewPage; 