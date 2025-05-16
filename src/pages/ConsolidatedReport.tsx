import React, { useState, useEffect } from 'react';
import { useMultiAccount } from '../contexts/MultiAccountContext';
import { youtubeService } from '../services/youtubeService';
import { Layout } from '../components/Layout';
import { DateRangePicker } from '../components/DateRangePicker';

interface ReportData {
  reportDate: string;
  summary: {
    totalAccounts: number;
    totalChannels: number;
    totalPlaylists: number;
    totalVideos: number;
    totalViews: number;
  };
  channels: {
    id: string;
    title: string;
    customUrl: string;
  }[];
  playlists: {
    id: string;
    title: string;
    channelId: string;
    channelTitle: string;
    itemCount: number;
    totalViews: number;
    analytics?: {
      likes: number;
      averageViewDuration: string;
      averageViewPercentage: number;
    };
  }[];
  reportType?: 'growth';
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  growth?: {
    custom: {
      views: number;
      likes: number;
      percentageViews: number;
      percentageLikes: number;
    };
  };
  topPerformers?: {
    channels: {
      id: string;
      title: string;
      views: number;
      likes: number;
      growthPercentage: number;
      customUrl: string;
    }[];
    videos: {
      id: string;
      title: string;
      views: number;
      likes: number;
    }[];
  };
  trends?: {
    monthly: {
      month: string;
      views: number;
      watchTimeMinutes: number;
      likes: number;
      subscribers: number;
    }[];
  };
}

const ConsolidatedReport = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const { accounts } = useMultiAccount();

  const generateReport = async () => {
    try {
      setLoading(true);
      const accountIds = accounts.map(acc => acc.id);
      const data = await youtubeService.generateConsolidatedReport(
        accountIds,
        true,
        dateRange || undefined
      );
      setReportData(data);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accounts.length > 0) {
      generateReport();
    }
  }, [accounts, dateRange]);

  if (!reportData) {
    return (
      <Layout>
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">Relatório Consolidado</h1>
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <p>Nenhum dado disponível. Selecione uma conta para começar.</p>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Relatório Consolidado</h1>
          <DateRangePicker
            onChange={(range) => {
              if (range.startDate && range.endDate) {
                setDateRange({
                  startDate: range.startDate.toISOString(),
                  endDate: range.endDate.toISOString()
                });
              }
            }}
          />
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Contas</h3>
            <p className="text-2xl">{reportData.summary.totalAccounts}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Canais</h3>
            <p className="text-2xl">{reportData.summary.totalChannels}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Playlists</h3>
            <p className="text-2xl">{reportData.summary.totalPlaylists}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Vídeos</h3>
            <p className="text-2xl">{reportData.summary.totalVideos}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Visualizações</h3>
            <p className="text-2xl">{reportData.summary.totalViews.toLocaleString()}</p>
          </div>
        </div>

        {/* Dados de Crescimento */}
        {reportData.growth && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Crescimento no Período</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Visualizações</h3>
                <p className="text-2xl">{reportData.growth.custom.views.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Likes</h3>
                <p className="text-2xl">{reportData.growth.custom.likes.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Performers */}
        {reportData.topPerformers && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Top Canais */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Top Canais</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2">Canal</th>
                      <th className="text-right py-2">Views</th>
                      <th className="text-right py-2">Likes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topPerformers.channels.map(channel => (
                      <tr key={channel.id}>
                        <td className="py-2">{channel.title}</td>
                        <td className="text-right">{channel.views.toLocaleString()}</td>
                        <td className="text-right">{channel.likes.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Vídeos */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Top Vídeos</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2">Vídeo</th>
                      <th className="text-right py-2">Views</th>
                      <th className="text-right py-2">Likes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topPerformers.videos.map(video => (
                      <tr key={video.id}>
                        <td className="py-2">{video.title}</td>
                        <td className="text-right">{video.views.toLocaleString()}</td>
                        <td className="text-right">{video.likes.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tendências Mensais */}
        {reportData.trends && (
          <div className="bg-white p-4 rounded-lg shadow mb-8">
            <h2 className="text-xl font-bold mb-4">Tendências Mensais</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2">Período</th>
                    <th className="text-right py-2">Views</th>
                    <th className="text-right py-2">Tempo Assistido</th>
                    <th className="text-right py-2">Likes</th>
                    <th className="text-right py-2">Inscritos</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.trends.monthly.map((month, index) => (
                    <tr key={index}>
                      <td className="py-2">{month.month}</td>
                      <td className="text-right">{month.views.toLocaleString()}</td>
                      <td className="text-right">{Math.round(month.watchTimeMinutes / 60)} horas</td>
                      <td className="text-right">{month.likes.toLocaleString()}</td>
                      <td className="text-right">{month.subscribers.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lista de Playlists */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Playlists</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left py-2">Título</th>
                  <th className="text-left py-2">Canal</th>
                  <th className="text-right py-2">Vídeos</th>
                  <th className="text-right py-2">Views</th>
                  <th className="text-right py-2">Likes</th>
                  <th className="text-right py-2">Duração Média</th>
                  <th className="text-right py-2">% Média Assistida</th>
                </tr>
              </thead>
              <tbody>
                {reportData.playlists.map(playlist => (
                  <tr key={playlist.id}>
                    <td className="py-2">{playlist.title}</td>
                    <td className="py-2">{playlist.channelTitle}</td>
                    <td className="text-right">{playlist.itemCount}</td>
                    <td className="text-right">{playlist.totalViews.toLocaleString()}</td>
                    <td className="text-right">
                      {playlist.analytics?.likes.toLocaleString() || '-'}
                    </td>
                    <td className="text-right">
                      {playlist.analytics?.averageViewDuration || '-'}
                    </td>
                    <td className="text-right">
                      {playlist.analytics?.averageViewPercentage
                        ? `${playlist.analytics.averageViewPercentage.toFixed(1)}%`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ConsolidatedReport; 