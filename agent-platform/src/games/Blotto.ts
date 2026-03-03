import { GameEngine, GameState, GameMove } from './GameEngine';

/**
 * Colonel Blotto — Strategic Resource Allocation Game
 * 
 * Rules:
 * - 2 players, each with 100 tokens
 * - 5 battlefields
 * - Simultaneously allocate tokens across battlefields
 * - Win a battlefield by deploying more tokens than opponent
 * - Win the game by winning 3+ battlefields (majority)
 */

export interface BlottoAllocation {
  battlefields: number[]; // Array of 5 numbers summing to 100
}

export interface BlottoMetadata {
  totalTokens: number;
  numBattlefields: number;
  allocations: Record<string, number[]>;
  results?: {
    battlefieldWinners: (string | 'draw')[];
    player1Wins: number;
    player2Wins: number;
  };
}

export class BlottoGame implements GameEngine {
  gameType = "BLOTTO";
  private totalTokens = 100;
  private numBattlefields = 5;

  initialize(matchId: string, players: string[], config?: any): GameState {
    if (players.length !== 2) throw new Error("Blotto requires exactly 2 players");

    const tokens = config?.totalTokens || this.totalTokens;
    const fields = config?.numBattlefields || this.numBattlefields;

    const metadata: BlottoMetadata = {
      totalTokens: tokens,
      numBattlefields: fields,
      allocations: {},
    };

    return {
      matchId,
      gameType: this.gameType,
      players,
      moves: [],
      status: 'active',
      currentTurn: undefined, // Simultaneous
      metadata,
    };
  }

  validateMove(state: GameState, move: GameMove): boolean {
    if (state.status !== 'active') return false;
    if (!state.players.includes(move.playerId)) return false;

    const meta = state.metadata as BlottoMetadata;
    
    // Check if player already submitted
    if (meta.allocations[move.playerId]) return false;

    const allocation = move.action as BlottoAllocation;
    if (!allocation.battlefields || allocation.battlefields.length !== meta.numBattlefields) return false;

    // All values must be non-negative integers
    for (const val of allocation.battlefields) {
      if (val < 0 || !Number.isInteger(val)) return false;
    }

    // Must sum to totalTokens
    const sum = allocation.battlefields.reduce((a, b) => a + b, 0);
    if (sum !== meta.totalTokens) return false;

    return true;
  }

  processMove(state: GameState, move: GameMove): GameState {
    const newState = { ...state, moves: [...state.moves, move] };
    const meta = { ...(state.metadata as BlottoMetadata) };
    meta.allocations = { ...meta.allocations };
    newState.metadata = meta;

    const allocation = move.action as BlottoAllocation;
    meta.allocations[move.playerId] = allocation.battlefields;

    // Check if both players have submitted
    if (Object.keys(meta.allocations).length === 2) {
      this.resolveGame(newState, meta);
    }

    return newState;
  }

  private resolveGame(state: GameState, meta: BlottoMetadata) {
    const p1 = state.players[0];
    const p2 = state.players[1];
    const a1 = meta.allocations[p1];
    const a2 = meta.allocations[p2];

    const battlefieldWinners: (string | 'draw')[] = [];
    let p1Wins = 0;
    let p2Wins = 0;

    for (let i = 0; i < meta.numBattlefields; i++) {
      if (a1[i] > a2[i]) {
        battlefieldWinners.push(p1);
        p1Wins++;
      } else if (a2[i] > a1[i]) {
        battlefieldWinners.push(p2);
        p2Wins++;
      } else {
        battlefieldWinners.push('draw');
      }
    }

    meta.results = { battlefieldWinners, player1Wins: p1Wins, player2Wins: p2Wins };

    state.status = 'completed';
    const majority = Math.ceil(meta.numBattlefields / 2);
    if (p1Wins >= majority) {
      state.winner = p1;
    } else if (p2Wins >= majority) {
      state.winner = p2;
    } else {
      state.winner = 'draw';
    }
  }

  isGameOver(state: GameState): boolean {
    return state.status === 'completed';
  }

  getWinner(state: GameState): string | null {
    if (!this.isGameOver(state)) return null;
    return state.winner === 'draw' ? null : (state.winner || null);
  }
}
