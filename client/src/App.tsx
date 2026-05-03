import { useDiscordSdk } from './hooks/useDiscordSdk';
import { useGameState } from './hooks/useGameState';
import Lobby from './components/Lobby';
import type { DiscordSdkState } from './hooks/useDiscordSdk';

// main entry - handles auth flow then hands off to GameView
export default function App() {
  const discord = useDiscordSdk();

  // show error if sdk auth failed (usually means the app isnt
  // running inside discords iframe or creds are wrong)
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

// this has to be a seperate component so useGameState hook
// only runs after auth is done (cant conditionally call hooks)
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

  // this happens if everyone left and the session got cleaned up
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

  // TODO: active game + scoreboard screens (phase 3)
  return (
    <div className="flex items-center justify-center h-screen bg-discord-tertiary">
      <p className="text-gray-400 text-lg">Game in progress...</p>
    </div>
  );
}
