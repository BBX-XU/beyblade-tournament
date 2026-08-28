export type TournamentStatus = 'pending' | 'registering' | 'ongoing' | 'finished';
export type SignupStatus = 'open' | 'closed';
export type TournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'swiss'
  | 'swiss_elimination'
  | 'round_robin_elimination';
export type MatchStatus = 'pending' | 'finished';

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  maxPlayers: number;
  winScore: number;
  swissRounds: number;
  tournamentDate: string | null;
  location: string | null;
  status: TournamentStatus;
  signupStatus: SignupStatus;
  createdAt: string;
}

export interface Player {
  id: string;
  tournamentId: string;
  name: string;
  bey: string | null;
  seed: number | null;
  createdAt: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: string;
  matchIndex: number;
  player1Id: string | null;
  player2Id: string | null;
  player1Name?: string;
  player2Name?: string;
  score1: number;
  score2: number;
  winnerId: string | null;
  status: MatchStatus;
  bracket: string;
}

export interface RankingItem {
  rank: number;
  playerId: string;
  playerName: string;
  bey: string | null;
  wins: number;
  losses: number;
  points: number;
}

export interface TournamentListResponse {
  items: Tournament[];
}

export interface PlayerListResponse {
  items: Player[];
}

export interface MatchListResponse {
  items: Match[];
}

export interface RankingResponse {
  items: RankingItem[];
}

export interface CreateTournamentRequest {
  name: string;
  format: TournamentFormat;
  maxPlayers: number;
  winScore?: number;
  swissRounds?: number;
  tournamentDate?: string;
  location?: string;
  adminKey?: string;
}

export interface VerifyKeyRequest {
  adminKey: string;
}

export interface VerifyKeyResponse {
  valid: boolean;
  hasKey: boolean;
}

export interface UpdateTournamentRequest {
  name?: string;
  format?: TournamentFormat;
  maxPlayers?: number;
  winScore?: number;
  swissRounds?: number;
  tournamentDate?: string;
  location?: string;
}

export interface UpdateStatusRequest {
  status: TournamentStatus;
}

export interface UpdateSignupStatusRequest {
  signupStatus: SignupStatus;
}

export interface AddPlayerRequest {
  name: string;
  bey?: string;
}

export interface UpdateMatchRequest {
  score1: number;
  score2: number;
}
