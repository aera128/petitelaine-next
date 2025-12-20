export type GamePhase = 'LOBBY' | 'WRITING' | 'REVEAL' | 'DELIBERATION' | 'VOTING' | 'ENDED';

export type Role = 'MOUTON' | 'LOUP' | 'CHEVRE';

export type WinnerTeam = 'VILLAGE' | 'LOUP' | null;

export interface Player {
  id: string;
  name: string;
  avatar: string;
  role?: Role; // Hidden from client unless game over or self
  secretWord?: string | null; // Word given to player (null for Chevre)
  clue?: string | null; // Word submitted by player
  isHost: boolean;
  isReady: boolean;
  isAlive: boolean;
  votesReceived: number;
  votedFor?: string; // ID of player this player voted for
  history: string[]; // List of words submitted by this player
}

export interface GameSettings {
  blindMode: boolean; // Hide role label from self
  maxRounds: number;
  voteTimerSeconds: number;
  maxPlayers: number;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  settings: GameSettings;
  timerEndTime: number | null;
  round: number;
  winnerTeam: WinnerTeam;
  lastEliminatedRole: string | null;
  message?: string;
  revealedRoles: boolean;
  requestVoteCount: number; // For majority voting
}

export interface WsMessage {
  type: 'JOIN_ROOM' | 'CREATE_ROOM' | 'START_GAME' | 'SUBMIT_CLUE' | 'VOTE_PLAYER' | 'RESTART' | 'GAME_STATE' | 'WELCOME' | 'ERROR' | 'PLAYER_LEFT' | 'START_VOTE' | 'UPDATE_SETTINGS' | 'KICK_PLAYER' | 'CHECK_ROOM' | 'ROOM_CHECK_OK' | 'ROOM_CHECK_FAIL' | 'PROPOSE_VOTE' | 'NEXT_ROUND';
  payload?: any;
}
