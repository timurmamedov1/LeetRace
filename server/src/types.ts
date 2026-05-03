// server-side game types, players stored in a Map keyed by discordId

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type GameState = 'lobby' | 'active' | 'finished';

export interface PlayerState {
  discordId: string;
  username: string;
  avatarUrl: string;
  isReady: boolean;
  completedAt: number | null;  // unix ts when player clicked "Done"
  rank: number | null;         // null if dnf
}

// one session per voice channel, kept in memory (only persisted when round ends)
export interface GameSession {
  id: string;
  channelId: string;
  guildId: string;
  hostId: string;
  difficulty: Difficulty;
  timeLimitSeconds: number;
  state: GameState;
  players: Map<string, PlayerState>;
  problem: LeetCodeProblem | null;
  startedAt: number | null;    // unix ts
}

export interface LeetCodeProblem {
  title: string;
  titleSlug: string;
  difficulty: Difficulty;
  frontendQuestionId: string;
  url: string;
}
