import { Player } from '../types';

interface PlayerCardProps {
  player: Player;
  isHost: boolean;
}

export default function PlayerCard({ player, isHost }: PlayerCardProps) {
  return (
    <div className="flex items-center gap-3 bg-discord-tertiary rounded-lg px-4 py-3">
      {/* avatar */}
      <img
        src={player.avatarUrl || `https://cdn.discordapp.com/embed/avatars/0.png`}
        alt={player.username}
        className="w-10 h-10 rounded-full"
      />

      {/* name + host badge */}
      <div className="flex-1 min-w-0">
        <span className="text-white font-medium truncate block">{player.username}</span>
        {isHost && (
          <span className="text-xs text-discord-yellow">Host</span>
        )}
      </div>

      {/* ready indicator */}
      <span className={`text-sm font-semibold ${player.isReady ? 'text-discord-green' : 'text-gray-500'}`}>
        {player.isReady ? 'Ready' : 'Not Ready'}
      </span>
    </div>
  );
}
