import { GameEngine, GameState, GameMove } from './GameEngine';

// --- Card Definitions ---
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'] as const;
type Suit = typeof SUITS[number];
type Rank = typeof RANKS[number];

export interface Card {
  rank: Rank;
  suit: Suit;
  value: number; // 2-14
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let i = 0; i < RANKS.length; i++) {
      deck.push({ rank: RANKS[i], suit, value: i + 2 });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// --- Hand Evaluation ---
export enum HandRank {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9,
}

export interface HandResult {
  rank: HandRank;
  highCards: number[];
  name: string;
}

function evaluateHand(cards: Card[]): HandResult {
  // Get best 5-card hand from 7 cards
  const combos = getCombinations(cards, 5);
  let best: HandResult = { rank: HandRank.HighCard, highCards: [0], name: 'High Card' };

  for (const combo of combos) {
    const result = evaluate5Cards(combo);
    if (result.rank > best.rank || 
        (result.rank === best.rank && compareHighCards(result.highCards, best.highCards) > 0)) {
      best = result;
    }
  }
  return best;
}

function getCombinations(arr: Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map(combo => [first, ...combo]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluate5Cards(cards: Card[]): HandResult {
  const values = cards.map(c => c.value).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(values);
  
  const counts: Record<number, number> = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]));

  if (isFlush && isStraight && values[0] === 14) return { rank: HandRank.RoyalFlush, highCards: values, name: 'Royal Flush' };
  if (isFlush && isStraight) return { rank: HandRank.StraightFlush, highCards: values, name: 'Straight Flush' };
  if (groups[0][1] === 4) return { rank: HandRank.FourOfAKind, highCards: [Number(groups[0][0])], name: 'Four of a Kind' };
  if (groups[0][1] === 3 && groups[1][1] === 2) return { rank: HandRank.FullHouse, highCards: [Number(groups[0][0]), Number(groups[1][0])], name: 'Full House' };
  if (isFlush) return { rank: HandRank.Flush, highCards: values, name: 'Flush' };
  if (isStraight) return { rank: HandRank.Straight, highCards: values, name: 'Straight' };
  if (groups[0][1] === 3) return { rank: HandRank.ThreeOfAKind, highCards: [Number(groups[0][0])], name: 'Three of a Kind' };
  if (groups[0][1] === 2 && groups[1][1] === 2) return { rank: HandRank.TwoPair, highCards: [Number(groups[0][0]), Number(groups[1][0])], name: 'Two Pair' };
  if (groups[0][1] === 2) return { rank: HandRank.Pair, highCards: [Number(groups[0][0])], name: 'Pair' };
  return { rank: HandRank.HighCard, highCards: values, name: 'High Card' };
}

function checkStraight(values: number[]): boolean {
  const sorted = [...new Set(values)].sort((a, b) => b - a);
  if (sorted.length < 5) return false;
  // Check normal straight
  if (sorted[0] - sorted[4] === 4) return true;
  // Check wheel (A-2-3-4-5)
  if (sorted[0] === 14 && sorted[1] === 5 && sorted[2] === 4 && sorted[3] === 3 && sorted[4] === 2) return true;
  return false;
}

function compareHighCards(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// --- Poker Game Engine ---
export type PokerAction = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface PokerMoveData {
  action: PokerAction;
  amount?: number; // For raise
}

export interface PokerMetadata {
  deck: Card[];
  hands: Record<string, Card[]>; // player -> hole cards
  community: Card[];
  pot: number;
  bets: Record<string, number>; // current round bets
  stacks: Record<string, number>;
  round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  dealerIndex: number;
  lastAction?: string;
  foldedPlayers: string[];
  initialStacks: number;
}

export class PokerGame implements GameEngine {
  gameType = "POKER";
  private startingStack = 1000; // Chips

  initialize(matchId: string, players: string[], config?: any): GameState {
    if (players.length !== 2) throw new Error("Poker heads-up requires exactly 2 players");

    const stack = config?.startingStack || this.startingStack;
    let deck = shuffleDeck(createDeck());

    // Deal hole cards
    const hands: Record<string, Card[]> = {};
    hands[players[0]] = [deck.pop()!, deck.pop()!];
    hands[players[1]] = [deck.pop()!, deck.pop()!];

    const stacks: Record<string, number> = {};
    stacks[players[0]] = stack;
    stacks[players[1]] = stack;

    // Post blinds (small=5, big=10)
    stacks[players[0]] -= 5;
    stacks[players[1]] -= 10;

    const bets: Record<string, number> = {};
    bets[players[0]] = 5;
    bets[players[1]] = 10;

    const metadata: PokerMetadata = {
      deck,
      hands,
      community: [],
      pot: 15,
      bets,
      stacks,
      round: 'preflop',
      dealerIndex: 0,
      foldedPlayers: [],
      initialStacks: stack,
    };

    return {
      matchId,
      gameType: this.gameType,
      players,
      moves: [],
      status: 'active',
      currentTurn: players[0], // SB acts first preflop
      metadata,
    };
  }

  validateMove(state: GameState, move: GameMove): boolean {
    if (state.status !== 'active') return false;
    if (move.playerId !== state.currentTurn) return false;
    const meta = state.metadata as PokerMetadata;
    if (meta.foldedPlayers.includes(move.playerId)) return false;
    
    const data = move.action as PokerMoveData;
    const validActions: PokerAction[] = ['fold', 'check', 'call', 'raise', 'allin'];
    return validActions.includes(data.action);
  }

  processMove(state: GameState, move: GameMove): GameState {
    const newState = { ...state, moves: [...state.moves, move] };
    const meta = { ...(state.metadata as PokerMetadata) };
    newState.metadata = meta;

    const data = move.action as PokerMoveData;
    const player = move.playerId;
    const opponent = state.players.find(p => p !== player)!;

    switch (data.action) {
      case 'fold':
        meta.foldedPlayers.push(player);
        newState.status = 'completed';
        newState.winner = opponent;
        return newState;
      
      case 'check':
        break;

      case 'call': {
        const toCall = (meta.bets[opponent] || 0) - (meta.bets[player] || 0);
        const callAmount = Math.min(toCall, meta.stacks[player]);
        meta.stacks[player] -= callAmount;
        meta.bets[player] = (meta.bets[player] || 0) + callAmount;
        meta.pot += callAmount;
        break;
      }
      
      case 'raise': {
        const raiseAmount = data.amount || 20;
        const toCall = (meta.bets[opponent] || 0) - (meta.bets[player] || 0);
        const totalBet = toCall + raiseAmount;
        const actual = Math.min(totalBet, meta.stacks[player]);
        meta.stacks[player] -= actual;
        meta.bets[player] = (meta.bets[player] || 0) + actual;
        meta.pot += actual;
        break;
      }

      case 'allin': {
        const allInAmount = meta.stacks[player];
        meta.bets[player] = (meta.bets[player] || 0) + allInAmount;
        meta.pot += allInAmount;
        meta.stacks[player] = 0;
        break;
      }
    }

    // Check if betting round is complete (both bets equal or someone is all-in)
    const betsEqual = meta.bets[state.players[0]] === meta.bets[state.players[1]];
    const someoneAllIn = meta.stacks[state.players[0]] === 0 || meta.stacks[state.players[1]] === 0;
    
    if ((betsEqual && data.action !== 'raise') || someoneAllIn) {
      // Advance to next round
      this.advanceRound(newState, meta);
    } else {
      // Next player's turn
      newState.currentTurn = opponent;
    }

    return newState;
  }

  private advanceRound(state: GameState, meta: PokerMetadata) {
    // Reset bets
    meta.bets = {};
    meta.bets[state.players[0]] = 0;
    meta.bets[state.players[1]] = 0;

    switch (meta.round) {
      case 'preflop':
        meta.round = 'flop';
        meta.community.push(meta.deck.pop()!, meta.deck.pop()!, meta.deck.pop()!);
        state.currentTurn = state.players[1]; // BB acts first post-flop
        break;
      case 'flop':
        meta.round = 'turn';
        meta.community.push(meta.deck.pop()!);
        state.currentTurn = state.players[1];
        break;
      case 'turn':
        meta.round = 'river';
        meta.community.push(meta.deck.pop()!);
        state.currentTurn = state.players[1];
        break;
      case 'river':
        meta.round = 'showdown';
        this.resolveShowdown(state, meta);
        break;
    }
  }

  private resolveShowdown(state: GameState, meta: PokerMetadata) {
    state.status = 'completed';

    const hand1 = evaluateHand([...meta.hands[state.players[0]], ...meta.community]);
    const hand2 = evaluateHand([...meta.hands[state.players[1]], ...meta.community]);

    meta.lastAction = `Showdown: ${state.players[0]}=${hand1.name} vs ${state.players[1]}=${hand2.name}`;

    if (hand1.rank > hand2.rank) {
      state.winner = state.players[0];
    } else if (hand2.rank > hand1.rank) {
      state.winner = state.players[1];
    } else {
      const cmp = compareHighCards(hand1.highCards, hand2.highCards);
      if (cmp > 0) state.winner = state.players[0];
      else if (cmp < 0) state.winner = state.players[1];
      else state.winner = 'draw';
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
