import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq, desc, asc, and, sql, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { tournaments, players, matches } from '@server/database/schema';
import { hashSync, compareSync } from 'bcryptjs';

const MASTER_ADMIN_KEY = process.env.MASTER_ADMIN_KEY || 'xgy667196';
import type {
  Tournament,
  Player,
  Match,
  TournamentFormat,
  TournamentListResponse,
  PlayerListResponse,
  MatchListResponse,
  RankingResponse,
  RankingItem,
  CreateTournamentRequest,
  UpdateTournamentRequest,
  TournamentStatus,
  SignupStatus,
} from '@shared/api.interface';
import { BracketService } from './bracket.service';

function extractPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string') return code;
    current = cause;
  }
  return undefined;
}

@Injectable()
export class TournamentsService {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bracketService: BracketService,
  ) {}

  // ==================== TOURNAMENT CRUD ====================

  async getList(): Promise<TournamentListResponse> {
    const rows = await this.db
      .select()
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt));

    return {
      items: rows.map((row) => this.mapTournament(row)),
    };
  }

  async getById(id: string): Promise<Tournament> {
    const rows = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id));

    if (rows.length === 0) {
      throw new NotFoundException('Tournament not found');
    }
    return this.mapTournament(rows[0]);
  }

  async create(dto: CreateTournamentRequest, userId: string): Promise<Tournament> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Tournament name is required');
    }

    const inserted = await this.db
      .insert(tournaments)
      .values({
        name: dto.name.trim(),
        format: dto.format,
        maxPlayers: dto.maxPlayers,
        winScore: dto.winScore ?? 3,
        swissRounds: dto.swissRounds ?? 0,
        tournamentDate: dto.tournamentDate && dto.tournamentDate.trim() !== '' ? dto.tournamentDate : null,
        location: dto.location && dto.location.trim() !== '' ? dto.location.trim() : null,
        adminKey: dto.adminKey && dto.adminKey.trim() !== '' ? hashSync(dto.adminKey.trim(), 10) : null,
        status: 'pending',
        signupStatus: 'closed',
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return this.mapTournament(inserted[0]);
  }

  async update(id: string, dto: UpdateTournamentRequest, userId: string): Promise<Tournament> {
    const existing = await this.getById(id);
    if (existing.status !== 'pending' && existing.status !== 'registering') {
      throw new ConflictException('Cannot update a tournament that has already started');
    }

    const patch: Partial<typeof tournaments.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.format !== undefined) patch.format = dto.format;
    if (dto.maxPlayers !== undefined) patch.maxPlayers = dto.maxPlayers;
    if (dto.winScore !== undefined) patch.winScore = dto.winScore;
    if (dto.swissRounds !== undefined) patch.swissRounds = dto.swissRounds;
    if (dto.tournamentDate !== undefined) {
      patch.tournamentDate = dto.tournamentDate && dto.tournamentDate.trim() !== '' ? dto.tournamentDate : null;
    }
    if (dto.location !== undefined) {
      patch.location = dto.location && dto.location.trim() !== '' ? dto.location.trim() : null;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    patch.updatedAt = new Date();
    patch.updatedBy = userId;

    const updated = await this.db
      .update(tournaments)
      .set(patch)
      .where(eq(tournaments.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('Tournament not found');
    }
    return this.mapTournament(updated[0]);
  }

  async delete(id: string, adminKey?: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id));

    if (existing.length === 0) {
      throw new NotFoundException('Tournament not found');
    }

    const row = existing[0];
    const isMaster = adminKey === MASTER_ADMIN_KEY;
    if (row.adminKey && !isMaster) {
      if (!adminKey || !compareSync(adminKey, row.adminKey)) {
        throw new ForbiddenException('Invalid admin key');
      }
    }

    const deleted = await this.db
      .delete(tournaments)
      .where(eq(tournaments.id, id))
      .returning({ id: tournaments.id });

    if (deleted.length === 0) {
      throw new NotFoundException('Tournament not found');
    }
    this.logger.log(`Deleted tournament ${id}`);
  }

  async updateStatus(id: string, status: TournamentStatus, userId: string): Promise<Tournament> {
    await this.getById(id); // throws if not found

    const updated = await this.db
      .update(tournaments)
      .set({
        status,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(tournaments.id, id))
      .returning();

    return this.mapTournament(updated[0]);
  }

  async updateSignupStatus(
    id: string,
    signupStatus: SignupStatus,
    userId: string,
  ): Promise<Tournament> {
    await this.getById(id);

    const updated = await this.db
      .update(tournaments)
      .set({
        signupStatus,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(tournaments.id, id))
      .returning();

    return this.mapTournament(updated[0]);
  }

  // ==================== PLAYERS ====================

  async getPlayers(tournamentId: string): Promise<PlayerListResponse> {
    const rows = await this.db
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournamentId))
      .orderBy(asc(players.seed), asc(players.createdAt));

    return {
      items: rows.map((row) => this.mapPlayer(row)),
    };
  }

  async addPlayer(
    tournamentId: string,
    name: string,
    bey: string | undefined,
    userId: string,
  ): Promise<Player> {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Player name is required');
    }

    const tournament = await this.getById(tournamentId);
    if (tournament.status !== 'pending' && tournament.status !== 'registering') {
      throw new ConflictException('Cannot add players to a tournament that has started');
    }

    // Check max players
    const { items: existingPlayers } = await this.getPlayers(tournamentId);
    if (existingPlayers.length >= tournament.maxPlayers) {
      throw new ConflictException('Maximum number of players reached');
    }

    // Check duplicate name
    const duplicate = existingPlayers.find(
      (p: Player) => p.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (duplicate) {
      throw new ConflictException('Player with this name already exists');
    }

    const nextSeed = existingPlayers.length + 1;

    const inserted = await this.db
      .insert(players)
      .values({
        tournamentId,
        name: name.trim(),
        bey: bey?.trim() ?? null,
        seed: nextSeed,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return this.mapPlayer(inserted[0]);
  }

  async deletePlayer(tournamentId: string, playerId: string): Promise<void> {
    const tournament = await this.getById(tournamentId);
    if (tournament.status !== 'pending' && tournament.status !== 'registering') {
      throw new ConflictException('Cannot remove players from a tournament that has started');
    }

    const deleted = await this.db
      .delete(players)
      .where(and(eq(players.id, playerId), eq(players.tournamentId, tournamentId)))
      .returning({ id: players.id });

    if (deleted.length === 0) {
      throw new NotFoundException('Player not found');
    }

    // Re-seed remaining players
    await this.reseedPlayers(tournamentId);
  }

  async shufflePlayers(tournamentId: string, userId: string): Promise<PlayerListResponse> {
    const tournament = await this.getById(tournamentId);
    if (tournament.status !== 'pending' && tournament.status !== 'registering') {
      throw new ConflictException('Cannot shuffle players in a tournament that has started');
    }

    const { items: existingPlayers } = await this.getPlayers(tournamentId);
    const shuffled = [...existingPlayers];

    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Update seeds
    for (let i = 0; i < shuffled.length; i += 1) {
      await this.db
        .update(players)
        .set({
          seed: i + 1,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(players.id, shuffled[i].id));
    }

    return this.getPlayers(tournamentId);
  }

  async fillSamplePlayers(tournamentId: string, userId: string): Promise<PlayerListResponse> {
    const tournament = await this.getById(tournamentId);
    if (tournament.status !== 'pending' && tournament.status !== 'registering') {
      throw new ConflictException('Cannot add sample players to a tournament that has started');
    }

    const samplePlayers = [
      { name: '翔', bey: 'Dransword 3-60F' },
      { name: '伯蔵', bey: 'Hells Scythe 4-60T' },
      { name: '紫電', bey: 'Shark Edge 3-80N' },
      { name: 'カミラ', bey: 'Knight Lance 4-80B' },
      { name: '斬円', bey: 'Wizard Rod 5-70N' },
      { name: 'トビ', bey: 'Behemoth Cyclone 1-80H' },
      { name: 'キンタロー', bey: 'Arrow Wizard 4-60N' },
      { name: '流也', bey: 'Magniac 1-60F' },
    ];

    for (const sp of samplePlayers) {
      const { items: current } = await this.getPlayers(tournamentId);
      if (current.length >= tournament.maxPlayers) break;

      const duplicate = current.find(
        (p: Player) => p.name.toLowerCase() === sp.name.toLowerCase(),
      );
      if (duplicate) continue;

      const nextSeed = current.length + 1;
      await this.db.insert(players).values({
        tournamentId,
        name: sp.name,
        bey: sp.bey,
        seed: nextSeed,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    return this.getPlayers(tournamentId);
  }

  private async reseedPlayers(tournamentId: string): Promise<void> {
    const { items: currentPlayers } = await this.getPlayers(tournamentId);
    for (let i = 0; i < currentPlayers.length; i += 1) {
      await this.db
        .update(players)
        .set({ seed: i + 1 })
        .where(eq(players.id, currentPlayers[i].id));
    }
  }

  // ==================== MATCHES ====================

  async getMatches(tournamentId: string): Promise<MatchListResponse> {
    // Create two aliases of the players table for double LEFT JOIN
    const player1Table = alias(players, 'p1');
    const player2Table = alias(players, 'p2');

    const rows = await this.db
      .select({
        id: matches.id,
        tournamentId: matches.tournamentId,
        round: matches.round,
        matchIndex: matches.matchIndex,
        player1Id: matches.player1Id,
        player2Id: matches.player2Id,
        score1: matches.score1,
        score2: matches.score2,
        winnerId: matches.winnerId,
        status: matches.status,
        bracket: matches.bracket,
        player1Name: player1Table.name,
        player2Name: player2Table.name,
      })
      .from(matches)
      .leftJoin(player1Table, eq(matches.player1Id, player1Table.id))
      .leftJoin(player2Table, eq(matches.player2Id, player2Table.id))
      .where(eq(matches.tournamentId, tournamentId))
      .orderBy(asc(matches.round), asc(matches.matchIndex));

    return {
      items: rows.map((row) => ({
        id: row.id,
        tournamentId: row.tournamentId,
        round: row.round,
        matchIndex: row.matchIndex,
        player1Id: row.player1Id ?? null,
        player2Id: row.player2Id ?? null,
        player1Name: row.player1Name ?? undefined,
        player2Name: row.player2Name ?? undefined,
        score1: row.score1 ?? 0,
        score2: row.score2 ?? 0,
        winnerId: row.winnerId ?? null,
        status: row.status as Match['status'],
        bracket: row.bracket ?? 'main',
      })),
    };
  }

  async generateMatches(tournamentId: string, userId: string): Promise<MatchListResponse> {
    const tournament = await this.getById(tournamentId);
    const { items: playerList } = await this.getPlayers(tournamentId);

    if (playerList.length < 2) {
      throw new BadRequestException('At least 2 players are required to generate matches');
    }

    const bracketPlayers = playerList.map((p: Player) => ({
      id: p.id,
      name: p.name,
      seed: p.seed ?? 0,
    }));

    const generatedMatches = this.bracketService.generateBracket(
      bracketPlayers,
      tournament.format,
      tournament.swissRounds,
    );

    // Delete existing matches first
    await this.db.delete(matches).where(eq(matches.tournamentId, tournamentId));

    // Insert new matches
    if (generatedMatches.length > 0) {
      const insertRows = generatedMatches.map((m) => ({
        tournamentId,
        round: m.round,
        matchIndex: m.matchIndex,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        bracket: m.bracket,
        createdBy: userId,
        updatedBy: userId,
      }));

      // Drizzle's $inferInsert type check
      const values: (typeof matches.$inferInsert)[] = insertRows;
      await this.db.insert(matches).values(values);
    }

    // Update tournament status if not ongoing
    if (tournament.status === 'pending' || tournament.status === 'registering') {
      await this.db
        .update(tournaments)
        .set({
          status: 'ongoing',
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(tournaments.id, tournamentId));
    }

    return this.getMatches(tournamentId);
  }

  async generateNextRound(
    tournamentId: string,
    userId: string,
  ): Promise<MatchListResponse> {
    const tournament = await this.getById(tournamentId);
    const { items: allMatches } = await this.getMatches(tournamentId);
    const mainMatches = allMatches.filter(
      (m: Match) => m.bracket === 'main',
    );

    if (
      tournament.format === 'swiss' ||
      tournament.format === 'swiss_elimination'
    ) {
      await this.handleSwissRoundComplete(
        tournamentId,
        tournament,
        userId,
      );
    } else if (tournament.format === 'round_robin_elimination') {
      await this.handleRoundRobinPhaseComplete(
        tournamentId,
        tournament,
        userId,
      );
    } else {
      throw new BadRequestException(
        '当前赛制不支持手动生成下一轮',
      );
    }

    return this.getMatches(tournamentId);
  }

  async updateMatchScore(
    tournamentId: string,
    matchId: string,
    score1: number,
    score2: number,
    userId: string,
  ): Promise<Match> {
    const tournament = await this.getById(tournamentId);

    // Get current match
    const existingMatches = await this.db
      .select()
      .from(matches)
      .where(and(eq(matches.id, matchId), eq(matches.tournamentId, tournamentId)));

    if (existingMatches.length === 0) {
      throw new NotFoundException('Match not found');
    }

    const existing = existingMatches[0];

    if (score1 < 0 || score2 < 0) {
      throw new BadRequestException('Scores cannot be negative');
    }

    // Determine winner
    let winnerId: string | null = null;
    let matchStatus: 'pending' | 'finished' = 'pending';

    if (score1 > score2 && existing.player1Id) {
      winnerId = existing.player1Id;
      matchStatus = 'finished';
    } else if (score2 > score1 && existing.player2Id) {
      winnerId = existing.player2Id;
      matchStatus = 'finished';
    } else if (score1 === score2 && score1 > 0) {
      // Ties are allowed in round_robin/swiss
      if (
        tournament.format === 'round_robin' ||
        tournament.format === 'swiss'
      ) {
        matchStatus = 'finished';
        winnerId = null;
      } else {
        throw new BadRequestException(
          'Ties are not allowed in elimination formats',
        );
      }
    }

    // Update the match
    const updated = await this.db
      .update(matches)
      .set({
        score1,
        score2,
        winnerId,
        status: matchStatus,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(matches.id, matchId))
      .returning();

    // Handle advancement for elimination formats
    const currentRound = updated[0].round;
    const isEliminationMatch =
      currentRound.startsWith('elimination_') ||
      currentRound.startsWith('losers_') ||
      tournament.format === 'single_elimination' ||
      tournament.format === 'double_elimination';

    if (matchStatus === 'finished' && winnerId && isEliminationMatch) {
      await this.handleEliminationAdvancement(
        tournamentId,
        updated[0],
        winnerId,
        tournament.format,
        userId,
      );
    }

    // Handle Swiss next round generation (pure swiss and swiss+elimination phase 1)
    if (
      matchStatus === 'finished' &&
      (tournament.format === 'swiss' || tournament.format === 'swiss_elimination')
    ) {
      await this.handleSwissRoundComplete(tournamentId, tournament, userId);
    }

    // Handle round_robin_elimination phase 1 -> elimination transition
    if (
      matchStatus === 'finished' &&
      tournament.format === 'round_robin_elimination'
    ) {
      await this.handleRoundRobinPhaseComplete(tournamentId, tournament, userId);
    }

    const allMatches = await this.getMatches(tournamentId);
    const result = allMatches.items.find((m: Match) => m.id === matchId);
    if (!result) {
      throw new NotFoundException('Match not found after update');
    }
    return result;
  }

  private async handleEliminationAdvancement(
    tournamentId: string,
    finishedMatch: typeof matches.$inferSelect,
    winnerId: string,
    format: TournamentFormat,
    userId: string,
  ): Promise<void> {
    const { items: allMatches } = await this.getMatches(tournamentId);

    if (finishedMatch.bracket === 'main' && format === 'double_elimination') {
      // Double elimination: loser drops to loser's bracket + winner advances in main
      const loserId = winnerId === finishedMatch.player1Id
        ? finishedMatch.player2Id
        : finishedMatch.player1Id;

      if (loserId) {
        await this.advanceLoserToLosersBracket(
          tournamentId,
          finishedMatch,
          loserId,
          allMatches,
          userId,
        );
      }
    }

    // Winner advances in main/elimination bracket
    const relevantMatches = allMatches.filter(
      (m: Match) =>
        m.bracket === finishedMatch.bracket &&
        (m.round.startsWith('elimination_') || m.round.startsWith('losers_')),
    );

    const roundOrder = this.getEliminationRoundOrder(relevantMatches);
    const currentRoundIdx = roundOrder.indexOf(finishedMatch.round);

    if (currentRoundIdx === -1 || currentRoundIdx >= roundOrder.length - 1) {
      return; // Final or unknown round
    }

    const nextRoundName = roundOrder[currentRoundIdx + 1];
    const nextMatchIndex = Math.floor(finishedMatch.matchIndex / 2);
    const isPlayer1 = finishedMatch.matchIndex % 2 === 0;

    const nextMatch = allMatches.find(
      (m: Match) =>
        m.bracket === finishedMatch.bracket &&
        m.round === nextRoundName &&
        m.matchIndex === nextMatchIndex,
    );

    if (!nextMatch) return;

    const patch: Partial<typeof matches.$inferInsert> = {};
    if (isPlayer1) {
      patch.player1Id = winnerId;
    } else {
      patch.player2Id = winnerId;
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;

    await this.db
      .update(matches)
      .set(patch)
      .where(eq(matches.id, nextMatch.id));
  }

  private async advanceLoserToLosersBracket(
    tournamentId: string,
    finishedMatch: typeof matches.$inferSelect,
    loserId: string,
    allMatches: Match[],
    userId: string,
  ): Promise<void> {
    const mainRoundOrder = this.getEliminationRoundOrder(
      allMatches.filter((m: Match) => m.bracket === 'main'),
    );
    const currentMainRoundIdx = mainRoundOrder.indexOf(finishedMatch.round);
    if (currentMainRoundIdx === -1) return;

    const losersRoundNum = currentMainRoundIdx + 1;
    const losersRoundName = `losers_round_${losersRoundNum}`;
    const losersMatches = allMatches.filter(
      (m: Match) => m.bracket === 'losers' && m.round === losersRoundName,
    );

    // Find first available slot in this losers round
    for (const lm of losersMatches) {
      if (!lm.player1Id) {
        await this.db
          .update(matches)
          .set({
            player1Id: loserId,
            updatedAt: new Date(),
            updatedBy: userId,
          })
          .where(eq(matches.id, lm.id));
        return;
      }
      if (!lm.player2Id) {
        await this.db
          .update(matches)
          .set({
            player2Id: loserId,
            updatedAt: new Date(),
            updatedBy: userId,
          })
          .where(eq(matches.id, lm.id));
        return;
      }
    }
  }

  private getEliminationRoundOrder(matches: Match[]): string[] {
    const roundSet = new Set<string>();
    for (const m of matches) {
      roundSet.add(m.round);
    }
    const rounds = Array.from(roundSet);
    rounds.sort((a: string, b: string) => {
      const countA = matches.filter((m: Match) => m.round === a).length;
      const countB = matches.filter((m: Match) => m.round === b).length;
      if (countB !== countA) return countB - countA;
      return a.localeCompare(b);
    });
    return rounds;
  }

  private async handleSwissRoundComplete(
    tournamentId: string,
    tournament: Tournament,
    userId: string,
  ): Promise<void> {
    const { items: allMatches } = await this.getMatches(tournamentId);
    const mainMatches = allMatches.filter((m: Match) => m.bracket === 'main');

    const swissMatches = mainMatches.filter((m: Match) =>
      /^round_\d+$/.test(m.round),
    );

    // Group by round
    const roundMap = new Map<string, Match[]>();
    for (const m of swissMatches) {
      if (!roundMap.has(m.round)) roundMap.set(m.round, []);
      roundMap.get(m.round)!.push(m);
    }

    const totalSwissRounds = tournament.swissRounds > 0
      ? tournament.swissRounds
      : Math.max(3, Math.ceil(Math.log2(Math.max(2, 8))));

    const sortedRoundNames = Array.from(roundMap.keys()).sort((a: string, b: string) => {
      const numA = parseInt(a.replace('round_', ''), 10);
      const numB = parseInt(b.replace('round_', ''), 10);
      return numA - numB;
    });

    // Find current highest round that has actual players
    let currentRoundNum = 0;
    for (const r of sortedRoundNames) {
      const roundMatches = roundMap.get(r) ?? [];
      const hasPlayers = roundMatches.some(
        (m: Match) => m.player1Id && m.player2Id,
      );
      if (hasPlayers) {
        const num = parseInt(r.replace('round_', ''), 10);
        if (num > currentRoundNum) currentRoundNum = num;
      }
    }

    if (currentRoundNum === 0) return; // No actual round yet

    const currentRoundName = `round_${currentRoundNum}`;
    const currentMatches = roundMap.get(currentRoundName) ?? [];
    const allFinished = currentMatches.every(
      (m: Match) =>
        m.status === 'finished' ||
        (!m.player1Id && !m.player2Id),
    );

    if (!allFinished) return;

    // Check if more Swiss rounds remain
    if (currentRoundNum < totalSwissRounds) {
      // Check if next round already exists with actual players
      const nextRoundName = `round_${currentRoundNum + 1}`;
      const nextMatches = swissMatches.filter(
        (m: Match) => m.round === nextRoundName,
      );
      if (nextMatches.some((m: Match) => m.player1Id && m.player2Id)) {
        return; // Already generated
      }

      // Generate next Swiss round
      await this.generateNextSwissRound(
        tournamentId,
        tournament,
        currentRoundNum,
        swissMatches,
        userId,
      );
      return;
    }

    // Swiss phase complete. Check for elimination phase.
    if (
      tournament.format === 'swiss_elimination' ||
      tournament.format === 'round_robin_elimination'
    ) {
      await this.populateEliminationFromRanking(
        tournamentId,
        tournament,
        mainMatches,
        userId,
      );
    }
  }

  private async populateEliminationFromRanking(
    tournamentId: string,
    tournament: Tournament,
    mainMatches: Match[],
    userId: string,
  ): Promise<void> {
    const eliminationMatches = mainMatches.filter((m: Match) =>
      m.round.startsWith('elimination_'),
    );
    if (eliminationMatches.length === 0) {
      await this.generateEliminationPhase(tournamentId, tournament, userId);
      return;
    }

    const firstElimRound = eliminationMatches
      .filter((m: Match) => m.round.startsWith('elimination_quarterfinal') || m.round.startsWith('elimination_round'))
      .sort((a: Match, b: Match) => a.matchIndex - b.matchIndex);

    let targetRound = firstElimRound;
    if (targetRound.length === 0) {
      targetRound = eliminationMatches
        .filter((m: Match) => m.round.startsWith('elimination_semifinal'))
        .sort((a: Match, b: Match) => a.matchIndex - b.matchIndex);
    }
    if (targetRound.length === 0) return;
    if (targetRound.every((m: Match) => m.player1Id && m.player2Id)) return;

    const ranking = await this.getRanking(tournamentId);
    const topN = targetRound.length * 2;
    const topPlayers = ranking.items.slice(0, topN);

    for (let i = 0; i < targetRound.length && i * 2 < topPlayers.length; i += 1) {
      const p1 = topPlayers[i * 2]?.playerId;
      const p2 = topPlayers[i * 2 + 1]?.playerId;
      const patch: Partial<typeof matches.$inferInsert> = {};
      if (p1) patch.player1Id = p1;
      if (p2) patch.player2Id = p2;
      if (p1 || p2) {
        patch.updatedAt = new Date();
        patch.updatedBy = userId;
        await this.db
          .update(matches)
          .set(patch)
          .where(eq(matches.id, targetRound[i].id));
      }
    }
  }

  private async generateNextSwissRound(
    tournamentId: string,
    tournament: Tournament,
    currentRoundNum: number,
    allMainMatches: Match[],
    userId: string,
  ): Promise<void> {
    const nextRoundName = `round_${currentRoundNum + 1}`;

    // Get all finished match results for played pair tracking
    const finishedMatches = allMainMatches.filter(
      (m: Match) => m.status === 'finished',
    );
    const results = finishedMatches.map((m: Match) => ({
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      winnerId: m.winnerId,
      score1: m.score1,
      score2: m.score2,
    }));

    const playedPairs = new Set<string>();
    for (const m of finishedMatches) {
      if (m.player1Id && m.player2Id) {
        const pairKey = m.player1Id < m.player2Id
          ? `${m.player1Id}:${m.player2Id}`
          : `${m.player2Id}:${m.player1Id}`;
        playedPairs.add(pairKey);
      }
    }

    const { items: playerList } = await this.getPlayers(tournamentId);
    const bracketPlayers = playerList.map((p: Player) => ({
      id: p.id,
      name: p.name,
      seed: p.seed ?? 0,
    }));

    const nextRoundMatches = this.bracketService.generateSwissNextRound(
      bracketPlayers,
      results,
      currentRoundNum,
      playedPairs,
    );

    if (nextRoundMatches.length > 0) {
      const insertRows = nextRoundMatches.map((m) => ({
        tournamentId,
        round: m.round,
        matchIndex: m.matchIndex,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        bracket: m.bracket,
        createdBy: userId,
        updatedBy: userId,
      }));

      const values: (typeof matches.$inferInsert)[] = insertRows;
      try {
        await this.db.insert(matches).values(values).onConflictDoNothing({
          target: [
            matches.tournamentId,
            matches.round,
            matches.matchIndex,
            matches.bracket,
          ],
        });
      } catch (error) {
        const pgCode = extractPostgresErrorCode(error);
        if (pgCode !== '23505') throw error;
      }
    }
  }

  private async handleRoundRobinPhaseComplete(
    tournamentId: string,
    tournament: Tournament,
    userId: string,
  ): Promise<void> {
    const { items: allMatches } = await this.getMatches(tournamentId);
    const rrMatches = allMatches.filter(
      (m: Match) =>
        m.bracket === 'main' && /^round_\d+$/.test(m.round),
    );

    if (rrMatches.length === 0) return;

    const allFinished = rrMatches.every(
      (m: Match) => m.status === 'finished',
    );
    if (!allFinished) return;

    const mainMatches = allMatches.filter(
      (m: Match) => m.bracket === 'main',
    );

    await this.populateEliminationFromRanking(
      tournamentId,
      tournament,
      mainMatches,
      userId,
    );
  }

  private async generateEliminationPhase(
    tournamentId: string,
    tournament: Tournament,
    userId: string,
  ): Promise<void> {
    const { items: playerList } = await this.getPlayers(tournamentId);
    const ranking = await this.getRanking(tournamentId);

    const topN = tournament.format === 'swiss_elimination'
      ? Math.min(8, this.nextPowerOfTwo(playerList.length))
      : Math.min(4, this.nextPowerOfTwo(playerList.length));

    const topPlayers = ranking.items.slice(0, topN);
    if (topPlayers.length < 2) return;

    const bracketPlayers = topPlayers.map((p, i) => ({
      id: p.playerId,
      name: p.playerName,
      seed: i + 1,
    }));

    const eliminationMatches = this.bracketService.generateEliminationFromPlayers(
      bracketPlayers,
      'elimination_',
    );

    if (eliminationMatches.length > 0) {
      const insertRows = eliminationMatches.map((m) => ({
        tournamentId,
        round: m.round,
        matchIndex: m.matchIndex,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        bracket: m.bracket,
        createdBy: userId,
        updatedBy: userId,
      }));

      const values: (typeof matches.$inferInsert)[] = insertRows;
      await this.db.insert(matches).values(values);
    }
  }

  private nextPowerOfTwo(n: number): number {
    if (n <= 1) return 1;
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  // ==================== RANKING ====================

  async getRanking(tournamentId: string): Promise<RankingResponse> {
    const tournament = await this.getById(tournamentId);
    const { items: playerList } = await this.getPlayers(tournamentId);
    const { items: matchList } = await this.getMatches(tournamentId);

    const isEliminationFormat =
      tournament.format === 'single_elimination' ||
      tournament.format === 'double_elimination' ||
      tournament.format === 'swiss_elimination' ||
      tournament.format === 'round_robin_elimination';

    const rankingItems: RankingItem[] = [];

    if (isEliminationFormat) {
      // Elimination ranking: champion > finalist > semifinalists > etc.
      const eliminationMatches = matchList.filter(
        (m: Match) => m.status === 'finished' && m.bracket === 'main',
      );

      // Build a map of each player's furthest round reached
      const furthestRound = new Map<string, string>();
      const winsCount = new Map<string, number>();
      const lossesCount = new Map<string, number>();
      const pointsDiff = new Map<string, number>();

      for (const p of playerList) {
        winsCount.set(p.id, 0);
        lossesCount.set(p.id, 0);
        pointsDiff.set(p.id, 0);
      }

      // Count wins/losses and track furthest round
      for (const m of eliminationMatches) {
        if (m.player1Id) {
          furthestRound.set(
            m.player1Id,
            this.laterRound(furthestRound.get(m.player1Id), m.round),
          );
        }
        if (m.player2Id) {
          furthestRound.set(
            m.player2Id,
            this.laterRound(furthestRound.get(m.player2Id), m.round),
          );
        }

        if (m.winnerId) {
          winsCount.set(m.winnerId, (winsCount.get(m.winnerId) ?? 0) + 1);
          const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
          if (loserId) {
            lossesCount.set(loserId, (lossesCount.get(loserId) ?? 0) + 1);
          }
        }

        // Points (score difference)
        if (m.player1Id) {
          pointsDiff.set(
            m.player1Id,
            (pointsDiff.get(m.player1Id) ?? 0) + (m.score1 - m.score2),
          );
        }
        if (m.player2Id) {
          pointsDiff.set(
            m.player2Id,
            (pointsDiff.get(m.player2Id) ?? 0) + (m.score2 - m.score1),
          );
        }
      }

      // Find champion and finalist
      const roundOrder = this.getEliminationRoundOrder(matchList);
      const finalRound = roundOrder[roundOrder.length - 1];
      const finalMatches = eliminationMatches.filter(
        (m: Match) => m.round === finalRound,
      );

      let championId: string | null = null;
      let finalistId: string | null = null;
      if (finalMatches.length > 0 && finalMatches[0].winnerId) {
        championId = finalMatches[0].winnerId;
        finalistId =
          finalMatches[0].winnerId === finalMatches[0].player1Id
            ? finalMatches[0].player2Id
            : finalMatches[0].player1Id;
      }

      // Build ranking
      const ranked = [...playerList].sort((a: Player, b: Player) => {
        // Champion first
        if (a.id === championId) return -1;
        if (b.id === championId) return 1;
        // Finalist second
        if (a.id === finalistId) return -1;
        if (b.id === finalistId) return 1;
        // Then by furthest round reached (later round = better)
        const roundA = furthestRound.get(a.id) ?? '';
        const roundB = furthestRound.get(b.id) ?? '';
        const roundIdxA = roundOrder.indexOf(roundA);
        const roundIdxB = roundOrder.indexOf(roundB);
        if (roundIdxB !== roundIdxA) return roundIdxB - roundIdxA;
        // Then by wins
        const winsA = winsCount.get(a.id) ?? 0;
        const winsB = winsCount.get(b.id) ?? 0;
        if (winsB !== winsA) return winsB - winsA;
        // Then by points difference
        const ptsA = pointsDiff.get(a.id) ?? 0;
        const ptsB = pointsDiff.get(b.id) ?? 0;
        return ptsB - ptsA;
      });

      for (let i = 0; i < ranked.length; i += 1) {
        const p = ranked[i];
        rankingItems.push({
          rank: i + 1,
          playerId: p.id,
          playerName: p.name,
          bey: p.bey,
          wins: winsCount.get(p.id) ?? 0,
          losses: lossesCount.get(p.id) ?? 0,
          points: pointsDiff.get(p.id) ?? 0,
        });
      }
    } else {
      // Round robin / Swiss ranking: wins > points > total score
      const winsCount = new Map<string, number>();
      const lossesCount = new Map<string, number>();
      const pointsDiff = new Map<string, number>();
      const totalScore = new Map<string, number>();

      for (const p of playerList) {
        winsCount.set(p.id, 0);
        lossesCount.set(p.id, 0);
        pointsDiff.set(p.id, 0);
        totalScore.set(p.id, 0);
      }

      const finishedMatches = matchList.filter(
        (m: Match) => m.status === 'finished',
      );

      for (const m of finishedMatches) {
        if (m.player1Id) {
          totalScore.set(
            m.player1Id,
            (totalScore.get(m.player1Id) ?? 0) + m.score1,
          );
          pointsDiff.set(
            m.player1Id,
            (pointsDiff.get(m.player1Id) ?? 0) + (m.score1 - m.score2),
          );
        }
        if (m.player2Id) {
          totalScore.set(
            m.player2Id,
            (totalScore.get(m.player2Id) ?? 0) + m.score2,
          );
          pointsDiff.set(
            m.player2Id,
            (pointsDiff.get(m.player2Id) ?? 0) + (m.score2 - m.score1),
          );
        }

        if (m.winnerId) {
          winsCount.set(m.winnerId, (winsCount.get(m.winnerId) ?? 0) + 1);
          const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
          if (loserId) {
            lossesCount.set(loserId, (lossesCount.get(loserId) ?? 0) + 1);
          }
        } else {
          // Draw - no win/loss
        }
      }

      const sorted = [...playerList].sort((a: Player, b: Player) => {
        const winsA = winsCount.get(a.id) ?? 0;
        const winsB = winsCount.get(b.id) ?? 0;
        if (winsB !== winsA) return winsB - winsA;

        const ptsA = pointsDiff.get(a.id) ?? 0;
        const ptsB = pointsDiff.get(b.id) ?? 0;
        if (ptsB !== ptsA) return ptsB - ptsA;

        const scoreA = totalScore.get(a.id) ?? 0;
        const scoreB = totalScore.get(b.id) ?? 0;
        return scoreB - scoreA;
      });

      for (let i = 0; i < sorted.length; i += 1) {
        const p = sorted[i];
        rankingItems.push({
          rank: i + 1,
          playerId: p.id,
          playerName: p.name,
          bey: p.bey,
          wins: winsCount.get(p.id) ?? 0,
          losses: lossesCount.get(p.id) ?? 0,
          points: pointsDiff.get(p.id) ?? 0,
        });
      }
    }

    return { items: rankingItems };
  }

  private laterRound(a: string | undefined, b: string): string {
    if (!a) return b;
    // Simple heuristic: the round with fewer matches is later
    // Just return b for now (last seen match's round)
    // We'll use round order index comparison in the caller
    return b;
  }

  // ==================== MAPPERS ====================

  async verifyAdminKey(id: string, adminKey: string): Promise<{ valid: boolean; hasKey: boolean }> {
    const rows = await this.db
      .select({ adminKey: tournaments.adminKey })
      .from(tournaments)
      .where(eq(tournaments.id, id));

    if (rows.length === 0) {
      throw new NotFoundException('Tournament not found');
    }

    if (adminKey === MASTER_ADMIN_KEY) {
      return { valid: true, hasKey: !!rows[0].adminKey };
    }

    const stored = rows[0].adminKey;
    if (!stored) {
      return { valid: true, hasKey: false };
    }

    return {
      valid: compareSync(adminKey, stored),
      hasKey: true,
    };
  }

  private mapTournament(row: typeof tournaments.$inferSelect): Tournament {
    return {
      id: row.id,
      name: row.name,
      format: row.format as TournamentFormat,
      maxPlayers: row.maxPlayers,
      winScore: row.winScore,
      swissRounds: row.swissRounds ?? 0,
      tournamentDate: row.tournamentDate ?? null,
      location: row.location ?? null,
      status: row.status as Tournament['status'],
      signupStatus: row.signupStatus as Tournament['signupStatus'],
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapPlayer(row: typeof players.$inferSelect): Player {
    return {
      id: row.id,
      tournamentId: row.tournamentId,
      name: row.name,
      bey: row.bey ?? null,
      seed: row.seed ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
