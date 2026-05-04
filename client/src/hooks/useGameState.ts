import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchApi } from '../lib/api';
import { GameSession, Difficulty } from '../types';

// how often we check the server for updates from other players
const POLL_INTERVAL = 1500;

interface GameActions {
  game: GameSession | null;
  loading: boolean;
  toggleReady: () => Promise<void>;
  updateSettings: (settings: { difficulty?: Difficulty; timeLimitSeconds?: number }) => Promise<void>;
  leaveGame: () => Promise<void>;
  startGame: () => Promise<void>;
  completeChallenge: () => Promise<{ verified: boolean; error?: string }>;
  returnToLobby: () => Promise<void>;
  setLeetcodeUsername: (username: string) => Promise<void>;
}

// manages the game lifecycle. creates or joins a game on mount,
// then polls the server every 1.5s to stay in sync with other players
export function useGameState(channelId: string, guildId: string): GameActions {
  const [game, setGame] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // runs once on mount to either join an existing game or create a new one
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initGame() {
      try {
        // see if theres already a game going in this voice channel
        const existing = await fetchApi<GameSession>(`/game/${channelId}`).catch(() => null);

        if (existing) {
          // game exists, hop in (joinGame is idempotent so no worries if we're already in)
          const joined = await fetchApi<GameSession>(`/game/${channelId}/join`, { method: 'POST' });
          setGame(joined);
        } else {
          // nobody here yet, we're creating the lobby (and become host)
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

  // poll for updates, this is how we see other players joining, readying up, etc.
  // (using polling instead of websockets to keep things simple for v1)
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(async () => {
      try {
        const state = await fetchApi<GameSession>(`/game/${channelId}`);
        setGame(state);
      } catch {
        // 404 probably means everyone left and session got cleaned up
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

  // host kicks off the round
  const startGame = useCallback(async () => {
    const updated = await fetchApi<GameSession>(`/game/${channelId}/start`, { method: 'POST' });
    setGame(updated);
  }, [channelId]);

  // player claims they solved it, server checks their leetcode profile
  const completeChallenge = useCallback(async (): Promise<{ verified: boolean; error?: string }> => {
    try {
      const updated = await fetchApi<GameSession & { verified: boolean }>(`/game/${channelId}/complete`, {
        method: 'POST',
      });
      setGame(updated);
      return { verified: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verification failed';
      return { verified: false, error: msg };
    }
  }, [channelId]);

  // host sends everyone back to the lobby after results
  const returnToLobby = useCallback(async () => {
    const updated = await fetchApi<GameSession>(`/game/${channelId}/lobby`, { method: 'POST' });
    setGame(updated);
  }, [channelId]);

  // set the player's leetcode username
  const setLeetcodeUsername = useCallback(async (username: string) => {
    const updated = await fetchApi<GameSession>(`/game/${channelId}/leetcode-username`, {
      method: 'POST',
      body: JSON.stringify({ leetcodeUsername: username }),
    });
    setGame(updated);
  }, [channelId]);

  return {
    game, loading, toggleReady, updateSettings, leaveGame,
    startGame, completeChallenge, returnToLobby, setLeetcodeUsername,
  };
}
