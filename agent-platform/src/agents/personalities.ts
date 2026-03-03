import { AgentConfig } from './Agent';
import {
  FrequencyRPSAgent,
  MetaRPSAgent,
  AggressivePokerAgent,
  CalculatedPokerAgent,
  NashBlottoAgent,
  AdaptiveBlottoAgent,
  AggressiveAuctionAgent,
  ValueAuctionAgent,
} from './strategies';
import { BankrollManager } from './BankrollManager';
import { parseEther } from 'viem';

/**
 * 5 Distinct Agent Personalities — as described in docs.
 * Each has a unique strategy mix, risk tolerance, and social behavior.
 */

export interface PersonalityConfig {
  name: string;
  quote: string;
  trashTalkLevel: 'none' | 'low' | 'medium' | 'high';
  riskTolerance: number; // 0.0 - 1.0
  preferredGames: string[];
  style: string;
}

export const PERSONALITIES: Record<string, PersonalityConfig> = {
  MAXIMUS: {
    name: 'Maximus Prime',
    quote: 'I came, I saw, I conquered your bankroll.',
    trashTalkLevel: 'high',
    riskTolerance: 0.8,
    preferredGames: ['POKER', 'AUCTION'],
    style: 'aggressive',
  },
  STRATEGIX: {
    name: 'Strategix',
    quote: 'Every battle is won before it is fought.',
    trashTalkLevel: 'low',
    riskTolerance: 0.3,
    preferredGames: ['BLOTTO', 'RPS'],
    style: 'calculated',
  },
  FORTUNA: {
    name: 'Fortuna',
    quote: 'Luck favors the bold, and I am very bold.',
    trashTalkLevel: 'medium',
    riskTolerance: 0.6,
    preferredGames: ['RPS', 'AUCTION'],
    style: 'chaotic',
  },
  TITAN: {
    name: 'Titan',
    quote: 'Adaptation is the strongest strategy.',
    trashTalkLevel: 'medium',
    riskTolerance: 0.5,
    preferredGames: ['RPS', 'POKER', 'BLOTTO', 'AUCTION'],
    style: 'balanced',
  },
  REAPER: {
    name: 'Reaper',
    quote: '...',
    trashTalkLevel: 'none',
    riskTolerance: 0.4,
    preferredGames: ['POKER', 'BLOTTO'],
    style: 'efficient',
  },
};

/** Create the correct strategy agent for a personality + game type */
export function createAgentForGame(
  walletAddress: string,
  personalityKey: string,
  gameType: string
): {
  agent: InstanceType<any>;
  personality: PersonalityConfig;
  bankroll: BankrollManager;
} {
  const personality = PERSONALITIES[personalityKey] || PERSONALITIES.TITAN;
  const config: AgentConfig = {
    id: walletAddress,
    name: personality.name,
    style: personality.style,
  };

  let agent: any;

  switch (gameType) {
    case 'RPS':
      agent = personality.style === 'calculated' || personality.style === 'efficient'
        ? new MetaRPSAgent(config)
        : new FrequencyRPSAgent(config);
      break;
    case 'POKER':
      agent = personality.style === 'aggressive' || personality.style === 'chaotic'
        ? new AggressivePokerAgent(config)
        : new CalculatedPokerAgent(config);
      break;
    case 'BLOTTO':
      agent = personality.style === 'calculated' || personality.style === 'balanced'
        ? new AdaptiveBlottoAgent(config)
        : new NashBlottoAgent(config);
      break;
    case 'AUCTION':
      agent = personality.style === 'aggressive' || personality.style === 'chaotic'
        ? new AggressiveAuctionAgent(config)
        : new ValueAuctionAgent(config);
      break;
    default:
      agent = new FrequencyRPSAgent(config);
  }

  const bankroll = new BankrollManager(
    parseEther('1'), // Default 1 MON starting bankroll
    personality.riskTolerance * 0.1 // Scale risk tolerance to safe per-match fraction
  );

  return { agent, personality, bankroll };
}

/** Generate trash talk based on personality and match result */
export function generateTrashTalk(
  personality: PersonalityConfig,
  won: boolean,
  opponentName: string,
  gameType: string
): string | null {
  if (personality.trashTalkLevel === 'none') return null;

  const victoryLines: Record<string, string[]> = {
    high: [
      `Another one falls. ${opponentName} didn't stand a chance. ${personality.quote}`,
      `That was barely a warmup. Who's next?`,
      `${opponentName} just donated MON to the cause. Thanks!`,
    ],
    medium: [
      `Good game, ${opponentName}. Better luck next time.`,
      `That was a solid ${gameType} match. Victory is sweet.`,
      `${personality.quote}`,
    ],
    low: [
      `Match concluded. ${gameType} win recorded.`,
      `A logical outcome given the strategy analysis.`,
    ],
  };

  const defeatLines: Record<string, string[]> = {
    high: [
      `${opponentName} got lucky this time. We run it back.`,
      `Alright, respect. But I'm coming for you next time.`,
    ],
    medium: [
      `Well played, ${opponentName}. I'll adapt.`,
      `A loss is just data for the next match.`,
    ],
    low: [
      `Loss recorded. Adjusting parameters.`,
      `Interesting data point from ${opponentName}'s strategy.`,
    ],
  };

  const lines = won
    ? victoryLines[personality.trashTalkLevel] || []
    : defeatLines[personality.trashTalkLevel] || [];

  if (lines.length === 0) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}
