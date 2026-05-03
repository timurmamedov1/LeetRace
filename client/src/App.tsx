import { useDiscordSdk } from './hooks/useDiscordSdk';
import { useGameState } from './hooks/useGameState';
import Lobby from './components/Lobby';
import type { DiscordSdkState } from './hooks/useDiscordSdk';

export default function App() {
  const discord = useDiscordSdk();

  if (discord.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-discord-tertiary">
        <p className="text-discord-red text-lg">Error: {discord.error}</p>
      </div>
    );
  }

  if (!discord.authenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-discord-tertiary">
        <p className="text-gray-400 text-lg">Connecting to Discord...</p>
      </div>
    );
  }

  return <GameView discord={discord} />;
}

// separate component so useGameState hook only runs after auth is done
function GameView({ discord }: { discord: DiscordSdkState }) {
  const { game, loading, toggleReady, updateSettings } = useGameState(
    discord.channelId!,
    discord.guildId!,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-discord-tertiary">
        <p className="text-gray-400 text-lg">Loading game...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center h-screen bg-discord-tertiary">
        <p className="text-gray-400 text-lg">No active game</p>
      </div>
    );
  }

  if (game.state === 'lobby') {
    return (
      <Lobby
        game={game}
        currentUserId={discord.user!.id}
        onReady={toggleReady}
        onSettingsChange={updateSettings}
      />
    );
  }

  // phase 3: active game + scoreboard screens
  return (
    <div className="flex items-center justify-center h-screen bg-discord-tertiary">
      <p className="text-gray-400 text-lg">Game in progress...</p>
    </div>
  );
}
