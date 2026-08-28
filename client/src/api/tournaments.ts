import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  Tournament,
  Player,
  Match,
  RankingItem,
  TournamentListResponse,
  PlayerListResponse,
  MatchListResponse,
  RankingResponse,
  CreateTournamentRequest,
  UpdateTournamentRequest,
  AddPlayerRequest,
  UpdateMatchRequest,
  VerifyKeyResponse,
} from '@shared/api.interface';

// 比赛

export const listTournaments = async (): Promise<Tournament[]> => {
  try {
    const response = await axiosForBackend.get<TournamentListResponse>('/api/tournaments');
    return response.data.items;
  } catch (error) {
    logger.error('listTournaments failed', error);
    throw error;
  }
};

export const getTournament = async (id: string): Promise<Tournament> => {
  try {
    const response = await axiosForBackend.get<Tournament>(`/api/tournaments/${id}`);
    return response.data;
  } catch (error) {
    logger.error(`getTournament failed for id=${id}`, error);
    throw error;
  }
};

export const createTournament = async (data: CreateTournamentRequest): Promise<Tournament> => {
  try {
    const response = await axiosForBackend.post<Tournament>('/api/tournaments', data);
    return response.data;
  } catch (error) {
    logger.error('createTournament failed', error);
    throw error;
  }
};

export const updateTournament = async (
  id: string,
  data: UpdateTournamentRequest,
): Promise<Tournament> => {
  try {
    const response = await axiosForBackend.patch<Tournament>(
      `/api/tournaments/${id}`,
      data,
    );
    return response.data;
  } catch (error) {
    logger.error(`updateTournament failed for id=${id}`, error);
    throw error;
  }
};

export const deleteTournament = async (
  id: string,
  adminKey?: string,
): Promise<void> => {
  try {
    await axiosForBackend.delete(`/api/tournaments/${id}`, { data: { adminKey } });
  } catch (error) {
    logger.error(`deleteTournament failed for id=${id}`, error);
    throw error;
  }
};

export const updateStatus = async (
  id: string,
  status: string,
): Promise<Tournament> => {
  try {
    const response = await axiosForBackend.patch<Tournament>(
      `/api/tournaments/${id}/status`,
      { status },
    );
    return response.data;
  } catch (error) {
    logger.error(`updateStatus failed for id=${id}`, error);
    throw error;
  }
};

export const updateSignupStatus = async (
  id: string,
  signupStatus: string,
): Promise<Tournament> => {
  try {
    const response = await axiosForBackend.patch<Tournament>(
      `/api/tournaments/${id}/signup`,
      { signupStatus },
    );
    return response.data;
  } catch (error) {
    logger.error(`updateSignupStatus failed for id=${id}`, error);
    throw error;
  }
};

// 选手

export const listPlayers = async (tournamentId: string): Promise<Player[]> => {
  try {
    const response = await axiosForBackend.get<PlayerListResponse>(
      `/api/tournaments/${tournamentId}/players`,
    );
    return response.data.items;
  } catch (error) {
    logger.error(`listPlayers failed for tournamentId=${tournamentId}`, error);
    throw error;
  }
};

export const addPlayer = async (
  tournamentId: string,
  data: AddPlayerRequest,
): Promise<Player> => {
  try {
    const response = await axiosForBackend.post<Player>(
      `/api/tournaments/${tournamentId}/players`,
      data,
    );
    return response.data;
  } catch (error) {
    logger.error(`addPlayer failed for tournamentId=${tournamentId}`, error);
    throw error;
  }
};

export const deletePlayer = async (
  tournamentId: string,
  playerId: string,
): Promise<void> => {
  try {
    await axiosForBackend.delete(
      `/api/tournaments/${tournamentId}/players/${playerId}`,
    );
  } catch (error) {
    logger.error(
      `deletePlayer failed for tournamentId=${tournamentId}, playerId=${playerId}`,
      error,
    );
    throw error;
  }
};

export const shufflePlayers = async (
  tournamentId: string,
): Promise<Player[]> => {
  try {
    const response = await axiosForBackend.post<PlayerListResponse>(
      `/api/tournaments/${tournamentId}/players/shuffle`,
    );
    return response.data.items;
  } catch (error) {
    logger.error(`shufflePlayers failed for tournamentId=${tournamentId}`, error);
    throw error;
  }
};

export const fillSamplePlayers = async (
  tournamentId: string,
): Promise<Player[]> => {
  try {
    const response = await axiosForBackend.post<PlayerListResponse>(
      `/api/tournaments/${tournamentId}/players/fill-sample`,
    );
    return response.data.items;
  } catch (error) {
    logger.error(
      `fillSamplePlayers failed for tournamentId=${tournamentId}`,
      error,
    );
    throw error;
  }
};

// 赛程

export const listMatches = async (tournamentId: string): Promise<Match[]> => {
  try {
    const response = await axiosForBackend.get<MatchListResponse>(
      `/api/tournaments/${tournamentId}/matches`,
    );
    return response.data.items;
  } catch (error) {
    logger.error(`listMatches failed for tournamentId=${tournamentId}`, error);
    throw error;
  }
};

export const generateMatches = async (
  tournamentId: string,
): Promise<Match[]> => {
  try {
    const response = await axiosForBackend.post<MatchListResponse>(
      `/api/tournaments/${tournamentId}/matches/generate`,
    );
    return response.data.items;
  } catch (error) {
    logger.error(
      `generateMatches failed for tournamentId=${tournamentId}`,
      error,
    );
    throw error;
  }
};

export const generateNextRound = async (
  tournamentId: string,
): Promise<Match[]> => {
  try {
    const response = await axiosForBackend.post<MatchListResponse>(
      `/api/tournaments/${tournamentId}/matches/next-round`,
    );
    return response.data.items;
  } catch (error) {
    logger.error(
      `generateNextRound failed for tournamentId=${tournamentId}`,
      error,
    );
    throw error;
  }
};

export const updateMatch = async (
  tournamentId: string,
  matchId: string,
  data: UpdateMatchRequest,
): Promise<Match> => {
  try {
    const response = await axiosForBackend.patch<Match>(
      `/api/tournaments/${tournamentId}/matches/${matchId}`,
      data,
    );
    return response.data;
  } catch (error) {
    logger.error(
      `updateMatch failed for tournamentId=${tournamentId}, matchId=${matchId}`,
      error,
    );
    throw error;
  }
};

// 排名

export const getRanking = async (
  tournamentId: string,
): Promise<RankingItem[]> => {
  try {
    const response = await axiosForBackend.get<RankingResponse>(
      `/api/tournaments/${tournamentId}/ranking`,
    );
    return response.data.items;
  } catch (error) {
    logger.error(`getRanking failed for tournamentId=${tournamentId}`, error);
    throw error;
  }
};

export const verifyAdminKey = async (
  tournamentId: string,
  adminKey: string,
): Promise<VerifyKeyResponse> => {
  try {
    const response = await axiosForBackend.post<VerifyKeyResponse>(
      `/api/tournaments/${tournamentId}/verify-key`,
      { adminKey },
    );
    return response.data;
  } catch (error) {
    logger.error(`verifyAdminKey failed for tournamentId=${tournamentId}`, error);
    throw error;
  }
};
