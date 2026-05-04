import { GameSession, Player } from '../types';

interface ScoreboardProps {
  game: GameSession;
  currentUserId: string;
  onReturnToLobby: () => void;
}

// ordinal suffix for placement (1st, 2nd, 3rd, etc)
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// formats a unix timestamp delta into "Xm Ys"
function formatDuration(startedAt: number, completedAt: number): string {
  const seconds = Math.floor((completedAt - startedAt) / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function Scoreboard({ game, currentUserId, onReturnToLobby }: ScoreboardProps) {
  const isHost = game.hostId === currentUserId;

  // sort: completed players first by rank, then DNFs at the bottom
  const sorted = [...game.players].sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col h-screen bg-discord-tertiary p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-center mb-2">Results</h1>

      {/* show which problem was played */}
      {game.problem && (
        <p className="text-center text-gray-400 text-sm mb-6">
          #{game.problem.frontendQuestionId}, {game.problem.title}
        </p>
      )}

      {/* results list */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {sorted.map((player, idx) => (
            <ResultRow
              key={player.discordId}
              player={player}
              startedAt={game.startedAt!}
              isCurrentUser={player.discordId === currentUserId}
              index={idx}
            />
          ))}
        </div>
      </div>

      {/* host can take everyone back to lobby for another round */}
      {isHost && (
        <button
          onClick={onReturnToLobby}
          className="mt-4 w-full py-3 rounded-lg font-semibold text-lg bg-discord-blurple text-white hover:bg-discord-blurple/80 transition-colors"
        >
          Play Again
        </button>
      )}
    </div>
  );
}

// single row in the results table
function ResultRow({ player, startedAt, isCurrentUser, index }: {
  player: Player;
  startedAt: number;
  isCurrentUser: boolean;
  index: number;
}) {
  const completed = player.rank !== null;

  // highlight the current user's row slightly
  const bgClass = isCurrentUser ? 'bg-discord-blurple/10 border border-discord-blurple/30' : 'bg-discord-secondary';

  // top 3 get special colors for their rank badge
  const rankColors = ['text-discord-yellow', 'text-gray-300', 'text-amber-600'];
  const rankColor = completed && player.rank! <= 3
    ? rankColors[player.rank! - 1]
    : 'text-gray-400';

  return (
    <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${bgClass}`}>
      {/* rank or DNF badge */}
      <span className={`w-8 text-center font-bold text-lg ${completed ? rankColor : 'text-discord-red'}`}>
        {completed ? ordinal(player.rank!) : 'DNF'}
      </span>

      <img
        src={player.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}
        alt={player.username}
        className="w-8 h-8 rounded-full"
      />

      <span className="flex-1 text-white font-medium truncate">{player.username}</span>

      {/* completion time or DNF */}
      <span className={`text-sm ${completed ? 'text-gray-300' : 'text-discord-red'}`}>
        {completed
          ? formatDuration(startedAt, player.completedAt!)
          : 'Did not finish'}
      </span>
    </div>
  );
}
