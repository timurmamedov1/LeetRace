import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchApi } from '../lib/api';
import { GameSession, Difficulty } from '../types';

const POLL_INTERVAL = 1500;

interface GameActions {
  game: GameSession | null;
  loading: boolean;
  toggleReady: () => Promise<void>;
  updateSettings: (settings: { difficulty?: Difficulty; timeLimitSeconds?: number }) => Promise<void>;
  leaveGame: () => Promise<void>;
}

export function useGameState(channelId: string, guildId: string): GameActions {
  const [game, setGame] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // on mount: fetch existing game or create a new one, then start polling
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initGame() {
      try {
        // check if a game already exists in this channel
        const existing = await fetchApi<GameSession>(`/game/${channelId}`).catch(() => null);

        if (existing) {
          // join it (idempotent if already in)
          const joined = await fetchApi<GameSession>(`/game/${channelId}/join`, { method: 'POST' });
          setGame(joined);
        } else {
          // first one here, create the lobby
          const created = await fetchApi<GameSession>('/game/create', {
            method: 'POST',
            body: JSON.stringify({ channelId, guildId }),
          });
          setGame(created);
        }
      } catch (e) {
        console.error('Failed to init game:', e);
      } finally {
        setLoading(false);
      }
    }

    initGame();
  }, [channelId, guildId]);

  // poll for game state updates from other players
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(async () => {
      try {
        const state = await fetchApi<GameSession>(`/game/${channelId}`);
        setGame(state);
      } catch {
        // game might have been deleted (everyone left)
        setGame(null);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [channelId, loading]);

  const toggleReady = useCallback(async () => {
    const updated = await fetchApi<GameSession>(`/game/${channelId}/ready`, { method: 'POST' });
    setGame(updated);
  }, [channelId]);

  const updateSettings = useCallback(async (settings: { difficulty?: Difficulty; timeLimitSeconds?: number }) => {
    const updated = await fetchApi<GameSession>(`/game/${channelId}/settings`, {
      method: 'POST',
      body: JSON.stringify(settings),
    });
    setGame(updated);
  }, [channelId]);

  const leaveGame = useCallback(async () => {
    await fetchApi(`/game/${channelId}/leave`, { method: 'POST' });
    setGame(null);
  }, [channelId]);

  return { game, loading, toggleReady, updateSettings, leaveGame };
}
