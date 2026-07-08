import { useState, useEffect } from 'react';
import { GameSession, Player, Difficulty } from '../types';
import type { DiscordSDK } from '@discord/embedded-app-sdk';

// difficulty colors matching leetcode's scheme
const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: 'text-discord-green',
  Medium: 'text-discord-yellow',
  Hard: 'text-discord-red',
};

interface GameRoundProps {
  game: GameSession;
  currentUserId: string;
  sdk: DiscordSDK;
  onComplete: () => Promise<{ verified: boolean; error?: string }>;
}

// formats seconds into mm:ss for the countdown timer
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// returns ordinal suffix for ranks (1st, 2nd, 3rd, etc)
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function GameRound({ game, currentUserId, sdk, onComplete }: GameRoundProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentPlayer = game.players.find(p => p.discordId === currentUserId);
  // guard for currentPlayer being missing, e.g. we got removed from the session
  // mid round (left voice). `undefined?.completedAt !== null` was truthy which
  // then crashed on currentPlayer!.rank in the render below
  const hasCompleted = !!currentPlayer?.completedAt;

  // countdown timer, recalculates from the server's startedAt timestamp
  // so it stays accurate even if the client is slow or tab was backgrounded
  useEffect(() => {
    if (!game.startedAt) return;

    function tick() {
      const elapsed = Math.floor((Date.now() - game.startedAt!) / 1000);
      const remaining = Math.max(0, game.timeLimitSeconds - elapsed);
      setTimeLeft(remaining);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [game.startedAt, game.timeLimitSeconds]);

  // sort players: completed first (by rank), then in-progress
  const sortedPlayers = [...game.players].sort((a, b) => {
    if (a.completedAt && b.completedAt) return (a.rank ?? 99) - (b.rank ?? 99);
    if (a.completedAt) return -1;
    if (b.completedAt) return 1;
    return 0;
  });

  // how far through the timer we are (for the progress bar)
  const progress = game.startedAt
    ? Math.min(1, (Date.now() - game.startedAt) / (game.timeLimitSeconds * 1000))
    : 0;

  // timer text turns red when under 60 seconds
  const timerUrgent = timeLeft <= 60;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    const result = await onComplete();

    if (!result.verified) {
      setError(result.error || 'Verification failed');
    }
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col h-screen bg-discord-tertiary p-6 max-w-lg mx-auto">
      {/* timer at the top */}
      <div className="text-center mb-6">
        <p className={`text-5xl font-bold font-mono mb-2 ${
          timerUrgent ? 'text-discord-red' : 'text-white'
        }`}>
          {formatTime(timeLeft)}
        </p>

        {/* thin progress bar showing time elapsed */}
        <div className="w-full h-1 bg-discord-secondary rounded-full mb-4">
          <div
            className="h-full bg-discord-blurple rounded-full transition-all duration-1000"
            style={{ width: `${(1 - progress) * 100}%` }}
          />
        </div>
      </div>

      {/* problem card */}
      {game.problem && (
        <div className="bg-discord-secondary rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">
              #{game.problem.frontendQuestionId}
            </span>
            <span className={`text-xs font-semibold ${DIFFICULTY_COLORS[game.problem.difficulty]}`}>
              {game.problem.difficulty}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mb-3">{game.problem.title}</h2>
          <button
            onClick={() => sdk.commands.openExternalLink({ url: game.problem!.url })}
            className="w-full py-2 rounded bg-discord-blurple text-white font-medium hover:bg-discord-blurple/80 transition-colors"
          >
            Open on LeetCode
          </button>
        </div>
      )}

      {/* player statuses */}
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-2">
          Players
        </h2>
        <div className="flex flex-col gap-2">
          {sortedPlayers.map(player => (
            <PlayerStatus key={player.discordId} player={player} />
          ))}
        </div>
      </div>

      {/* submit button or completion status */}
      <div className="mt-4">
        {currentPlayer && hasCompleted ? (
          <div className="w-full py-3 rounded-lg text-center bg-discord-green/20 text-discord-green font-semibold text-lg border border-discord-green/30">
            Verified, {ordinal(currentPlayer.rank!)} place
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {error && (
              <p className="text-discord-red text-sm">{error}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`w-full py-3 rounded-lg font-semibold text-lg transition-colors ${
                submitting
                  ? 'bg-discord-secondary text-gray-500 cursor-not-allowed'
                  : 'bg-discord-green text-black hover:bg-discord-green/80'
              }`}
            >
              {submitting ? 'Verifying...' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// shows a single player's status during the round
function PlayerStatus({ player }: { player: Player }) {
  const completed = player.completedAt !== null;

  return (
    <div className="flex items-center gap-3 bg-discord-secondary rounded-lg px-4 py-3">
      <img
        src={player.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}
        alt={player.username}
        className="w-8 h-8 rounded-full"
      />
      <span className="flex-1 text-white font-medium truncate">{player.username}</span>
      {completed ? (
        <span className="text-discord-green text-sm font-semibold">
          {ordinal(player.rank!)}
        </span>
      ) : (
        <span className="text-discord-yellow text-sm">Solving...</span>
      )}
    </div>
  );
}
