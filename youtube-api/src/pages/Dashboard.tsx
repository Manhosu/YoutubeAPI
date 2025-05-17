import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { youtubeService, type YoutubeChannel, type YoutubePlaylist, type PlaylistVideoItem } from '../services/youtubeService';
import { useAuth } from '../contexts/AuthContext';
import { useMultiAccount } from '../contexts/MultiAccountContext';
import VideoPlaylistImpact from '../components/VideoPlaylistImpact';
import { videoTrackingService } from '../services/videoTrackingService';
import { exportService } from '../services/exportService';

// Interface para os resultados de pesquisa em todas as playlists
interface PlaylistWithFoundVideos {
  playlist: YoutubePlaylist;
  foundVideos: PlaylistVideoItem[];
}

// Interface para o modal de exportação
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'json', startDate: string, endDate: string) => void;
}

// Tipo para os tipos de pesquisa
type SearchType = 'title' | 'id' | 'url';

// Componente Modal de Exportação
const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Definir datas padrão: últimos 30 dias
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full overflow-hidden"
      >
        <div className="border-b border-gray-800 px-5 py-4">
          <h3 className="text-xl font-semibold text-white">Exportar Relatório</h3>
        </div>
        
        <div className="p-5">
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Formato</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  className="form-radio text-red-600"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                />
                <span className="ml-2 text-white">CSV</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  className="form-radio text-red-600"
                  name="format"
                  value="json"
                  checked={format === 'json'}
                  onChange={() => setFormat('json')}
                />
                <span className="ml-2 text-white">JSON</span>
              </label>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Período</label>
            <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <label className="text-sm text-gray-400 block mb-1">Data inicial</label>
                <input
                  type="date"
                  className="bg-gray-800 text-white px-3 py-2 rounded w-full"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-400 block mb-1">Data final</label>
                <input
                  type="date"
                  className="bg-gray-800 text-white px-3 py-2 rounded w-full"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              O relatório incluirá as estatísticas de visualização das playlists no período selecionado.
            </p>
          </div>
          
          <div className="flex justify-end space-x-4 mt-6">
            <button
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center"
              onClick={() => onExport(format, startDate, endDate)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Exportar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { activeAccount } = useMultiAccount();
  const [channels, setChannels] = useState<YoutubeChannel[]>([]);
  const [playlists, setPlaylists] = useState<YoutubePlaylist[]>([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState<YoutubePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'playlist' | 'video'>('playlist');
  const [searchType, setSearchType] = useState<SearchType>('title');
  const [videoSearchResults, setVideoSearchResults] = useState<PlaylistWithFoundVideos[]>([]);
  const [searching, setSearching] = useState(false);
  const [playlistStats, setPlaylistStats] = useState<Record<string, number>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotScheduled, setSnapshotScheduled] = useState(false);
  const [lastSnapshotTime, setLastSnapshotTime] = useState<string | null>(null);
  const [sortType, setSortType] = useState<string>('views'); // Ordenação padrão por visualizações
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [refreshingPlaylists, setRefreshingPlaylists] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Usar ID da conta ativa para buscar dados
        const accountId = activeAccount?.id;
        console.log('Buscando dados para conta:', accountId || 'padrão');
        
        // Buscar canais do usuário
        const channelsData = await youtubeService.getMyChannels(accountId);
        setChannels(channelsData);
        
        // Buscar playlists do usuário
        const playlistsData = await youtubeService.getMyPlaylists(undefined, accountId);
        
        // Certificar que cada playlist tem visualizações inicializadas
        const playlistsWithViews = playlistsData.playlists.map(playlist => ({
          ...playlist,
          totalViews: playlist.totalViews || 0
        }));
        
        setPlaylists(playlistsWithViews);
        setFilteredPlaylists(playlistsWithViews);
        setNextPageToken(playlistsData.nextPageToken);
        
        // Carregar estatísticas para as playlists carregadas
        await loadPlaylistStats(playlistsWithViews);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setError('Ocorreu um erro ao carregar seus dados do YouTube. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, activeAccount]);

  // Filtrar playlists com base no termo de pesquisa
  useEffect(() => {
    if (searchMode === 'playlist') {
      if (searchTerm.trim() === '') {
        setFilteredPlaylists(playlists);
      } else {
        const term = searchTerm.toLowerCase();
        const filtered = playlists.filter(playlist => 
          playlist.title.toLowerCase().includes(term) || 
          (playlist.description && playlist.description.toLowerCase().includes(term))
        );
        setFilteredPlaylists(filtered);
      }
      // Limpar resultados de pesquisa de vídeos quando mudar para pesquisa de playlist
      setVideoSearchResults([]);
    }
  }, [searchTerm, playlists, searchMode]);

  const loadMorePlaylists = async () => {
    if (!nextPageToken) return;
    
    try {
      setLoading(true);
      const accountId = activeAccount?.id;
      const playlistsData = await youtubeService.getMyPlaylists(nextPageToken, accountId);
      
      // Certificar que cada nova playlist tem visualizações inicializadas
      const newPlaylistsWithViews = playlistsData.playlists.map(playlist => ({
        ...playlist,
        totalViews: playlist.totalViews || 0
      }));
      
      const updatedPlaylists = [...playlists, ...newPlaylistsWithViews];
      setPlaylists(updatedPlaylists);
      
      // Atualizar playlists filtradas também
      if (searchTerm.trim() === '' || searchMode === 'video') {
        setFilteredPlaylists(updatedPlaylists);
      } else {
        const term = searchTerm.toLowerCase();
        const filtered = updatedPlaylists.filter(playlist => 
          playlist.title.toLowerCase().includes(term) || 
          (playlist.description && playlist.description.toLowerCase().includes(term))
        );
        setFilteredPlaylists(filtered);
      }
      
      // Atualizar o nextPageToken para a próxima página
      setNextPageToken(playlistsData.nextPageToken);
      
      console.log(`Carregadas ${playlistsData.playlists.length} playlists adicionais. Total: ${updatedPlaylists.length}`);
    } catch (err) {
      console.error('Erro ao carregar mais playlists:', err);
      setError('Ocorreu um erro ao carregar mais playlists.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    
    // Limpar resultados de pesquisa de vídeos quando o termo for vazio
    if (e.target.value.trim() === '') {
      setVideoSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setVideoSearchResults([]);
    setSearchMode('playlist');
  };

  const searchVideos = async () => {
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    setError(null);
    
    try {
      const accountId = activeAccount?.id;
      let results: PlaylistWithFoundVideos[] = [];
      
      // Realizar a pesquisa com base no tipo selecionado
      if (searchType === 'title') {
        results = await youtubeService.searchVideoAcrossPlaylists(searchTerm, accountId);
      } else if (searchType === 'id') {
        // Buscar vídeo por ID
        const video = await youtubeService.getVideoById(searchTerm, accountId);
        if (video && video.playlists) {
          // Construir resultados no mesmo formato
          results = await Promise.all(video.playlists.map(async (playlist) => {
            const playlistItems = await youtubeService.getPlaylistItems(playlist.id, undefined, false, accountId);
            const foundVideo = playlistItems.find(item => item.videoId === searchTerm);
            return {
              playlist,
              foundVideos: foundVideo ? [foundVideo] : []
            };
          }));
          results = results.filter(result => result.foundVideos.length > 0);
        }
      } else if (searchType === 'url') {
        // Extrair ID do vídeo da URL e buscar
        const videoByUrl = await youtubeService.getVideoByUrl(searchTerm, accountId);
        if (videoByUrl && videoByUrl.playlists) {
          results = await Promise.all(videoByUrl.playlists.map(async (playlist) => {
            const playlistItems = await youtubeService.getPlaylistItems(playlist.id, undefined, false, accountId);
            const foundVideo = playlistItems.find(item => item.videoId === videoByUrl.id);
            return {
              playlist,
              foundVideos: foundVideo ? [foundVideo] : []
            };
          }));
          results = results.filter(result => result.foundVideos.length > 0);
        }
      }
      
      setVideoSearchResults(results);
      
      if (results.length === 0) {
        setError(`Nenhum vídeo encontrado com o termo "${searchTerm}" em suas playlists.`);
      }
    } catch (err) {
      console.error('Erro ao pesquisar vídeos:', err);
      setError('Ocorreu um erro ao pesquisar vídeos nas playlists.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchMode === 'video') {
      searchVideos();
    }
  };

  // Formatar número com separadores de milhar
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  // Função auxiliar para determinar a cor da barra de progresso com base no impacto
  const getImpactColor = (percentage: number): string => {
    if (percentage >= 75) return '#22c55e'; // Verde para alto impacto
    if (percentage >= 50) return '#3b82f6'; // Azul para impacto médio-alto
    if (percentage >= 25) return '#f59e0b'; // Amarelo para impacto médio
    return '#ef4444'; // Vermelho para baixo impacto
  };

  // Adicionar nova função para carregar estatísticas de visualização
  const loadPlaylistStats = async (playlistsToLoad: YoutubePlaylist[]) => {
    if (playlistsToLoad.length === 0) return;
    
    try {
      setLoadingStats(true);
      const accountId = activeAccount?.id;
      
      // Obter IDs de todas as playlists
      const playlistIds = playlistsToLoad.map(playlist => playlist.id);
      
      // Buscar estatísticas para todas as playlists de uma vez
      const stats = await youtubeService.getPlaylistViewStats(playlistIds, accountId);
      
      // Criar um objeto de mapeamento de ID para contagem de visualizações
      const statsMap: Record<string, number> = {};
      stats.forEach(stat => {
        statsMap[stat.playlistId] = stat.totalViews;
      });
      
      setPlaylistStats(statsMap);
      
      // Atualizar as playlists com as visualizações
      const playlistsWithStats = playlistsToLoad.map(playlist => ({
        ...playlist,
        totalViews: statsMap[playlist.id] || playlist.totalViews || 0
      }));
      
      // Ordenar as playlists por visualizações inicialmente
      const sortedPlaylists = [...playlistsWithStats].sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0));
      
      // Atualizar as playlists
      setPlaylists(playlistsWithStats);
      setFilteredPlaylists(sortedPlaylists);
    } catch (error) {
      console.error('Erro ao carregar estatísticas das playlists:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Função para agendar snapshot automático diário
  const scheduleAutomaticSnapshot = () => {
    if (snapshotScheduled) return;
    
    // Verificar se já existe um agendamento salvo
    const lastSchedule = localStorage.getItem('last_snapshot_schedule');
    const now = new Date();
    
    if (lastSchedule) {
      const lastDate = new Date(lastSchedule);
      // Se já foi agendado hoje, não faz nada
      if (
        lastDate.getDate() === now.getDate() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getFullYear() === now.getFullYear()
      ) {
        console.log('Snapshot já agendado para hoje');
        setSnapshotScheduled(true);
        return;
      }
    }
    
    // Agendar snapshot para o próximo dia às 3am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    
    const timeUntilNextSnapshot = tomorrow.getTime() - now.getTime();
    
    console.log(`Agendando snapshot para ${tomorrow.toLocaleString()}, em ${timeUntilNextSnapshot / 1000 / 60 / 60} horas`);
    
    // Agendar snapshot
    setTimeout(async () => {
      console.log('Executando snapshot automático');
      try {
        await videoTrackingService.takeSnapshotsForAllVideos(activeAccount?.id);
        localStorage.setItem('last_snapshot_schedule', new Date().toISOString());
        // Reagendar para o próximo dia
        scheduleAutomaticSnapshot();
      } catch (error) {
        console.error('Erro ao executar snapshot automático:', error);
      }
    }, timeUntilNextSnapshot);
    
    // Salvar data de agendamento
    localStorage.setItem('last_snapshot_schedule', now.toISOString());
    setSnapshotScheduled(true);
  };

  // Agendar snapshot automático quando o componente for montado
  useEffect(() => {
    scheduleAutomaticSnapshot();
  }, []);

  // Função para executar snapshot manual de todos os vídeos
  const takeSnapshotForAllVideos = async () => {
    if (snapshotsLoading) return;
    
    setSnapshotsLoading(true);
    try {
      await videoTrackingService.takeSnapshotsForAllAccounts();
      
      // Atualizar timestamp do último snapshot
      const now = new Date().toLocaleString();
      setLastSnapshotTime(now);
      
      // Salvar timestamp no localStorage
      localStorage.setItem('last_snapshot_time', now);
      
      // Mostrar notificação de sucesso
      alert('Snapshots capturados com sucesso para todos os canais!');
    } catch (error) {
      console.error('Erro ao executar snapshots:', error);
      setError('Ocorreu um erro ao capturar dados de snapshot.');
    } finally {
      setSnapshotsLoading(false);
    }
  };
  
  // Verificar se há snapshot agendado e último timestamp
  useEffect(() => {
    // Recuperar último timestamp do snapshot
    const storedTime = localStorage.getItem('last_snapshot_time');
    if (storedTime) {
      setLastSnapshotTime(storedTime);
    }
    
    // Verificar quando será o próximo snapshot
    const checkNextSnapshot = () => {
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(3, 0, 0, 0); // 3:00 AM
      
      if (now.getHours() >= 3) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      setSnapshotScheduled(true);
    };
    
    checkNextSnapshot();
  }, []);

  // Função para exportar dados com datas
  const handleExport = async (format: 'csv' | 'json', startDate: string, endDate: string) => {
    try {
      setExporting(true);
      
      // Obter IDs de todas as contas ou apenas a conta ativa
      const accountIds = activeAccount ? [activeAccount.id] : [];
      
      // Definir o período para o relatório
      const dateRange = {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      };
      
      // Gerar relatório através do serviço
      const result = await youtubeService.exportConsolidatedReport(
        accountIds,
        format,
        true, // Indicar que é um relatório de crescimento
        dateRange
      );
      
      // Processar o resultado com base no formato
      if (format === 'csv') {
        // Para CSV, criar um blob e fazer o download
        const blob = new Blob([result as string], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `playlist-report-${startDate}-to-${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Para JSON, formatar e fazer download
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `playlist-report-${startDate}-to-${endDate}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Mostrar toast de sucesso
      setToast({
        message: `Relatório exportado com sucesso (${format.toUpperCase()})`,
        type: 'success'
      });
      
      // Limpar toast após 4 segundos
      setTimeout(() => setToast(null), 4000);
      
      // Fechar modal após exportação bem-sucedida
      setExportModalOpen(false);
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      setError('Ocorreu um erro ao exportar o relatório. Tente novamente.');
      
      // Mostrar toast de erro
      setToast({
        message: 'Erro ao exportar relatório. Tente novamente.',
        type: 'error'
      });
      
      // Limpar toast após 4 segundos
      setTimeout(() => setToast(null), 4000);
    } finally {
      setExporting(false);
    }
  };

  // Função para atualizar playlists e ordená-las por visualizações e atividade recente
  const refreshPlaylists = async () => {
    if (refreshingPlaylists) return;
    
    setRefreshingPlaylists(true);
    setError(null);
    
    try {
      // Limpar cache de playlists para forçar atualização dos dados
      youtubeService.clearCache(activeAccount?.id);
      
      // Buscar playlists atualizadas
      const accountId = activeAccount?.id;
      const { playlists: updatedPlaylists } = await youtubeService.getMyPlaylists(undefined, accountId);
      
      // Buscar estatísticas atualizadas para as playlists
      await loadPlaylistStats(updatedPlaylists);
      
      // Mostrar notificação de sucesso
      setToast({
        message: 'Playlists atualizadas com sucesso!',
        type: 'success'
      });
      
      // Limpar toast após 4 segundos
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      console.error('Erro ao atualizar playlists:', error);
      setError('Ocorreu um erro ao atualizar as playlists. Tente novamente.');
      
      // Mostrar toast de erro
      setToast({
        message: 'Erro ao atualizar playlists. Tente novamente.',
        type: 'error'
      });
      
      // Limpar toast após 4 segundos
      setTimeout(() => setToast(null), 4000);
    } finally {
      setRefreshingPlaylists(false);
    }
  };

  return (
    <Layout>
      <div className="page-transition">
        {/* Toast notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-md shadow-lg transition-all transform animate-fade-in ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            <div className="flex items-center">
              {toast.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              )}
              <p className="text-white font-medium">{toast.message}</p>
            </div>
          </div>
        )}
        
        <h1 className="text-3xl font-bold mb-8 gradient-text">Meu Dashboard</h1>
        
        {loading && playlists.length === 0 && channels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Carregando seus dados do YouTube...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-white p-4 rounded-md mb-8">
            <p>{error}</p>
          </div>
        )}
        
        {!loading && channels.length === 0 && (
          <div className="card p-6 mb-8">
            <p className="text-gray-400">Nenhum canal encontrado. Verifique se você está logado corretamente na sua conta do YouTube.</p>
          </div>
        )}
        
        {/* Seção de Gerenciamento de Snapshots */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            Snapshots para Análise de Impacto
          </h2>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <p className="text-gray-300">
                Os snapshots capturam diariamente o número de visualizações e as playlists de cada vídeo para análise de impacto.
              </p>
              
              {lastSnapshotTime && (
                <p className="text-sm text-gray-400 mt-1">
                  Último snapshot: {lastSnapshotTime}
                </p>
              )}
              
              {snapshotScheduled && (
                <p className="text-sm text-gray-400 mt-1">
                  Próximo snapshot automático: 3:00 AM
                </p>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-2">
              <button
                onClick={takeSnapshotForAllVideos}
                disabled={snapshotsLoading}
                className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {snapshotsLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                    </svg>
                    Snapshot Agora
                  </>
                )}
              </button>
              
              <Link
                to="/video-analytics"
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
                Análise por Vídeo
              </Link>
            </div>
          </div>
          
          <div className="bg-gray-700/50 p-3 rounded text-sm text-gray-300">
            <p className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              Os snapshots são capturados automaticamente às 3:00 da manhã para todos os canais e vídeos.
            </p>
          </div>
        </div>
        
        {/* Seção de Canais */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Seus Canais</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map(channel => (
              <div key={channel.id} className="bg-gray-800 rounded-lg p-4 flex items-center gap-4">
                {channel.thumbnailUrl && (
                  <img 
                    src={channel.thumbnailUrl} 
                    alt={channel.title} 
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <h3 className="text-white font-medium">{channel.title}</h3>
                  <p className="text-gray-400 text-sm">
                    {channel.subscriberCount ? `${channel.subscriberCount} inscritos` : 'Inscritos ocultos'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Seção de Pesquisa */}
        <section className="mb-8">
          <div className="card p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <h2 className="text-2xl font-semibold subtle-gradient-text mb-4 md:mb-0">Busca Avançada</h2>
              
              <div className="flex items-center gap-2">
                <button
                  className={`mr-4 px-3 py-1 rounded-md text-sm transition-colors ${searchMode === 'playlist' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}
                  onClick={() => setSearchMode('playlist')}
                >
                  Playlists
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${searchMode === 'video' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}
                  onClick={() => setSearchMode('video')}
                >
                  Vídeos
                </button>
                
                {searchMode === 'video' && (
                  <button
                    onClick={takeSnapshotForAllVideos}
                    disabled={snapshotsLoading}
                    className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {snapshotsLoading ? 'Processando...' : 'Snapshot Geral'}
                  </button>
                )}
              </div>
            </div>
            
            {searchMode === 'video' && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-3 mb-3">
                  <label className={`px-4 py-2 rounded-md cursor-pointer transition-colors ${searchType === 'title' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}>
                    <input
                      type="radio"
                      value="title"
                      checked={searchType === 'title'}
                      onChange={() => setSearchType('title')}
                      className="sr-only"
                    />
                    Título do vídeo
                  </label>
                  
                  <label className={`px-4 py-2 rounded-md cursor-pointer transition-colors ${searchType === 'id' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}>
                    <input
                      type="radio"
                      value="id"
                      checked={searchType === 'id'}
                      onChange={() => setSearchType('id')}
                      className="sr-only"
                    />
                    ID do vídeo
                  </label>
                  
                  <label className={`px-4 py-2 rounded-md cursor-pointer transition-colors ${searchType === 'url' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}>
                    <input
                      type="radio"
                      value="url"
                      checked={searchType === 'url'}
                      onChange={() => setSearchType('url')}
                      className="sr-only"
                    />
                    URL do vídeo
                  </label>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder={
                    searchMode === 'playlist' 
                      ? "Pesquisar playlists..." 
                      : searchType === 'title'
                        ? "Pesquisar vídeos por título..."
                        : searchType === 'id'
                          ? "Digite o ID do vídeo (ex: dQw4w9WgXcQ)"
                          : "Digite a URL do vídeo (ex: https://youtu.be/dQw4w9WgXcQ)"
                  }
                  className="w-full bg-[#1f1f1f] text-white px-4 py-3 rounded-md pr-24 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex">
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="text-gray-400 hover:text-white px-2 py-1 mr-1"
                    >
                      Limpar
                    </button>
                  )}
                  
                  {searchMode === 'video' && (
                    <button 
                      type="submit" 
                      className="bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                      disabled={searching || !searchTerm.trim()}
                    >
                      {searching ? 'Buscando...' : 'Buscar'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </section>
        
        {/* Resultados de pesquisa de vídeos */}
        {searchMode === 'video' && videoSearchResults.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 subtle-gradient-text">Resultados da Pesquisa</h2>
            
            <div className="space-y-6">
              {/* Condensed video info at the top - shows once */}
              {videoSearchResults[0]?.foundVideos[0] && (
                <div className="card p-6 mb-6">
                  <div className="flex items-start">
                    <div className="w-32 h-24 overflow-hidden rounded-md flex-shrink-0 mr-4">
                      <img 
                        src={videoSearchResults[0].foundVideos[0].thumbnailUrl || '/placeholder-video.jpg'}
                        alt={videoSearchResults[0].foundVideos[0].title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-medium text-white mb-2">{videoSearchResults[0].foundVideos[0].title}</h3>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-400 text-sm mb-4">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          <span>ID: {videoSearchResults[0].foundVideos[0].videoId}</span>
                        </div>
                        
                        {videoSearchResults[0].foundVideos[0].viewCount !== undefined && (
                          <div className="flex items-center text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-red-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-medium">{formatNumber(videoSearchResults[0].foundVideos[0].viewCount)} visualizações totais</span>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-blue-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                          </svg>
                          <span>Presente em {videoSearchResults.length} playlists</span>
                        </div>
                      </div>
                      
                      <a
                        href={`https://youtube.com/watch?v=${videoSearchResults[0].foundVideos[0].videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-500 hover:text-red-400 transition-colors flex items-center w-fit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                        Assistir no YouTube
                      </a>
                    </div>
                  </div>
                  
                  {/* Adicionar componente de impacto de playlists */}
                  <div className="mt-6">
                    <VideoPlaylistImpact
                      videoId={videoSearchResults[0].foundVideos[0].videoId}
                    />
                  </div>
                </div>
              )}
              
              {/* IMPACTO POR PLAYLIST - Versão atualizada */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-lg font-medium text-white">Impacto por Playlist</h3>
                </div>
                
                <div>
                  {videoSearchResults.map(result => {
                    const video = result.foundVideos[0]; // Get the first video from each playlist's results
                    
                    // Usar estatísticas carregadas ou valor padrão
                    const playlistId = result.playlist.id;
                    const playlistViews = playlistStats[playlistId] || 0;
                    
                    return (
                      <div key={result.playlist.id} className="border-b border-gray-800 hover:bg-[#1a1a1a]">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            <div className="w-14 h-14 overflow-hidden rounded-md flex-shrink-0 mr-3">
                              <img 
                                src={result.playlist.thumbnailUrl || '/placeholder-playlist.jpg'}
                                alt={result.playlist.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center">
                                <h4 className="font-medium text-white mr-3 truncate">{result.playlist.title}</h4>
                              </div>
                            </div>
                            
                            {/* Show view count prominently */}
                            <div className="flex items-center ml-3">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1.5 text-red-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {loadingStats ? (
                                <div className="w-8 h-5 bg-gray-700 animate-pulse rounded"></div>
                              ) : (
                                <span className="text-xl font-medium text-white">{formatNumber(playlistViews)}</span>
                              )}
                            </div>
                          </div>
                          
                          <Link
                            to={`/playlist/${result.playlist.id}`}
                            className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors flex items-center ml-6"
                          >
                            <span>Ver playlist</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* Seção de Playlists */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-2xl font-semibold subtle-gradient-text mb-4 md:mb-0">Minhas Playlists</h2>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  className="bg-[#1f1f1f] text-white px-4 py-2 rounded-md cursor-pointer appearance-none pr-10 focus:outline-none focus:ring-1 focus:ring-red-500"
                  value={sortType}
                  onChange={(e) => {
                    const newSortType = e.target.value;
                    setSortType(newSortType);
                    
                    let sorted = [...filteredPlaylists];
                    
                    if (newSortType === 'views') {
                      // Ordenar por visualizações (maior para menor)
                      sorted = sorted.sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0));
                    } else if (newSortType === 'activity') {
                      // Ordenar por movimento/atividade (estimativa baseada em views e data de atualização)
                      const now = Date.now();
                      sorted = sorted.sort((a, b) => {
                        // Calcular um score baseado em visualizações e quando foi atualizado por último
                        const aLastUpdated = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
                        const bLastUpdated = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
                        
                        // Favorecer playlists atualizadas recentemente
                        const aRecency = aLastUpdated ? Math.min(14, Math.floor((now - aLastUpdated) / (24 * 60 * 60 * 1000))) : 14;
                        const bRecency = bLastUpdated ? Math.min(14, Math.floor((now - bLastUpdated) / (24 * 60 * 60 * 1000))) : 14;
                        
                        // Score combinado (visualizações + recência)
                        const aScore = (a.totalViews || 0) * (1 - (aRecency / 14));
                        const bScore = (b.totalViews || 0) * (1 - (bRecency / 14));
                        
                        return bScore - aScore;
                      });
                    } else if (newSortType === 'size') {
                      // Ordenar por número de vídeos (maior para menor)
                      sorted = sorted.sort((a, b) => b.itemCount - a.itemCount);
                    } else {
                      // Ordenação alfabética (padrão)
                      sorted = sorted.sort((a, b) => a.title.localeCompare(b.title));
                    }
                    
                    setFilteredPlaylists(sorted);
                  }}
                >
                  <option value="default">Ordenar por nome</option>
                  <option value="views">Mais visualizações</option>
                  <option value="activity">Mais movimento</option>
                  <option value="size">Mais vídeos</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
              
              {loadingStats && (
                <div className="flex items-center text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Calculando estatísticas...</span>
                </div>
              )}
              
              {/* Botão de exportação */}
              <button 
                onClick={() => setExportModalOpen(true)}
                disabled={exporting || playlists.length === 0}
                className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Exportando...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>Exportar Relatório</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {!loading && filteredPlaylists.length === 0 && searchMode === 'playlist' && (
            <div className="card p-6">
              {searchTerm ? (
                <p className="text-gray-400">Nenhuma playlist encontrada para "{searchTerm}".</p>
              ) : (
                <p className="text-gray-400">Nenhuma playlist encontrada.</p>
              )}
            </div>
          )}
          
          {searchMode === 'playlist' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredPlaylists.map(playlist => (
                <div key={playlist.id} className="card overflow-hidden group">
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={playlist.thumbnailUrl || '/placeholder-playlist.jpg'} 
                      alt={playlist.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-400">{playlist.itemCount} vídeos</p>
                        {playlist.totalViews !== undefined && playlist.totalViews > 0 && (
                          <p className="text-xs bg-red-600/80 px-2 py-0.5 rounded text-white">
                            {new Intl.NumberFormat('pt-BR').format(playlist.totalViews)} views
                          </p>
                        )}
                      </div>
                      <h3 className="text-white font-medium truncate">{playlist.title}</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">{playlist.description || 'Sem descrição'}</p>
                    
                    {/* Mostrar info de atividade recente se disponível */}
                    {playlist.lastUpdated && (
                      <div className="flex items-center mb-3 text-xs text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Atualizado em {new Date(playlist.lastUpdated).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    
                    <Link
                      to={`/playlist/${playlist.id}`}
                      className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors flex items-center"
                    >
                      <span>Ver detalhes</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {nextPageToken && searchMode === 'playlist' && (
            <div className="flex justify-center mt-6 mb-12">
              <button
                onClick={loadMorePlaylists}
                disabled={loading}
                className="bg-[#2a2a2a] hover:bg-[#333] text-white py-3 px-6 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Carregando...</span>
                  </>
                ) : (
                  <>
                    <span>Carregar mais playlists</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </section>
        
        {/* Modal de exportação */}
        <ExportModal 
          isOpen={exportModalOpen} 
          onClose={() => setExportModalOpen(false)} 
          onExport={handleExport} 
        />

        {/* Estatísticas e ações rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card p-4 flex flex-col">
            <h3 className="text-white font-medium mb-2">Atualizar playlists</h3>
            <p className="text-gray-400 text-sm mb-4">
              Reordena as playlists mantendo as mais populares e ativas no topo.
            </p>
            <button
              onClick={refreshPlaylists}
              disabled={refreshingPlaylists}
              className="w-full h-12 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed z-10"
            >
              {refreshingPlaylists ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium">Atualizando...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  <span className="font-medium">Atualizar playlists</span>
                </>
              )}
            </button>
          </div>
          
          <div className="card p-4 flex flex-col">
            <h3 className="text-white font-medium mb-2">Snapshots de dados</h3>
            <p className="text-gray-400 text-sm mb-4">
              Capture dados atuais de todos os vídeos para análise futura.
            </p>
            <button
              onClick={takeSnapshotForAllVideos}
              disabled={snapshotsLoading}
              className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed z-10"
            >
              {snapshotsLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium">Processando...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                  <span className="font-medium">Capturar Snapshot</span>
                </>
              )}
            </button>
          </div>
          
          <div className="card p-4 flex flex-col">
            <h3 className="text-white font-medium mb-2">Exportar relatório</h3>
            <p className="text-gray-400 text-sm mb-4">
              Exporte seus dados para análise em outras ferramentas.
            </p>
            <button
              onClick={() => setExportModalOpen(true)}
              disabled={exporting || playlists.length === 0}
              className="w-full h-12 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed z-10"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium">Exportando...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span className="font-medium">Exportar Dados</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard; 