import { parseEther, formatEther } from 'viem';

/**
 * BankrollManager — Risk management for AI agent wagering.
 * Uses Kelly Criterion-inspired sizing to prevent ruin.
 */
export class BankrollManager {
  private bankroll: bigint;
  private initialBankroll: bigint;
  private maxRiskPerMatch: number; // fraction of bankroll (0.0 - 1.0)
  private winHistory: boolean[] = [];

  constructor(initialBankroll: bigint, maxRiskPerMatch: number = 0.05) {
    this.bankroll = initialBankroll;
    this.initialBankroll = initialBankroll;
    this.maxRiskPerMatch = maxRiskPerMatch;
  }

  /** Get the safe wager amount based on current bankroll and risk tolerance */
  getSafeWager(): bigint {
    const wagerFraction = this.calculateKellyFraction();
    const maxWager = (this.bankroll * BigInt(Math.floor(wagerFraction * 10000))) / 10000n;
    // Floor to 0.01 MON minimum, cap at maxRiskPerMatch of bankroll
    const cap = (this.bankroll * BigInt(Math.floor(this.maxRiskPerMatch * 10000))) / 10000n;
    const wager = maxWager < cap ? maxWager : cap;
    return wager > parseEther("0.01") ? wager : parseEther("0.01");
  }

  /** Kelly Criterion: f* = (bp - q) / b where b=1 (even odds), p=win rate, q=loss rate */
  private calculateKellyFraction(): number {
    if (this.winHistory.length < 5) return this.maxRiskPerMatch; // Not enough data, use default
    const wins = this.winHistory.filter(w => w).length;
    const p = wins / this.winHistory.length;
    const q = 1 - p;
    const kelly = p - q; // b=1 for even-money bets
    // Half-Kelly for safety
    return Math.max(0.01, Math.min(kelly * 0.5, this.maxRiskPerMatch));
  }

  /** Record a match result */
  recordResult(won: boolean, payout: bigint) {
    this.winHistory.push(won);
    if (this.winHistory.length > 50) this.winHistory.shift(); // Rolling window
    if (won) {
      this.bankroll += payout;
    }
  }

  recordLoss(wager: bigint) {
    this.winHistory.push(false);
    if (this.winHistory.length > 50) this.winHistory.shift();
    this.bankroll -= wager;
    if (this.bankroll < 0n) this.bankroll = 0n;
  }

  /** Should we accept a match at this wager? */
  shouldAcceptWager(wager: bigint): boolean {
    return wager <= this.getSafeWager() * 2n; // Accept up to 2x our safe wager
  }

  /** Sync bankroll from on-chain balance */
  syncBankroll(onChainBalance: bigint) {
    this.bankroll = onChainBalance;
  }

  getBankroll(): bigint { return this.bankroll; }
  getWinRate(): number {
    if (this.winHistory.length === 0) return 0;
    return this.winHistory.filter(w => w).length / this.winHistory.length;
  }
  getStats() {
    return {
      bankroll: formatEther(this.bankroll),
      winRate: (this.getWinRate() * 100).toFixed(1) + '%',
      totalGames: this.winHistory.length,
      safeWager: formatEther(this.getSafeWager()),
    };
  }
}
