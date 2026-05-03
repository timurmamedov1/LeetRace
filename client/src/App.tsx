import { useDiscordSdk } from './hooks/useDiscordSdk';

export default function App() {
  const { authenticated, user, error } = useDiscordSdk();

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-discord-tertiary">
        <p className="text-discord-red text-lg">Error: {error}</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-discord-tertiary">
        <p className="text-gray-400 text-lg">Connecting to Discord...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-discord-tertiary">
      <h1 className="text-3xl font-bold mb-4">LeetCode Race</h1>
      <p className="text-gray-300 text-lg">
        Welcome, <span className="text-discord-green font-semibold">{user?.username}</span>!
      </p>
    </div>
  );
}
