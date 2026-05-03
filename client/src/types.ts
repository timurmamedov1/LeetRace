// client-side types - mirrors server but uses arrays instead of Maps
// (maps dont serialize over JSON)

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type GameState = 'lobby' | 'active' | 'finished';

export interface Player {
  discordId: string;
  username: string;
  avatarUrl: string;
  isReady: boolean;
  completedAt: number | null;  // unix ts when player clicked "Done"
  rank: number | null;         // null if dnf
}

export interface GameSession {
  id: string;
  channelId: string;
  guildId: string;
  hostId: string;
  difficulty: Difficulty;
  timeLimitSeconds: number;
  state: GameState;
  players: Player[];
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
