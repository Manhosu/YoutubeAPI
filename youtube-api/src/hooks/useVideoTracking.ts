import { useState, useEffect, useCallback } from 'react';
import { videoTrackingService } from '../services/videoTrackingService';
import { useMultiAccount } from '../contexts/MultiAccountContext';

export interface PlaylistImpactData {
  playlistId: string;
  playlistTitle: string;
  viewsContribution: number;
  contributionPercentage: number;
  daysInPlaylist: number;
}

export interface UseVideoTrackingResult {
  impactData: PlaylistImpactData[];
  snapshotCount: number;
  isLoading: boolean;
  takeSnapshot: () => Promise<void>;
  hasEnoughSnapshots: boolean;
}

export function useVideoTracking(videoId: string): UseVideoTrackingResult {
  const [impactData, setImpactData] = useState<PlaylistImpactData[]>([]);
  const [snapshotCount, setSnapshotCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { activeAccount } = useMultiAccount();

  const loadImpactData = useCallback(() => {
    // Obter dados existentes
    const videoSnapshots = videoTrackingService.getVideoSnapshots(videoId);
    setSnapshotCount(videoSnapshots.length);
    
    // Calcular impacto se houver snapshots suficientes
    if (videoSnapshots.length >= 2) {
      const impact = videoTrackingService.calculatePlaylistImpact(videoId);
      setImpactData(impact);
    } else {
      setImpactData([]);
    }
  }, [videoId]);

  useEffect(() => {
    if (videoId) {
      loadImpactData();
    }
  }, [videoId, loadImpactData]);

  const takeSnapshot = useCallback(async () => {
    setIsLoading(true);
    try {
      await videoTrackingService.takeSnapshotForVideo(videoId, activeAccount?.id);
      loadImpactData();
    } catch (error) {
      console.error('Error taking snapshot:', error);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, activeAccount, loadImpactData]);

  return {
    impactData,
    snapshotCount,
    isLoading,
    takeSnapshot,
    hasEnoughSnapshots: snapshotCount >= 2
  };
}

export default useVideoTracking; 