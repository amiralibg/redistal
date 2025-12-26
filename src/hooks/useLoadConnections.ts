import { useEffect } from 'react';
import { useRedisStore } from '../store/useRedisStore';
import { redisApi } from '../lib/tauri-api';

export function useLoadConnections() {
  const setSavedConnections = useRedisStore((state) => state.setSavedConnections);

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const connections = await redisApi.loadConnections();
        setSavedConnections(connections);
      } catch (error) {
        console.error('Failed to load saved connections:', error);
        // Don't show error toast on startup - just log it
      }
    };

    loadConnections();
  }, [setSavedConnections]);
}
