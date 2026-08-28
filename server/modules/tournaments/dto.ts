import type {
  CreateTournamentRequest,
  UpdateTournamentRequest,
  UpdateStatusRequest,
  UpdateSignupStatusRequest,
  AddPlayerRequest,
  UpdateMatchRequest,
  VerifyKeyRequest,
} from '@shared/api.interface';

export class CreateTournamentDto implements CreateTournamentRequest {
  name!: string;
  format!: CreateTournamentRequest['format'];
  maxPlayers!: number;
  winScore?: number;
  swissRounds?: number;
  tournamentDate?: string;
  location?: string;
  adminKey?: string;
}

export class UpdateTournamentDto implements UpdateTournamentRequest {
  name?: string;
  format?: UpdateTournamentRequest['format'];
  maxPlayers?: number;
  winScore?: number;
  swissRounds?: number;
  tournamentDate?: string;
  location?: string;
}

export class UpdateStatusDto implements UpdateStatusRequest {
  status!: UpdateStatusRequest['status'];
}

export class UpdateSignupStatusDto implements UpdateSignupStatusRequest {
  signupStatus!: UpdateSignupStatusRequest['signupStatus'];
}

export class AddPlayerDto implements AddPlayerRequest {
  name!: string;
  bey?: string;
}

export class UpdateMatchDto implements UpdateMatchRequest {
  score1!: number;
  score2!: number;
}

export class VerifyKeyDto implements VerifyKeyRequest {
  adminKey!: string;
}
