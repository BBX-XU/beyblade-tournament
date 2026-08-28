import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TournamentsService } from './tournaments.service';
import {
  CreateTournamentDto,
  UpdateTournamentDto,
  UpdateStatusDto,
  UpdateSignupStatusDto,
  AddPlayerDto,
  UpdateMatchDto,
  VerifyKeyDto,
} from './dto';
import type {
  TournamentListResponse,
  Tournament,
  PlayerListResponse,
  MatchListResponse,
  RankingResponse,
  Player,
  Match,
  VerifyKeyResponse,
} from '@shared/api.interface';

@Controller('api/tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  // ==================== TOURNAMENT CRUD ====================

  @Get()
  async getList(): Promise<TournamentListResponse> {
    return this.tournamentsService.getList();
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateTournamentDto,
  ): Promise<Tournament> {
    const { userId } = req.userContext;
    return this.tournamentsService.create(dto, userId);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<Tournament> {
    return this.tournamentsService.getById(id);
  }

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateTournamentDto,
  ): Promise<Tournament> {
    const { userId } = req.userContext;
    return this.tournamentsService.update(id, dto, userId);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Body() dto: { adminKey?: string },
  ): Promise<void> {
    await this.tournamentsService.delete(id, dto.adminKey);
  }

  @Post(':id/verify-key')
  async verifyKey(
    @Param('id') id: string,
    @Body() dto: VerifyKeyDto,
  ): Promise<VerifyKeyResponse> {
    return this.tournamentsService.verifyAdminKey(id, dto.adminKey);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ): Promise<Tournament> {
    const { userId } = req.userContext;
    return this.tournamentsService.updateStatus(id, dto.status, userId);
  }

  @Patch(':id/signup')
  async updateSignupStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateSignupStatusDto,
  ): Promise<Tournament> {
    const { userId } = req.userContext;
    return this.tournamentsService.updateSignupStatus(id, dto.signupStatus, userId);
  }

  // ==================== PLAYERS ====================

  @Get(':id/players')
  async getPlayers(@Param('id') id: string): Promise<PlayerListResponse> {
    return this.tournamentsService.getPlayers(id);
  }

  @Post(':id/players')
  async addPlayer(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AddPlayerDto,
  ): Promise<Player> {
    const { userId } = req.userContext;
    return this.tournamentsService.addPlayer(id, dto.name, dto.bey, userId);
  }

  @Delete(':id/players/:playerId')
  async deletePlayer(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
  ): Promise<void> {
    await this.tournamentsService.deletePlayer(id, playerId);
  }

  @Post(':id/players/shuffle')
  async shufflePlayers(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<PlayerListResponse> {
    const { userId } = req.userContext;
    return this.tournamentsService.shufflePlayers(id, userId);
  }

  @Post(':id/players/fill-sample')
  async fillSamplePlayers(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<PlayerListResponse> {
    const { userId } = req.userContext;
    return this.tournamentsService.fillSamplePlayers(id, userId);
  }

  // ==================== MATCHES ====================

  @Get(':id/matches')
  async getMatches(@Param('id') id: string): Promise<MatchListResponse> {
    return this.tournamentsService.getMatches(id);
  }

  @Post(':id/matches/generate')
  async generateMatches(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<MatchListResponse> {
    const { userId } = req.userContext;
    return this.tournamentsService.generateMatches(id, userId);
  }

  @Post(':id/matches/next-round')
  async generateNextRound(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<MatchListResponse> {
    const { userId } = req.userContext;
    return this.tournamentsService.generateNextRound(id, userId);
  }

  @Patch(':id/matches/:matchId')
  async updateMatchScore(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body() dto: UpdateMatchDto,
  ): Promise<Match> {
    const { userId } = req.userContext;
    return this.tournamentsService.updateMatchScore(
      id,
      matchId,
      dto.score1,
      dto.score2,
      userId,
    );
  }

  // ==================== RANKING ====================

  @Get(':id/ranking')
  async getRanking(@Param('id') id: string): Promise<RankingResponse> {
    return this.tournamentsService.getRanking(id);
  }
}
