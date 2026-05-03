import { GameSession, Difficulty } from '../types';
import PlayerCard from './PlayerCard';

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const TIME_OPTIONS = [
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
  { label: '20 min', value: 1200 },
  { label: '30 min', value: 1800 },
];

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: 'text-discord-green',
  Medium: 'text-discord-yellow',
  Hard: 'text-discord-red',
};

interface LobbyProps {
  game: GameSession;
  currentUserId: string;
  onReady: () => void;
  onSettingsChange: (settings: { difficulty?: Difficulty; timeLimitSeconds?: number }) => void;
}

export default function Lobby({ game, currentUserId, onReady, onSettingsChange }: LobbyProps) {
  const isHost = game.hostId === currentUserId;
  const currentPlayer = game.players.find(p => p.discordId === currentUserId);
  const readyCount = game.players.filter(p => p.isReady).length;
  const canStart = readyCount >= 2;

  return (
    <div className="flex flex-col h-screen bg-discord-tertiary p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">LeetCode Race</h1>

      {/* game settings - only host can change */}
      <div className="bg-discord-secondary rounded-lg p-4 mb-4">
        <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Settings</h2>

        {/* difficulty */}
        <div className="mb-3">
          <label className="text-xs text-gray-400 block mb-1">Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => isHost && onSettingsChange({ difficulty: d })}
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

        {/* time limit */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Time Limit</label>
          <div className="flex gap-2 flex-wrap">
            {TIME_OPTIONS.map(t => (
              <button
                key={t.value}
                onClick={() => isHost && onSettingsChange({ timeLimitSeconds: t.value })}
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

      {/* player list */}
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

      {/* bottom actions */}
      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={onReady}
          className={`w-full py-3 rounded-lg font-semibold text-lg transition-colors ${
            currentPlayer?.isReady
              ? 'bg-discord-green/20 text-discord-green border border-discord-green/30'
              : 'bg-discord-secondary text-gray-300 hover:bg-discord-bg'
          }`}
        >
          {currentPlayer?.isReady ? 'Ready!' : 'Ready Up'}
        </button>

        {isHost && (
          <button
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
