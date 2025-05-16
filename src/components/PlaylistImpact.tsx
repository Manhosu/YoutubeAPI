import React, { useState, useEffect } from 'react';
import { DateRangePicker } from './DateRangePicker';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PlaylistImpactProps {
  playlistId: string;
  playlistTitle: string;
  accountId?: string;
  onViewPlaylist?: () => void;
}

interface PlaylistImpactData {
  views: number;
  likes: number;
  averageViewDuration: string;
  averageViewPercentage: number;
  startDate: string;
  endDate: string;
  dailyStats: {
    date: string;
    views: number;
    likes: number;
    averageViewDuration: string;
    averageViewPercentage: number;
  }[];
  videoStats: {
    videoId: string;
    title: string;
    views: number;
    likes: number;
    averageViewDuration: string;
    averageViewPercentage: number;
  }[];
}

export const PlaylistImpact: React.FC<PlaylistImpactProps> = ({
  playlistId,
  playlistTitle,
  accountId,
  onViewPlaylist
}) => {
  const [impactData, setImpactData] = useState<PlaylistImpactData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = subDays(end, 90); // Últimos 90 dias por padrão
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    };
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'trends'>('overview');

  const fetchImpactData = async () => {
    try {
      setLoading(true);
      const data = await youtubeService.getPlaylistAnalytics(
        playlistId,
        dateRange.startDate,
        dateRange.endDate,
        accountId
      );
      setImpactData(data);
    } catch (error) {
      console.error('Erro ao buscar dados de impacto:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImpactData();
  }, [playlistId, dateRange]);

  const handleExport = async (format: 'csv' | 'json') => {
    if (!impactData) return;

    const data = {
      playlist: {
        id: playlistId,
        title: playlistTitle
      },
      period: dateRange,
      overview: {
        views: impactData.views,
        likes: impactData.likes,
        averageViewDuration: impactData.averageViewDuration,
        averageViewPercentage: impactData.averageViewPercentage
      },
      dailyStats: impactData.dailyStats,
      videoStats: impactData.videoStats
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `playlist-impact-${playlistId}-${dateRange.startDate}-${dateRange.endDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const csvRows = [
        // Cabeçalho geral
        ['Relatório de Impacto de Playlist'],
        ['ID da Playlist', playlistId],
        ['Título', playlistTitle],
        ['Período', `${dateRange.startDate} a ${dateRange.endDate}`],
        [''],
        // Visão geral
        ['Visão Geral'],
        ['Visualizações Totais', 'Likes Totais', 'Duração Média', 'Média Assistida (%)'],
        [
          impactData.views,
          impactData.likes,
          impactData.averageViewDuration,
          impactData.averageViewPercentage
        ],
        [''],
        // Estatísticas diárias
        ['Estatísticas Diárias'],
        ['Data', 'Visualizações', 'Likes', 'Duração Média', 'Média Assistida (%)'],
        ...impactData.dailyStats.map(day => [
          day.date,
          day.views,
          day.likes,
          day.averageViewDuration,
          day.averageViewPercentage
        ]),
        [''],
        // Estatísticas por vídeo
        ['Estatísticas por Vídeo'],
        ['ID do Vídeo', 'Título', 'Visualizações', 'Likes', 'Duração Média', 'Média Assistida (%)'],
        ...impactData.videoStats.map(video => [
          video.videoId,
          video.title,
          video.views,
          video.likes,
          video.averageViewDuration,
          video.averageViewPercentage
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `playlist-impact-${playlistId}-${dateRange.startDate}-${dateRange.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const renderOverview = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-3 bg-gray-50 rounded">
        <div className="text-sm text-gray-600">Visualizações</div>
        <div className="text-xl font-semibold">{impactData?.views.toLocaleString()}</div>
      </div>
      <div className="p-3 bg-gray-50 rounded">
        <div className="text-sm text-gray-600">Likes</div>
        <div className="text-xl font-semibold">{impactData?.likes.toLocaleString()}</div>
      </div>
      <div className="p-3 bg-gray-50 rounded">
        <div className="text-sm text-gray-600">Duração Média</div>
        <div className="text-xl font-semibold">{impactData?.averageViewDuration}</div>
      </div>
      <div className="p-3 bg-gray-50 rounded">
        <div className="text-sm text-gray-600">Média Assistida</div>
        <div className="text-xl font-semibold">
          {impactData?.averageViewPercentage.toFixed(1)}%
        </div>
      </div>
    </div>
  );

  const renderVideoStats = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="text-left py-2">Vídeo</th>
            <th className="text-right py-2">Views</th>
            <th className="text-right py-2">Likes</th>
            <th className="text-right py-2">Duração Média</th>
            <th className="text-right py-2">Média Assistida</th>
          </tr>
        </thead>
        <tbody>
          {impactData?.videoStats.map(video => (
            <tr key={video.videoId}>
              <td className="py-2">{video.title}</td>
              <td className="text-right">{video.views.toLocaleString()}</td>
              <td className="text-right">{video.likes.toLocaleString()}</td>
              <td className="text-right">{video.averageViewDuration}</td>
              <td className="text-right">{video.averageViewPercentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTrends = () => {
    if (!impactData?.dailyStats) return null;

    const chartData = {
      labels: impactData.dailyStats.map(day => format(new Date(day.date), 'dd/MM')),
      datasets: [
        {
          label: 'Visualizações',
          data: impactData.dailyStats.map(day => day.views),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        },
        {
          label: 'Likes',
          data: impactData.dailyStats.map(day => day.likes),
          borderColor: 'rgb(255, 99, 132)',
          tension: 0.1
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Tendências Diárias'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    };

    return <Line data={chartData} options={options} />;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{playlistTitle}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Exportar JSON
          </button>
          {onViewPlaylist && (
            <button
              onClick={onViewPlaylist}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Ver Playlist
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <DateRangePicker
          onChange={(range) => {
            if (range.startDate && range.endDate) {
              setDateRange({
                startDate: format(range.startDate, 'yyyy-MM-dd'),
                endDate: format(range.endDate, 'yyyy-MM-dd')
              });
            }
          }}
          defaultStartDate={new Date(dateRange.startDate)}
          defaultEndDate={new Date(dateRange.endDate)}
        />
      </div>

      <div className="mb-4">
        <div className="flex gap-4 border-b">
          <button
            className={`py-2 px-4 ${activeTab === 'overview' ? 'border-b-2 border-blue-500' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Visão Geral
          </button>
          <button
            className={`py-2 px-4 ${activeTab === 'videos' ? 'border-b-2 border-blue-500' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            Vídeos
          </button>
          <button
            className={`py-2 px-4 ${activeTab === 'trends' ? 'border-b-2 border-blue-500' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            Tendências
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">Carregando...</div>
      ) : impactData ? (
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'videos' && renderVideoStats()}
          {activeTab === 'trends' && renderTrends()}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          Nenhum dado disponível para o período selecionado
        </div>
      )}
    </div>
  );
}; 