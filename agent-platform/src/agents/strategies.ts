import { Agent, AgentConfig } from './Agent';
import { GameState, GameMove } from '../games/GameEngine';
import { PokerMoveData } from '../games/Poker';
import { BlottoAllocation } from '../games/Blotto';
import { AuctionBid } from '../games/Auction';

// --- RPS Strategies ---

/** Frequency analysis: tracks opponent patterns and counter-picks */
export class FrequencyRPSAgent extends Agent {
  private opponentMoves: string[] = [];
  private readonly RANDOMNESS = 0.2;

  async calculateMove(gameState: GameState): Promise<any> {
    // 20% random to prevent exploitation
    if (Math.random() < this.RANDOMNESS) {
      return ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
    }

    if (this.opponentMoves.length === 0) {
      return ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
    }

    // Count opponent's move frequencies
    const counts = { rock: 0, paper: 0, scissors: 0 };
    const recent = this.opponentMoves.slice(-10); // Last 10 moves
    for (const m of recent) {
      counts[m as keyof typeof counts]++;
    }

    // Predict opponent's most likely move and counter it
    const predicted = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const counterMap: Record<string, string> = {
      rock: 'paper', paper: 'scissors', scissors: 'rock'
    };
    return counterMap[predicted];
  }

  onGameEnd(gameState: GameState, result: string): void {
    // Record opponent's move for learning
    const opponent = gameState.players.find(p => p !== this.id);
    const opponentMove = gameState.moves.find(m => m.playerId === opponent);
    if (opponentMove) this.opponentMoves.push(opponentMove.action);
    super.onGameEnd(gameState, result);
  }
}

/** Meta-game counter: tries to predict what the opponent will predict */
export class MetaRPSAgent extends Agent {
  private opponentMoves: string[] = [];
  private myMoves: string[] = [];

  async calculateMove(gameState: GameState): Promise<any> {
    if (this.opponentMoves.length < 3) {
      return ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
    }

    // Detect if opponent is countering our most frequent move
    const myCounts = { rock: 0, paper: 0, scissors: 0 };
    for (const m of this.myMoves.slice(-5)) {
      myCounts[m as keyof typeof myCounts]++;
    }
    const myMostFrequent = Object.entries(myCounts).sort((a, b) => b[1] - a[1])[0][0];
    
    // If opponent might be countering our frequent move, go one level deeper
    const counterMap: Record<string, string> = {
      rock: 'paper', paper: 'scissors', scissors: 'rock'
    };
    const theyMightPlay = counterMap[myMostFrequent]; // Counter to our frequent
    const wePlay = counterMap[theyMightPlay]; // Counter to their counter
    
    // Add randomness
    if (Math.random() < 0.25) {
      return ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
    }
    return wePlay;
  }

  onGameEnd(gameState: GameState, result: string): void {
    const opponent = gameState.players.find(p => p !== this.id);
    const opponentMove = gameState.moves.find(m => m.playerId === opponent);
    const myMove = gameState.moves.find(m => m.playerId === this.id);
    if (opponentMove) this.opponentMoves.push(opponentMove.action);
    if (myMove) this.myMoves.push(myMove.action);
    super.onGameEnd(gameState, result);
  }
}

// --- Poker Strategies ---

/** Aggressive poker player — raises often, bluffs frequently */
export class AggressivePokerAgent extends Agent {
  async calculateMove(gameState: GameState): Promise<PokerMoveData> {
    const meta = gameState.metadata as any;
    const myCards = meta.hands?.[this.id] || [];
    const community = meta.community || [];
    const myStack = meta.stacks?.[this.id] || 0;
    const pot = meta.pot || 0;

    // Simple hand strength (high cards = strength)
    const handStrength = this.evaluateHandStrength(myCards, community);

    // Aggressive: raise with any decent hand, bluff 30% of the time
    if (handStrength > 0.6 || Math.random() < 0.3) {
      const raiseAmount = Math.max(20, Math.floor(pot * 0.6));
      return { action: 'raise', amount: Math.min(raiseAmount, myStack) };
    }

    if (handStrength > 0.3) {
      return { action: 'call' };
    }

    // Fold weak hands (but only 70% of the time — some bluffing)
    if (Math.random() < 0.15) {
      return { action: 'raise', amount: Math.floor(pot * 0.5) };
    }
    return { action: 'fold' };
  }

  private evaluateHandStrength(holeCards: any[], community: any[]): number {
    if (!holeCards.length) return 0.3;
    const values = holeCards.map((c: any) => c.value || 0);
    const maxVal = Math.max(...values);
    const paired = values[0] === values[1];
    let strength = maxVal / 14;
    if (paired) strength += 0.3;
    if (values[0] + values[1] > 20) strength += 0.15;
    return Math.min(1, strength);
  }
}

/** Calculated poker player — GTO-inspired, pot-odds-aware */
export class CalculatedPokerAgent extends Agent {
  async calculateMove(gameState: GameState): Promise<PokerMoveData> {
    const meta = gameState.metadata as any;
    const myCards = meta.hands?.[this.id] || [];
    const community = meta.community || [];
    const myStack = meta.stacks?.[this.id] || 0;
    const pot = meta.pot || 0;
    const opponentId = gameState.players.find(p => p !== this.id)!;
    const opponentBet = meta.bets?.[opponentId] || 0;
    const myBet = meta.bets?.[this.id] || 0;
    const toCall = opponentBet - myBet;

    const handStrength = this.evaluateHandStrength(myCards, community);
    const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

    // Only call if hand strength justifies the pot odds
    if (toCall > 0 && handStrength < potOdds) {
      return { action: 'fold' };
    }

    // Strong hand — raise for value
    if (handStrength > 0.7) {
      const raiseAmount = Math.floor(pot * 0.5);
      return { action: 'raise', amount: Math.min(raiseAmount, myStack) };
    }

    // Medium hand — check or call
    if (toCall > 0) return { action: 'call' };
    return { action: 'check' };
  }

  private evaluateHandStrength(holeCards: any[], community: any[]): number {
    if (!holeCards.length) return 0.3;
    const values = holeCards.map((c: any) => c.value || 0);
    const maxVal = Math.max(...values);
    const paired = values[0] === values[1];
    let strength = maxVal / 14;
    if (paired) strength += 0.35;
    if (values[0] + values[1] > 20) strength += 0.1;
    if (community.length > 0) {
      const communityValues = community.map((c: any) => c.value || 0);
      for (const v of values) {
        if (communityValues.includes(v)) strength += 0.2; // Paired with board
      }
    }
    return Math.min(1, strength);
  }
}

// --- Blotto Strategies ---

/** Nash-equilibrium-inspired Blotto — mixed strategies */
export class NashBlottoAgent extends Agent {
  async calculateMove(gameState: GameState): Promise<BlottoAllocation> {
    const meta = gameState.metadata as any;
    const total = meta.totalTokens || 100;
    const fields = meta.numBattlefields || 5;

    // Generate a random allocation with bias towards concentration
    const allocation = new Array(fields).fill(0);
    let remaining = total;

    for (let i = 0; i < fields - 1; i++) {
      // Concentrate forces on random subsets
      const maxForThis = Math.min(remaining, Math.floor(total * 0.4));
      allocation[i] = Math.floor(Math.random() * maxForThis);
      remaining -= allocation[i];
    }
    allocation[fields - 1] = remaining;

    // Shuffle to randomize which fields get concentration
    for (let i = allocation.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allocation[i], allocation[j]] = [allocation[j], allocation[i]];
    }

    return { battlefields: allocation };
  }
}

/** Adaptive Blotto — learns opponent patterns */
export class AdaptiveBlottoAgent extends Agent {
  private opponentAllocations: number[][] = [];

  async calculateMove(gameState: GameState): Promise<BlottoAllocation> {
    const meta = gameState.metadata as any;
    const total = meta.totalTokens || 100;
    const fields = meta.numBattlefields || 5;

    if (this.opponentAllocations.length < 2) {
      // Not enough data: use balanced spread
      const base = Math.floor(total / fields);
      const allocation = new Array(fields).fill(base);
      allocation[0] += total - base * fields; // Give remainder to first field
      return { battlefields: allocation };
    }

    // Analyze opponent's weak fields and attack them
    const avgOpponent = new Array(fields).fill(0);
    for (const alloc of this.opponentAllocations) {
      for (let i = 0; i < fields; i++) {
        avgOpponent[i] += alloc[i];
      }
    }
    for (let i = 0; i < fields; i++) {
      avgOpponent[i] /= this.opponentAllocations.length;
    }

    // Find the 3 weakest opponent fields and concentrate there
    const indexed = avgOpponent.map((v, i) => ({ field: i, avg: v }));
    indexed.sort((a, b) => a.avg - b.avg); // Weakest first

    const allocation = new Array(fields).fill(0);
    let remaining = total;
    const targetFields = Math.ceil(fields / 2) + 1; // Win majority + 1

    for (let i = 0; i < targetFields && i < indexed.length; i++) {
      const deploy = Math.floor(remaining / (targetFields - i));
      allocation[indexed[i].field] = deploy;
      remaining -= deploy;
    }
    // Spread remaining
    for (let i = targetFields; i < indexed.length && remaining > 0; i++) {
      allocation[indexed[i].field] = remaining;
      remaining = 0;
    }

    return { battlefields: allocation };
  }

  onGameEnd(gameState: GameState, result: string): void {
    const meta = gameState.metadata as any;
    const opponent = gameState.players.find(p => p !== this.id)!;
    if (meta.allocations?.[opponent]) {
      this.opponentAllocations.push(meta.allocations[opponent]);
    }
    super.onGameEnd(gameState, result);
  }
}

// --- Auction Strategies ---

/** Value-based bidder — estimates true value and bids conservatively */
export class ValueAuctionAgent extends Agent {
  async calculateMove(gameState: GameState): Promise<AuctionBid> {
    const meta = gameState.metadata as any;
    const currentItem = meta.items?.[meta.currentRound - 1];
    const myBudget = meta.budgets?.[this.id] || 0;
    const roundsLeft = meta.totalRounds - meta.currentRound + 1;

    if (!currentItem) return { bid: 0 };

    const [minVal, maxVal] = currentItem.estimatedRange;
    const estimatedValue = (minVal + maxVal) / 2;
    
    // Budget management: save budget for later rounds
    const budgetPerRound = myBudget / roundsLeft;
    const maxBid = Math.min(budgetPerRound * 1.5, myBudget * 0.3);

    // Only bid if expected profit is positive
    const safeBid = Math.min(estimatedValue * 0.7, maxBid);
    return { bid: Math.max(0, Math.floor(safeBid)) };
  }
}

/** Aggressive bidder — overbids to dominate */
export class AggressiveAuctionAgent extends Agent {
  async calculateMove(gameState: GameState): Promise<AuctionBid> {
    const meta = gameState.metadata as any;
    const currentItem = meta.items?.[meta.currentRound - 1];
    const myBudget = meta.budgets?.[this.id] || 0;

    if (!currentItem) return { bid: 0 };

    const [minVal, maxVal] = currentItem.estimatedRange;
    const estimatedValue = (minVal + maxVal) / 2;

    // Bid aggressively — close to estimated value
    const aggBid = Math.floor(estimatedValue * 0.85);
    return { bid: Math.min(aggBid, myBudget) };
  }
}

// Legacy exports for backward compat
export class RandomRPSAgent extends Agent {
  async calculateMove(_gameState: GameState): Promise<any> {
    return ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
  }
}

export class PatternRPSAgent extends Agent {
  async calculateMove(_gameState: GameState): Promise<any> {
    const roll = Math.random();
    if (roll < 0.5) return 'rock';
    if (roll < 0.75) return 'paper';
    return 'scissors';
  }
}
