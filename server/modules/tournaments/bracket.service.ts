import { Injectable, Logger } from '@nestjs/common';
import type { TournamentFormat } from '@shared/api.interface';

interface BracketPlayer {
  id: string;
  name: string;
  seed: number;
}

interface GeneratedMatch {
  round: string;
  matchIndex: number;
  player1Id: string | null;
  player2Id: string | null;
  bracket: 'main' | 'losers';
  status: 'pending';
}

interface MatchResult {
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  score1: number;
  score2: number;
}

@Injectable()
export class BracketService {
  private readonly logger = new Logger(BracketService.name);

  /**
   * Generate tournament bracket matches based on format.
   */
  generateBracket(
    players: BracketPlayer[],
    format: TournamentFormat,
    swissRounds: number,
  ): GeneratedMatch[] {
    this.logger.log(`Generating ${format} bracket for ${players.length} players`);

    switch (format) {
      case 'single_elimination':
        return this.generateSingleElimination(players);
      case 'double_elimination':
        return this.generateDoubleElimination(players);
      case 'round_robin':
        return this.generateRoundRobin(players);
      case 'swiss':
        return this.generateSwiss(players, swissRounds);
      case 'swiss_elimination':
        return this.generateSwissElimination(players, swissRounds);
      case 'round_robin_elimination':
        return this.generateRoundRobinElimination(players);
      default:
        return this.generateSingleElimination(players);
    }
  }

  // ==================== SINGLE ELIMINATION ====================

  private generateSingleElimination(players: BracketPlayer[]): GeneratedMatch[] {
    const matches: GeneratedMatch[] = [];
    const sortedPlayers = [...players].sort(
      (a: BracketPlayer, b: BracketPlayer) => a.seed - b.seed,
    );

    // Find next power of 2
    const numPlayers = sortedPlayers.length;
    const bracketSize = this.nextPowerOfTwo(numPlayers);
    const numByes = bracketSize - numPlayers;

    // Fill byes for top seeds (top N seeds get byes)
    const filledPlayers: (BracketPlayer | null)[] = [];
    for (let i = 0; i < numPlayers; i += 1) {
      filledPlayers.push(sortedPlayers[i]);
    }
    for (let i = 0; i < numByes; i += 1) {
      filledPlayers.push(null);
    }

    // Standard bracket seeding: 1 vs last, 2 vs second-last, etc.
    // First arrange players in bracket order
    const bracketOrder = this.seedBracketOrder(bracketSize);
    const firstRoundPlayers: (BracketPlayer | null)[] = [];
    for (let i = 0; i < bracketSize; i += 1) {
      const seedIdx = bracketOrder[i] - 1;
      firstRoundPlayers.push(filledPlayers[seedIdx] ?? null);
    }

    // Generate first round matches
    const firstRoundName = this.getRoundName(1, Math.log2(bracketSize));
    for (let i = 0; i < bracketSize; i += 2) {
      const p1 = firstRoundPlayers[i];
      const p2 = firstRoundPlayers[i + 1];
      const matchIndex = i / 2;

      // If one side is null (bye), the other automatically "wins" but we still
      // create the match as pending with one player. For simplicity, we advance
      // the real player automatically — but we should still create placeholder
      // matches for later rounds.
      // Strategy: create all matches for all rounds, fill first round players.
      matches.push({
        round: firstRoundName,
        matchIndex,
        player1Id: p1?.id ?? null,
        player2Id: p2?.id ?? null,
        bracket: 'main',
        status: 'pending',
      });
    }

    // Generate subsequent rounds (empty player slots)
    const totalRounds = Math.log2(bracketSize);
    for (let round = 2; round <= totalRounds; round += 1) {
      const roundName = this.getRoundName(round, totalRounds);
      const matchesInRound = bracketSize / Math.pow(2, round);
      for (let i = 0; i < matchesInRound; i += 1) {
        matches.push({
          round: roundName,
          matchIndex: i,
          player1Id: null,
          player2Id: null,
          bracket: 'main',
          status: 'pending',
        });
      }
    }

    // Handle byes: auto-advance players who get a bye
    if (numByes > 0) {
      this.autoAdvanceByes(matches, firstRoundName, bracketSize);
    }

    return matches;
  }

  private autoAdvanceByes(
    matches: GeneratedMatch[],
    firstRoundName: string,
    bracketSize: number,
  ): void {
    const firstRoundMatches = matches.filter(
      (m: GeneratedMatch) => m.round === firstRoundName,
    );
    const totalRounds = Math.log2(bracketSize);

    for (const match of firstRoundMatches) {
      // If only one player exists (the other is a bye)
      if (
        (match.player1Id && !match.player2Id) ||
        (!match.player1Id && match.player2Id)
      ) {
        const winnerId = match.player1Id ?? match.player2Id;
        // Advance winner to next round
        let currentMatchIndex = match.matchIndex;
        for (let round = 2; round <= totalRounds; round += 1) {
          const nextRoundName = this.getRoundName(round, totalRounds);
          const nextMatchIndex = Math.floor(currentMatchIndex / 2);
          const isFirstSlot = currentMatchIndex % 2 === 0;
          const nextMatch = matches.find(
            (m: GeneratedMatch) =>
              m.round === nextRoundName && m.matchIndex === nextMatchIndex,
          );
          if (nextMatch) {
            if (isFirstSlot) {
              nextMatch.player1Id = winnerId;
            } else {
              nextMatch.player2Id = winnerId;
            }
          }
          currentMatchIndex = nextMatchIndex;
        }
      }
    }
  }

  /**
   * Returns the standard bracket seeding order for a given bracket size.
   * e.g., for 8: [1, 8, 4, 5, 2, 7, 3, 6]
   * This is the order of seeds in position 0..n-1 of the first round.
   */
  private seedBracketOrder(size: number): number[] {
    if (size === 1) return [1];
    if (size === 2) return [1, 2];

    const prev = this.seedBracketOrder(size / 2);
    const result: number[] = [];
    for (let i = 0; i < prev.length; i += 1) {
      result.push(prev[i]);
      result.push(size + 1 - prev[i]);
    }
    return result;
  }

  private getRoundName(round: number, totalRounds: number): string {
    const roundsFromEnd = totalRounds - round + 1;
    if (roundsFromEnd === 1) return 'final';
    if (roundsFromEnd === 2) return 'semifinal';
    if (roundsFromEnd === 3) return 'quarterfinal';
    if (roundsFromEnd === 4) return 'round_of_16';
    if (roundsFromEnd === 5) return 'round_of_32';
    if (roundsFromEnd === 6) return 'round_of_64';
    return `round_${round}`;
  }

  private nextPowerOfTwo(n: number): number {
    if (n <= 1) return 1;
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  // ==================== DOUBLE ELIMINATION ====================

  private generateDoubleElimination(players: BracketPlayer[]): GeneratedMatch[] {
    // Reuse single elimination for winner's bracket, add basic loser's bracket
    const mainBracket = this.generateSingleElimination(players);

    // Add loser's bracket (simplified: just create placeholder rounds)
    // In a full double elimination, loser's bracket has 2*totalRounds - 2 rounds
    // For now, create a basic structure that won't error
    const bracketSize = this.nextPowerOfTwo(players.length);
    const totalRounds = Math.log2(bracketSize);
    const loserMatches: GeneratedMatch[] = [];

    // Loser's bracket rounds
    // Round 1 of losers: players who lost in round 1 of main
    const loserRounds = totalRounds * 2 - 2;
    for (let round = 1; round <= loserRounds; round += 1) {
      const matchesInRound = Math.max(1, Math.ceil(bracketSize / Math.pow(2, Math.ceil(round / 2) + (round % 2 === 0 ? 0 : 0))));
      const actualCount = Math.max(1, Math.floor(bracketSize / Math.pow(2, Math.ceil((round + 1) / 2))));
      for (let i = 0; i < actualCount; i += 1) {
        loserMatches.push({
          round: `losers_round_${round}`,
          matchIndex: i,
          player1Id: null,
          player2Id: null,
          bracket: 'losers',
          status: 'pending',
        });
      }
    }

    // Grand final
    loserMatches.push({
      round: 'grand_final',
      matchIndex: 0,
      player1Id: null,
      player2Id: null,
      bracket: 'main',
      status: 'pending',
    });

    return [...mainBracket, ...loserMatches];
  }

  // ==================== ROUND ROBIN ====================

  private generateRoundRobin(players: BracketPlayer[]): GeneratedMatch[] {
    const matches: GeneratedMatch[] = [];
    const sortedPlayers = [...players].sort(
      (a: BracketPlayer, b: BracketPlayer) => a.seed - b.seed,
    );

    const n = sortedPlayers.length;
    if (n < 2) return matches;

    // Circle method (round-robin scheduling)
    // If odd number of players, add a dummy "bye" player
    const playerList: (BracketPlayer | null)[] = [...sortedPlayers];
    const hasBye = n % 2 === 1;
    if (hasBye) playerList.push(null);

    const numRounds = playerList.length - 1; // n-1 rounds (or n if odd, still n-1 with byes)
    const half = playerList.length / 2;

    // Fix first player, rotate the rest
    for (let round = 0; round < numRounds; round += 1) {
      const roundName = `round_${round + 1}`;
      for (let i = 0; i < half; i += 1) {
        const p1 = playerList[i];
        const p2 = playerList[playerList.length - 1 - i];

        // Skip bye matches (one player is null)
        if (p1 && p2) {
          matches.push({
            round: roundName,
            matchIndex: i,
            player1Id: p1.id,
            player2Id: p2.id,
            bracket: 'main',
            status: 'pending',
          });
        }
      }

      // Rotate: keep index 0 fixed, move last to index 1
      const last = playerList.pop();
      playerList.splice(1, 0, last as BracketPlayer | null);
    }

    return matches;
  }

  // ==================== SWISS ====================

  private generateSwiss(
    players: BracketPlayer[],
    swissRounds: number,
  ): GeneratedMatch[] {
    const sortedPlayers = [...players].sort(
      (a: BracketPlayer, b: BracketPlayer) => a.seed - b.seed,
    );

    const numRounds = swissRounds > 0 ? swissRounds : Math.max(3, Math.ceil(Math.log2(players.length)));

    // For Swiss, we only generate the first round based on seeding
    // Subsequent rounds are generated dynamically as matches complete
    const matches: GeneratedMatch[] = [];

    // Round 1: pair by seed (1 vs 2, 3 vs 4, ...)
    const round1Matches = this.pairBySeed(sortedPlayers, 'round_1');
    matches.push(...round1Matches);

    return matches;
  }

  private pairBySeed(players: BracketPlayer[], roundName: string): GeneratedMatch[] {
    const matches: GeneratedMatch[] = [];
    for (let i = 0; i < players.length - 1; i += 2) {
      matches.push({
        round: roundName,
        matchIndex: i / 2,
        player1Id: players[i].id,
        player2Id: players[i + 1].id,
        bracket: 'main',
        status: 'pending',
      });
    }
    return matches;
  }

  /**
   * Generate next Swiss round pairings based on current results.
   * Used when a round completes to generate the next round's matches.
   */
  generateSwissNextRound(
    players: BracketPlayer[],
    results: MatchResult[],
    currentRound: number,
    playedPairs: Set<string>,
  ): GeneratedMatch[] {
    // Calculate wins per player
    const winsMap = new Map<string, number>();
    for (const p of players) {
      winsMap.set(p.id, 0);
    }
    for (const r of results) {
      if (r.winnerId) {
        winsMap.set(r.winnerId, (winsMap.get(r.winnerId) ?? 0) + 1);
      }
    }

    // Sort players by wins (desc), then by seed (asc) as tiebreaker
    const sorted = [...players].sort((a: BracketPlayer, b: BracketPlayer) => {
      const winsA = winsMap.get(a.id) ?? 0;
      const winsB = winsMap.get(b.id) ?? 0;
      if (winsB !== winsA) return winsB - winsA;
      return a.seed - b.seed;
    });

    // Group by wins
    const groups = new Map<number, BracketPlayer[]>();
    for (const p of sorted) {
      const w = winsMap.get(p.id) ?? 0;
      if (!groups.has(w)) groups.set(w, []);
      groups.get(w)!.push(p);
    }

    // Pair within each group, avoiding rematches
    const roundName = `round_${currentRound + 1}`;
    const matches: GeneratedMatch[] = [];
    const unpaired: BracketPlayer[] = [];

    const sortedWinValues = Array.from(groups.keys()).sort((a: number, b: number) => b - a);

    for (const winVal of sortedWinValues) {
      const group = [...(groups.get(winVal) ?? [])];
      // Also add any unpaired from previous (higher) group
      while (unpaired.length > 0 && group.length > 0) {
        const p1 = unpaired.shift()!;
        const p2 = group.shift()!;
        matches.push({
          round: roundName,
          matchIndex: matches.length,
          player1Id: p1.id,
          player2Id: p2.id,
          bracket: 'main',
          status: 'pending',
        });
      }

      // Pair within group, avoiding rematches (simplified greedy)
      let idx = 0;
      const localUnpaired: BracketPlayer[] = [];
      while (idx < group.length) {
        const p1 = group[idx];
        let found = false;
        for (let j = idx + 1; j < group.length; j += 1) {
          const p2 = group[j];
          const pairKey = this.pairKey(p1.id, p2.id);
          if (!playedPairs.has(pairKey)) {
            matches.push({
              round: roundName,
              matchIndex: matches.length,
              player1Id: p1.id,
              player2Id: p2.id,
              bracket: 'main',
              status: 'pending',
            });
            group.splice(j, 1);
            found = true;
            break;
          }
        }
        if (!found) {
          localUnpaired.push(p1);
        }
        idx += 1;
      }
      unpaired.push(...localUnpaired);
    }

    return matches;
  }

  private pairKey(id1: string, id2: string): string {
    return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
  }

  /**
   * Generate single elimination bracket for a given list of players with a round name prefix.
   * Used for elimination phase of combined formats (swiss+elimination, round_robin+elimination).
   */
  generateEliminationFromPlayers(
    players: BracketPlayer[],
    roundPrefix: string,
  ): GeneratedMatch[] {
    const matches = this.generateSingleElimination(players);
    return matches.map((m: GeneratedMatch) => ({
      ...m,
      round: `${roundPrefix}${m.round}`,
    }));
  }

  // ==================== SWISS + ELIMINATION ====================

  private generateSwissElimination(
    players: BracketPlayer[],
    swissRounds: number,
  ): GeneratedMatch[] {
    // Generate Swiss rounds first, then add single elimination for top 8
    const swissMatches = this.generateSwiss(players, swissRounds);
    // Add placeholder single elimination rounds (top 8 advance)
    const topN = Math.min(8, this.nextPowerOfTwo(players.length));
    if (topN >= 2) {
      const eliminationPlayers: BracketPlayer[] = [];
      for (let i = 0; i < topN; i += 1) {
        eliminationPlayers.push({ id: `seed_${i + 1}`, name: `Seed ${i + 1}`, seed: i + 1 });
      }
      const eliminationMatches = this.generateSingleElimination(eliminationPlayers);
      // Change round names to indicate elimination phase
      const prefixed = eliminationMatches.map((m: GeneratedMatch) => ({
        ...m,
        round: `elimination_${m.round}`,
        player1Id: null,
        player2Id: null,
      }));
      return [...swissMatches, ...prefixed];
    }
    return swissMatches;
  }

  // ==================== ROUND ROBIN + ELIMINATION ====================

  private generateRoundRobinElimination(players: BracketPlayer[]): GeneratedMatch[] {
    const rrMatches = this.generateRoundRobin(players);
    // Add placeholder single elimination for top 4
    const topN = Math.min(4, this.nextPowerOfTwo(players.length));
    if (topN >= 2) {
      const eliminationPlayers: BracketPlayer[] = [];
      for (let i = 0; i < topN; i += 1) {
        eliminationPlayers.push({ id: `seed_${i + 1}`, name: `Seed ${i + 1}`, seed: i + 1 });
      }
      const eliminationMatches = this.generateSingleElimination(eliminationPlayers);
      const prefixed = eliminationMatches.map((m: GeneratedMatch) => ({
        ...m,
        round: `elimination_${m.round}`,
        player1Id: null,
        player2Id: null,
      }));
      return [...rrMatches, ...prefixed];
    }
    return rrMatches;
  }
}
