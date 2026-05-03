// server-side game types
// main difference from client types: players is a Map here (keyed by discordId)
// for fast lookups, but gets converted to array when sent over the wire

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type GameState = 'lobby' | 'active' | 'finished';

export interface PlayerState {
  discordId: string;
  username: string;
  avatarUrl: string;
  isReady: boolean;
  completedAt: number | null;  // unix ts when player clicked "Done"
  rank: number | null;         // null means dnf
}

// one session per voice channel. lives entirely in memory —
// we only write to the db after a round finishes to save stats
export interface GameSession {
  id: string;
  channelId: string;           // discord voice channel
  guildId: string;             // discord server
  hostId: string;              // user who created the lobby
  difficulty: Difficulty;
  timeLimitSeconds: number;    // how long the round lasts
  state: GameState;
  players: Map<string, PlayerState>;
  problem: LeetCodeProblem | null;
  startedAt: number | null;    // unix ts, set when host hits start
}

export interface LeetCodeProblem {
  title: string;
  titleSlug: string;           // for building the leetcode.com/problems/xxx url
  difficulty: Difficulty;
  frontendQuestionId: string;  // the "#123" number on leetcode
  url: string;
}
