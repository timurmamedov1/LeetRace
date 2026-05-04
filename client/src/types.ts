// client-side types. mirrors the server types but uses arrays instead of Maps
// bc Maps dont serialize over JSON (they just become empty objects)

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type GameState = 'lobby' | 'active' | 'finished';

export interface Player {
  discordId: string;
  username: string;
  avatarUrl: string;
  leetcodeUsername: string | null;
  isReady: boolean;
  completedAt: number | null;  // unix ts when player clicked "Done"
  rank: number | null;         // null means they dnf'd
}

export interface GameSession {
  id: string;
  channelId: string;           // discord voice channel this game is in
  guildId: string;             // discord server id
  hostId: string;              // whoever created the lobby
  difficulty: Difficulty;
  timeLimitSeconds: number;
  state: GameState;
  players: Player[];           // server sends this as array (Map on server side)
  problem: LeetCodeProblem | null;
  startedAt: number | null;    // unix ts, null until game starts
}

export interface LeetCodeProblem {
  title: string;
  titleSlug: string;           // used to build the leetcode.com url
  difficulty: Difficulty;
  frontendQuestionId: string;  // the "#123" problem number on leetcode
  url: string;
}
