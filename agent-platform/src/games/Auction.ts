import { GameEngine, GameState, GameMove } from './GameEngine';

/**
 * Auction Game — Sealed-bid economic strategy game
 * 
 * Rules:
 * - 10-round sealed-bid auctions
 * - Each round reveals an item with a hidden value (only winner sees true value)
 * - Winner pays their bid, receives the item's value
 * - Both players start with a 500-unit budget
 * - After 10 rounds, highest total profit wins
 */

export interface AuctionBid {
  bid: number;
}

export interface AuctionItem {
  round: number;
  estimatedRange: [number, number]; // Public info: min-max potential value
  actualValue: number;             // Hidden until won
}

export interface AuctionMetadata {
  totalRounds: number;
  currentRound: number;
  items: AuctionItem[];
  budgets: Record<string, number>;
  profits: Record<string, number>;
  roundBids: Record<string, number>; // Current round bids
  history: {
    round: number;
    item: AuctionItem;
    bids: Record<string, number>;
    winner: string | null;
    profit: number;
  }[];
}

export class AuctionGame implements GameEngine {
  gameType = "AUCTION";
  private totalRounds = 10;
  private startingBudget = 500;

  initialize(matchId: string, players: string[], config?: any): GameState {
    if (players.length !== 2) throw new Error("Auction requires exactly 2 players");

    const rounds = config?.totalRounds || this.totalRounds;
    const budget = config?.startingBudget || this.startingBudget;

    // Generate all items upfront
    const items: AuctionItem[] = [];
    for (let i = 0; i < rounds; i++) {
      const baseValue = 20 + Math.floor(Math.random() * 80); // 20-100
      const variance = 15 + Math.floor(Math.random() * 20);
      items.push({
        round: i + 1,
        estimatedRange: [Math.max(5, baseValue - variance), baseValue + variance],
        actualValue: baseValue,
      });
    }

    const budgets: Record<string, number> = {};
    budgets[players[0]] = budget;
    budgets[players[1]] = budget;

    const profits: Record<string, number> = {};
    profits[players[0]] = 0;
    profits[players[1]] = 0;

    const metadata: AuctionMetadata = {
      totalRounds: rounds,
      currentRound: 1,
      items,
      budgets,
      profits,
      roundBids: {},
      history: [],
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

    const meta = state.metadata as AuctionMetadata;
    if (meta.roundBids[move.playerId] !== undefined) return false; // Already bid this round

    const bidData = move.action as AuctionBid;
    if (bidData.bid < 0) return false;
    if (bidData.bid > meta.budgets[move.playerId]) return false;

    return true;
  }

  processMove(state: GameState, move: GameMove): GameState {
    const newState = { ...state, moves: [...state.moves, move] };
    const meta = { ...(state.metadata as AuctionMetadata) };
    meta.roundBids = { ...meta.roundBids };
    meta.budgets = { ...meta.budgets };
    meta.profits = { ...meta.profits };
    meta.history = [...meta.history];
    newState.metadata = meta;

    const bidData = move.action as AuctionBid;
    meta.roundBids[move.playerId] = bidData.bid;

    // Check if both players bid
    if (Object.keys(meta.roundBids).length === 2) {
      this.resolveRound(newState, meta);
    }

    return newState;
  }

  private resolveRound(state: GameState, meta: AuctionMetadata) {
    const p1 = state.players[0];
    const p2 = state.players[1];
    const bid1 = meta.roundBids[p1];
    const bid2 = meta.roundBids[p2];
    const item = meta.items[meta.currentRound - 1];

    let roundWinner: string | null = null;
    let roundProfit = 0;

    if (bid1 > bid2) {
      roundWinner = p1;
      roundProfit = item.actualValue - bid1;
      meta.budgets[p1] -= bid1;
      meta.profits[p1] += roundProfit;
    } else if (bid2 > bid1) {
      roundWinner = p2;
      roundProfit = item.actualValue - bid2;
      meta.budgets[p2] -= bid2;
      meta.profits[p2] += roundProfit;
    }
    // Tie = no winner, no one pays

    meta.history.push({
      round: meta.currentRound,
      item,
      bids: { [p1]: bid1, [p2]: bid2 },
      winner: roundWinner,
      profit: roundProfit,
    });

    meta.roundBids = {};

    if (meta.currentRound >= meta.totalRounds) {
      // Game over
      state.status = 'completed';
      if (meta.profits[p1] > meta.profits[p2]) {
        state.winner = p1;
      } else if (meta.profits[p2] > meta.profits[p1]) {
        state.winner = p2;
      } else {
        state.winner = 'draw';
      }
    } else {
      meta.currentRound++;
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
