import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useMultiAccount } from '../contexts/MultiAccountContext';
import { youtubeService } from '../services/youtubeService';
import DateRangePicker from '../components/DateRangePicker';

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
  }[];
}

// Interface para dados de crescimento
interface GrowthReportData extends ReportData {
  reportType: 'growth';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  growth: {
    lastMonth: {
      views: number;
      subscribers: number;
      percentageViews: number;
      percentageSubscribers: number;
    };
    lastQuarter: {
      views: number;
      subscribers: number;
      percentageViews: number;
      percentageSubscribers: number;
    };
    custom?: {
      views: number;
      subscribers: number;
      percentageViews: number;
      percentageSubscribers: number;
    };
  };
  topPerformers: {
    channels: {
      id: string;
      title: string;
      views: number;
      subscribers: number;
      growthPercentage: number;
    }[];
    videos: {
      id: string;
      title: string;
      views: number;
      growthPercentage: number;
    }[];
    playlists: {
      id: string;
      title: string;
      views: number;
      growthPercentage: number;
    }[];
  };
  trends: {
    monthly: {
      month: string;
      views: number;
      subscribers: number;
    }[];
  };
}

// Tipo para o tipo de relatório
type ReportType = 'standard' | 'growth';

const ConsolidatedReport = () => {
  const { accounts } = useMultiAccount();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | GrowthReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');
  const [exportLoading, setExportLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('standard');
  
  // Estado para controlar o intervalo de datas para o relatório de crescimento
  const [dateRange, setDateRange] = useState<{startDate: Date, endDate: Date}>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    endDate: new Date() // Hoje
  });
  
  // Carregar dados do relatório
  useEffect(() => {
    const fetchReportData = async () => {
      if (accounts.length < 1) {
        setError('É necessário pelo menos uma conta para gerar o relatório.');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Obter IDs de todas as contas
        const accountIds = accounts.map(account => account.id);
        
        // Gerar relatório consolidado com base no tipo selecionado
        let data;
        if (reportType === 'standard') {
          data = await youtubeService.generateConsolidatedReport(accountIds);
        } else {
          // Para relatório de crescimento, passamos as datas selecionadas
          data = await youtubeService.generateConsolidatedReport(
            accountIds, 
            true,
            {
              startDate: dateRange.startDate.toISOString(),
              endDate: dateRange.endDate.toISOString()
            }
          );
        }
        setReportData(data);
      } catch (err) {
        console.error('Erro ao gerar relatório consolidado:', err);
        setError('Não foi possível gerar o relatório. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReportData();
  }, [accounts, reportType, dateRange]);
  
  // Exportar relatório
  const handleExport = async () => {
    if (!reportData) return;
    
    try {
      setExportLoading(true);
      
      // Obter IDs de todas as contas
      const accountIds = accounts.map(account => account.id);
      
      // Exportar no formato selecionado com o tipo de relatório
      const exportedData = await youtubeService.exportConsolidatedReport(
        accountIds, 
        exportFormat,
        reportType === 'growth',
        reportType === 'growth' ? {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        } : undefined
      );
      
      // Download do arquivo
      const reportTypeSuffix = reportType === 'growth' ? '-crescimento' : '';
      const fileName = `relatorio-youtube${reportTypeSuffix}-${new Date().toISOString().split('T')[0]}`;
      const fileExtension = exportFormat === 'csv' ? 'csv' : 'json';
      
      const blob = new Blob(
        [typeof exportedData === 'string' ? exportedData : JSON.stringify(exportedData, null, 2)], 
        { type: exportFormat === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' }
      );
      
      // Criar link de download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      
      // Limpar recursos
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Erro ao exportar relatório:', err);
      setError('Erro ao exportar relatório. Tente novamente.');
    } finally {
      setExportLoading(false);
    }
  };
  
  // Formatar número com separadores de milhar
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };
  
  // Formatar percentual de crescimento
  const formatGrowth = (percentage: number): string => {
    const formattedValue = Math.abs(percentage).toFixed(1);
    return percentage >= 0 
      ? `+${formattedValue}%` 
      : `-${formattedValue}%`;
  };
  
  // Classes para percentuais positivos ou negativos
  const growthClass = (percentage: number): string => {
    return percentage >= 0 
      ? 'text-green-500' 
      : 'text-red-500';
  };
  
  // Renderizar dados de crescimento
  const renderGrowthReport = () => {
    if (!reportData || reportType !== 'growth' || !('topPerformers' in reportData)) {
      return null;
    }
    
    const growthData = reportData as GrowthReportData;
    
    return (
      <>
        {/* Bloco de Crescimento */}
        <section className="mb-8">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 subtle-gradient-text">Crescimento no Período</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-800/30 p-5 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-3">Visualizações</h3>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-white mr-2">
                    {formatNumber(growthData.growth.custom?.views || growthData.growth.lastMonth.views)}
                  </span>
                  <span className={`text-lg font-medium ${growthClass(growthData.growth.custom?.percentageViews || growthData.growth.lastMonth.percentageViews)}`}>
                    {formatGrowth(growthData.growth.custom?.percentageViews || growthData.growth.lastMonth.percentageViews)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Comparado ao período anterior
                </p>
              </div>
              
              <div className="bg-gray-800/30 p-5 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-3">Inscritos</h3>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-white mr-2">
                    {formatNumber(growthData.growth.custom?.subscribers || growthData.growth.lastMonth.subscribers)}
                  </span>
                  <span className={`text-lg font-medium ${growthClass(growthData.growth.custom?.percentageSubscribers || growthData.growth.lastMonth.percentageSubscribers)}`}>
                    {formatGrowth(growthData.growth.custom?.percentageSubscribers || growthData.growth.lastMonth.percentageSubscribers)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Comparado ao período anterior
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Canal que mais cresceu */}
        {growthData.topPerformers.channels && growthData.topPerformers.channels.length > 0 && (
          <section className="mb-8">
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4 subtle-gradient-text">Canais com Maior Crescimento</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-2 text-gray-400">Canal</th>
                      <th className="text-right p-2 text-gray-400">Visualizações</th>
                      <th className="text-right p-2 text-gray-400">Inscritos</th>
                      <th className="text-right p-2 text-gray-400">Crescimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {growthData.topPerformers.channels.map((channel, index) => (
                      <tr key={channel.id} className={`border-b border-gray-800/50 hover:bg-gray-800/20 ${index === 0 ? 'bg-green-900/20' : ''}`}>
                        <td className="p-2 text-white">
                          {channel.title}
                          {index === 0 && <span className="ml-2 text-xs bg-green-600/20 px-2 py-0.5 rounded-full text-green-400">Maior Crescimento</span>}
                        </td>
                        <td className="p-2 text-gray-300 text-right">{formatNumber(channel.views)}</td>
                        <td className="p-2 text-gray-300 text-right">{formatNumber(channel.subscribers || 0)}</td>
                        <td className={`p-2 font-medium text-right ${growthClass(channel.growthPercentage)}`}>
                          {formatGrowth(channel.growthPercentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
        
        {/* Vídeos e playlists em alta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Top Vídeos */}
          <section className="card p-6">
            <h2 className="text-xl font-semibold mb-4 subtle-gradient-text">Vídeos em Alta</h2>
            
            {growthData.topPerformers.videos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-2 text-gray-400">Vídeo</th>
                      <th className="text-right p-2 text-gray-400">Views</th>
                      <th className="text-right p-2 text-gray-400">Crescimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {growthData.topPerformers.videos.map(video => (
                      <tr key={video.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                        <td className="p-2 text-white">{video.title}</td>
                        <td className="p-2 text-gray-300 text-right">{formatNumber(video.views)}</td>
                        <td className={`p-2 font-medium text-right ${growthClass(video.growthPercentage)}`}>
                          {formatGrowth(video.growthPercentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400">Nenhum vídeo encontrado no período.</p>
            )}
          </section>
          
          {/* Top Playlists */}
          <section className="card p-6">
            <h2 className="text-xl font-semibold mb-4 subtle-gradient-text">Playlists em Alta</h2>
            
            {growthData.topPerformers.playlists.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-2 text-gray-400">Playlist</th>
                      <th className="text-right p-2 text-gray-400">Views</th>
                      <th className="text-right p-2 text-gray-400">Crescimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {growthData.topPerformers.playlists.map(playlist => (
                      <tr key={playlist.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                        <td className="p-2 text-white">{playlist.title}</td>
                        <td className="p-2 text-gray-300 text-right">{formatNumber(playlist.views)}</td>
                        <td className={`p-2 font-medium text-right ${growthClass(playlist.growthPercentage)}`}>
                          {formatGrowth(playlist.growthPercentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400">Nenhuma playlist encontrada no período.</p>
            )}
          </section>
        </div>
        
        {/* Gráfico de tendência mensal (simulado com tabela) */}
        <section className="mb-8">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 subtle-gradient-text">Tendência de Visualizações</h2>
            
            {growthData.trends.monthly.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-2 text-gray-400">Mês</th>
                      <th className="text-right p-2 text-gray-400">Visualizações</th>
                      <th className="text-right p-2 text-gray-400">Inscritos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {growthData.trends.monthly.map(month => (
                      <tr key={month.month} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                        <td className="p-2 text-white">{month.month}</td>
                        <td className="p-2 text-gray-300 text-right">{formatNumber(month.views)}</td>
                        <td className="p-2 text-gray-300 text-right">{formatNumber(month.subscribers)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400">Nenhuma tendência disponível para o período.</p>
            )}
          </div>
        </section>
      </>
    );
  };
  
  return (
    <Layout>
      <div className="page-transition">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <h1 className="text-3xl font-bold gradient-text">Relatório Consolidado</h1>
          
          <div className="flex items-center mt-4 md:mt-0">
            <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white mr-4">
              &larr; Voltar ao Dashboard
            </Link>
            
            <div className="flex rounded-md overflow-hidden mr-2">
              <button
                className={`text-sm px-3 py-1.5 ${reportType === 'standard' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} transition-colors`}
                onClick={() => setReportType('standard')}
              >
                Relatório Padrão
              </button>
              <button
                className={`text-sm px-3 py-1.5 ${reportType === 'growth' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} transition-colors`}
                onClick={() => setReportType('growth')}
              >
                Relatório de Crescimento
              </button>
            </div>
            
            <div className="flex rounded-md overflow-hidden">
              <button
                className={`text-sm px-3 py-1.5 ${exportFormat === 'csv' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} transition-colors`}
                onClick={() => setExportFormat('csv')}
              >
                CSV
              </button>
              <button
                className={`text-sm px-3 py-1.5 ${exportFormat === 'json' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} transition-colors`}
                onClick={() => setExportFormat('json')}
              >
                JSON
              </button>
            </div>
            
            <button
              onClick={handleExport}
              disabled={loading || exportLoading || !reportData}
              className="ml-2 btn-primary text-sm flex items-center"
            >
              {exportLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  Exportando...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Exportar {exportFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Sub-título e seletor de datas */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <h2 className="text-lg text-gray-300 mb-4 md:mb-0">
              {reportType === 'standard' ? 
                'Visão geral de todos os canais e playlists associados às suas contas.' : 
                'Análise de crescimento e desempenho ao longo do tempo de todos os seus canais.'
              }
            </h2>
            
            {reportType === 'growth' && (
              <div className="bg-gray-800 rounded-md p-2">
                <DateRangePicker 
                  startDate={dateRange.startDate} 
                  endDate={dateRange.endDate}
                  onChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
                />
              </div>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-gray-600 border-t-red-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Gerando relatório consolidado...</p>
          </div>
        ) : error ? (
          <div className="card p-6 border border-red-800 bg-red-900/20">
            <div className="flex items-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-500 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <h3 className="text-red-400 font-medium">Erro</h3>
            </div>
            <p className="text-gray-300">{error}</p>
            {accounts.length < 1 && (
              <div className="mt-4">
                <Link to="/dashboard" className="text-sm text-blue-400 hover:text-blue-300">
                  Voltar ao Dashboard e adicionar contas
                </Link>
              </div>
            )}
          </div>
        ) : reportData ? (
          <div>
            {/* Resumo do relatório */}
            <section className="mb-8">
              <div className="card p-6">
                <h2 className="text-xl font-semibold mb-4 subtle-gradient-text">Resumo</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="bg-gray-800/30 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Contas</div>
                    <div className="text-white text-2xl font-semibold">{reportData.summary.totalAccounts}</div>
                  </div>
                  <div className="bg-gray-800/30 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Canais</div>
                    <div className="text-white text-2xl font-semibold">{reportData.summary.totalChannels}</div>
                  </div>
                  <div className="bg-gray-800/30 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Playlists</div>
                    <div className="text-white text-2xl font-semibold">{reportData.summary.totalPlaylists}</div>
                  </div>
                  <div className="bg-gray-800/30 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Vídeos</div>
                    <div className="text-white text-2xl font-semibold">{formatNumber(reportData.summary.totalVideos)}</div>
                  </div>
                  <div className="bg-gray-800/30 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Visualizações</div>
                    <div className="text-white text-2xl font-semibold">{formatNumber(reportData.summary.totalViews)}</div>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Conteúdo específico do relatório de crescimento */}
            {reportType === 'growth' && renderGrowthReport()}
            
            {/* Se for relatório padrão, mostrar listas de canais e playlists */}
            {reportType === 'standard' && (
              <>
                {/* Canais */}
                <section className="mb-8">
                  <div className="card p-6">
                    <h2 className="text-xl font-semibold mb-4 subtle-gradient-text">Canais ({reportData.channels.length})</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left p-2 text-gray-400">Canal</th>
                            <th className="text-left p-2 text-gray-400">URL Personalizada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.channels.map(channel => (
                            <tr key={channel.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                              <td className="p-2 text-white">{channel.title}</td>
                              <td className="p-2 text-gray-400">
                                {channel.customUrl ? (
                                  <a 
                                    href={`https://youtube.com/${channel.customUrl}`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    @{channel.customUrl}
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
                
                {/* Playlists */}
                <section>
                  <div className="card p-6">
                    <h2 className="text-xl font-semibold mb-4 subtle-gradient-text">Playlists ({reportData.playlists.length})</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left p-2 text-gray-400">Título</th>
                            <th className="text-left p-2 text-gray-400">Canal</th>
                            <th className="text-right p-2 text-gray-400">Vídeos</th>
                            <th className="text-right p-2 text-gray-400">Visualizações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.playlists
                            .sort((a, b) => b.totalViews - a.totalViews)
                            .map(playlist => (
                            <tr key={playlist.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                              <td className="p-2 text-white">
                                <a
                                  href={`https://youtube.com/playlist?list=${playlist.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-red-400 transition-colors"
                                >
                                  {playlist.title}
                                </a>
                              </td>
                              <td className="p-2 text-gray-400">{playlist.channelTitle}</td>
                              <td className="p-2 text-gray-400 text-right">{playlist.itemCount}</td>
                              <td className="p-2 text-gray-300 text-right font-medium">{formatNumber(playlist.totalViews)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </>
            )}
            
            <div className="text-center text-xs text-gray-500 mt-8">
              Relatório gerado em {new Date(reportData.reportDate).toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
              {reportType === 'growth' && 'dateRange' in reportData && (
                <> para o período de {new Date(reportData.dateRange.startDate).toLocaleDateString('pt-BR')} a {new Date(reportData.dateRange.endDate).toLocaleDateString('pt-BR')}</>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-6 text-center">
            <p className="text-gray-400">Nenhum dado disponível para gerar o relatório.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ConsolidatedReport; 