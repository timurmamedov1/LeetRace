import { useDiscordSdk } from './hooks/useDiscordSdk';
import { useGameState } from './hooks/useGameState';
import Lobby from './components/Lobby';
import GameRound from './components/GameRound';
import Scoreboard from './components/Scoreboard';
import type { DiscordSdkState } from './hooks/useDiscordSdk';

// main entry, handles auth flow then hands off to game
export default function App() {
  const discord = useDiscordSdk();

  if (discord.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-discord-tertiary">
        <p className="text-red-400 text-lg">Error: {discord.error}</p>
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
  const {
    game, loading, toggleReady, updateSettings,
    startGame, completeChallenge, returnToLobby, setLeetcodeUsername,
  } = useGameState(discord.channelId!, discord.guildId!);

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

  const userId = discord.user!.id;

  if (game.state === 'lobby') {
    return (
      <Lobby
        game={game}
        currentUserId={userId}
        onReady={toggleReady}
        onSettingsChange={updateSettings}
        onStart={startGame}
        onSetLeetcodeUsername={setLeetcodeUsername}
      />
    );
  }

  if (game.state === 'active') {
    return (
      <GameRound
        game={game}
        currentUserId={userId}
        sdk={discord.sdk}
        onComplete={completeChallenge}
      />
    );
  }

  // game.state === 'finished'
  return (
    <Scoreboard
      game={game}
      currentUserId={userId}
      onReturnToLobby={returnToLobby}
    />
  );
}
