import { useState } from 'react';
import { GameSession, Difficulty } from '../types';
import PlayerCard from './PlayerCard';

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

// time options in seconds, displayed as minutes in the ui
const TIME_OPTIONS = [
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
  { label: '20 min', value: 1200 },
  { label: '30 min', value: 1800 },
];

// color coding to match leetcode's difficulty colors (ish)
const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: 'text-discord-green',
  Medium: 'text-discord-yellow',
  Hard: 'text-discord-red',
};

interface LobbyProps {
  game: GameSession;
  currentUserId: string;
  onReady: () => Promise<void>;
  onSettingsChange: (settings: { difficulty?: Difficulty; timeLimitSeconds?: number }) => Promise<void>;
  onStart: () => Promise<void>;
  onSetLeetcodeUsername: (username: string) => Promise<void>;
}

export default function Lobby({ game, currentUserId, onReady, onSettingsChange, onStart, onSetLeetcodeUsername }: LobbyProps) {
  const isHost = game.hostId === currentUserId;
  const currentPlayer = game.players.find(p => p.discordId === currentUserId);
  const readyCount = game.players.filter(p => p.isReady).length;
  const [lcInput, setLcInput] = useState(currentPlayer?.leetcodeUsername || '');
  const [savingLc, setSavingLc] = useState(false);
  const [lcError, setLcError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // need at least 2 ppl ready to start a race
  const canStart = readyCount >= 2;
  const hasLeetcodeUsername = !!currentPlayer?.leetcodeUsername;

  async function handleReady() {
    setActionError(null);
    try {
      await onReady();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to toggle ready');
    }
  }

  async function handleStart() {
    setActionError(null);
    try {
      await onStart();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to start game');
    }
  }

  async function handleSettingsChange(settings: { difficulty?: Difficulty; timeLimitSeconds?: number }) {
    setActionError(null);
    try {
      await onSettingsChange(settings);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update settings');
    }
  }

  async function handleSaveLeetcode() {
    if (!lcInput.trim()) return;
    setSavingLc(true);
    setLcError(null);
    try {
      await onSetLeetcodeUsername(lcInput.trim());
    } catch (e) {
      setLcError(e instanceof Error ? e.message : 'Invalid username');
    } finally {
      setSavingLc(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-discord-tertiary p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">LeetRace</h1>

      {/* leetcode username prompt. needs to be set before you can play */}
      {!hasLeetcodeUsername && (
        <div className="bg-discord-secondary rounded-lg p-4 mb-4 border border-discord-yellow/30">
          <label className="text-sm text-discord-yellow block mb-2">
            Enter your LeetCode username to play
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={lcInput}
              onChange={(e) => setLcInput(e.target.value)}
              placeholder="LeetCode username"
              className="flex-1 px-3 py-2 rounded bg-discord-tertiary text-white placeholder-gray-500 border border-gray-600 focus:border-discord-blurple focus:outline-none text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLeetcode()}
            />
            <button
              onClick={handleSaveLeetcode}
              disabled={savingLc || !lcInput.trim()}
              className="px-4 py-2 rounded bg-discord-blurple text-white text-sm font-medium hover:bg-discord-blurple/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingLc ? 'Saving...' : 'Save'}
            </button>
          </div>
          {lcError && (
            <p className="text-discord-red text-xs mt-2">{lcError}</p>
          )}
        </div>
      )}

      {/* settings panel, only host can actually change these,
          everyone else just sees the current values */}
      <div className="bg-discord-secondary rounded-lg p-4 mb-4">
        <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Settings</h2>

        {/* difficulty selector */}
        <div className="mb-3">
          <label className="text-xs text-gray-400 block mb-1">Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => isHost && handleSettingsChange({ difficulty: d })}
                className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                  game.difficulty === d
                    ? `bg-discord-tertiary ${DIFFICULTY_COLORS[d]}`
                    : 'bg-transparent text-gray-500'
                } ${isHost ? 'cursor-pointer hover:bg-discord-tertiary' : 'cursor-default'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* time limit selector */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Time Limit</label>
          <div className="flex gap-2 flex-wrap">
            {TIME_OPTIONS.map(t => (
              <button
                key={t.value}
                onClick={() => isHost && handleSettingsChange({ timeLimitSeconds: t.value })}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  game.timeLimitSeconds === t.value
                    ? 'bg-discord-tertiary text-white'
                    : 'bg-transparent text-gray-500'
                } ${isHost ? 'cursor-pointer hover:bg-discord-tertiary' : 'cursor-default'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* player list, shows everyone in the lobby w/ ready status */}
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-2">
          Players ({game.players.length})
        </h2>
        <div className="flex flex-col gap-2">
          {game.players.map(player => (
            <PlayerCard
              key={player.discordId}
              player={player}
              isHost={player.discordId === game.hostId}
            />
          ))}
        </div>
      </div>

      {/* action buttons at the bottom */}
      <div className="mt-4 flex flex-col gap-2">
        {actionError && (
          <p className="text-discord-red text-sm">{actionError}</p>
        )}

        {/* ready toggle, everyone gets this */}
        <button
          onClick={handleReady}
          className={`w-full py-3 rounded-lg font-semibold text-lg transition-colors ${
            currentPlayer?.isReady
              ? 'bg-discord-green/20 text-discord-green border border-discord-green/30'
              : 'bg-discord-secondary text-gray-300 hover:bg-discord-bg'
          }`}
        >
          {currentPlayer?.isReady ? 'Ready!' : 'Ready Up'}
        </button>

        {/* start button, only the host sees this */}
        {isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full py-3 rounded-lg font-semibold text-lg transition-colors ${
              canStart
                ? 'bg-discord-blurple text-white hover:bg-discord-blurple/80'
                : 'bg-discord-secondary text-gray-500 cursor-not-allowed'
            }`}
          >
            Start Race {!canStart && `(need ${2 - readyCount} more)`}
          </button>
        )}
      </div>
    </div>
  );
}
