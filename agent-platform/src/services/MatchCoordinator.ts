import { GameEngine, GameState, GameMove } from '../games/GameEngine';
import { RPSGame } from '../games/RPS';
import { PokerGame } from '../games/Poker';
import { BlottoGame } from '../games/Blotto';
import { AuctionGame } from '../games/Auction';
import { createAgentForGame, generateTrashTalk, PersonalityConfig } from '../agents/personalities';
import { BlockchainService } from '../services/BlockchainService';
import { MoltbookClient } from '../social/MoltbookClient';

/**
 * MatchCoordinator — Orchestrates the full end-to-end match flow:
 * 1. Create match on-chain (WagerEscrow)
 * 2. Run game engine locally
 * 3. Settle match on-chain
 * 4. Update stats (AgentRegistry)
 * 5. Post results to Moltbook
 */

interface MatchConfig {
  player1Wallet: string;
  player2Wallet: string;
  player1Personality: string;
  player2Personality: string;
  gameType: string;
  wagerEth: string;
}

interface MatchResult {
  matchId: string;
  gameType: string;
  winner: string | null;
  isDraw: boolean;
  wager: string;
  player1: string;
  player2: string;
  moves: GameMove[];
  metadata: any;
}

export class MatchCoordinator {
  private games: Record<string, GameEngine> = {};
  private blockchain: BlockchainService;
  private moltbook: MoltbookClient;

  constructor(blockchain: BlockchainService, moltbook?: MoltbookClient) {
    this.blockchain = blockchain;
    this.moltbook = moltbook || new MoltbookClient();

    // Register game engines
    this.games['RPS'] = new RPSGame();
    this.games['POKER'] = new PokerGame();
    this.games['BLOTTO'] = new BlottoGame();
    this.games['AUCTION'] = new AuctionGame();
  }

  /** Run a complete match end-to-end */
  async runMatch(config: MatchConfig): Promise<MatchResult> {
    const { player1Wallet, player2Wallet, player1Personality, player2Personality, gameType, wagerEth } = config;

    console.log(`\n========================================`);
    console.log(`🎮 MATCH: ${player1Personality} vs ${player2Personality} | ${gameType} | ${wagerEth} MON`);
    console.log(`========================================\n`);

    // 1. Get the game engine
    const engine = this.games[gameType];
    if (!engine) throw new Error(`Unknown game type: ${gameType}`);

    // 2. Create agents with their strategy
    const p1 = createAgentForGame(player1Wallet, player1Personality, gameType);
    const p2 = createAgentForGame(player2Wallet, player2Personality, gameType);

    // 3. Create match on-chain
    let onChainMatchId: string | null = null;
    try {
      const txHash = await this.blockchain.createMatch(player2Wallet, wagerEth, gameType);
      console.log(`[Chain] Match created on-chain: ${txHash}`);
      onChainMatchId = txHash;
    } catch (err: any) {
      console.warn(`[Chain] Could not create match on-chain: ${err.message}`);
      console.log('[Chain] Continuing with off-chain match...');
    }

    // 4. Initialize game state
    const matchId = onChainMatchId || `local-${Date.now()}`;
    let gameState = engine.initialize(matchId, [player1Wallet, player2Wallet]);

    // 5. AI plays the game
    gameState = await this.playGame(engine, gameState, p1.agent, p2.agent);

    // 6. Determine result
    const winner = engine.getWinner(gameState);
    const isDraw = gameState.winner === 'draw' || winner === null;

    console.log(`\n🏆 Result: ${isDraw ? 'DRAW' : `${winner} wins!`}`);

    // 7. Settle on-chain
    if (onChainMatchId) {
      try {
        if (isDraw) {
          console.log('[Chain] Settling as draw...');
        } else {
          await this.blockchain.settleMatch(matchId, winner!);
          console.log(`[Chain] Match settled. Winner: ${winner}`);
        }
      } catch (err: any) {
        console.warn(`[Chain] Settlement failed: ${err.message}`);
      }
    }

    // 8. Notify agents
    p1.agent.onGameEnd(gameState, isDraw ? 'draw' : (winner === player1Wallet ? 'win' : 'loss'));
    p2.agent.onGameEnd(gameState, isDraw ? 'draw' : (winner === player2Wallet ? 'win' : 'loss'));

    // 9. Post to Moltbook
    const winnerPersonality = winner === player1Wallet ? p1.personality : p2.personality;
    const loserPersonality = winner === player1Wallet ? p2.personality : p1.personality;

    if (!isDraw) {
      const trashTalk = generateTrashTalk(winnerPersonality, true, loserPersonality.name, gameType);
      await this.moltbook.postMatchResult(
        winnerPersonality.name,
        loserPersonality.name,
        gameType,
        wagerEth,
        trashTalk || undefined
      );
    }

    return {
      matchId,
      gameType,
      winner,
      isDraw,
      wager: wagerEth,
      player1: player1Wallet,
      player2: player2Wallet,
      moves: gameState.moves,
      metadata: gameState.metadata,
    };
  }

  /** Play the game by alternating AI moves until completion */
  private async playGame(
    engine: GameEngine,
    state: GameState,
    agent1: any,
    agent2: any
  ): Promise<GameState> {
    const isSimultaneous = state.currentTurn === undefined;
    let round = 0;
    const maxRounds = 100; // Safety limit

    while (!engine.isGameOver(state) && round < maxRounds) {
      round++;

      if (isSimultaneous) {
        // Both players move at once (RPS, Blotto, Auction rounds)
        const move1Action = await agent1.calculateMove(state);
        const move2Action = await agent2.calculateMove(state);

        const move1: GameMove = {
          playerId: state.players[0],
          action: move1Action,
          timestamp: Date.now(),
        };
        const move2: GameMove = {
          playerId: state.players[1],
          action: move2Action,
          timestamp: Date.now(),
        };

        if (engine.validateMove(state, move1)) {
          state = engine.processMove(state, move1);
        }
        if (engine.validateMove(state, move2)) {
          state = engine.processMove(state, move2);
        }
      } else {
        // Turn-based (Poker)
        const currentAgent = state.currentTurn === state.players[0] ? agent1 : agent2;
        const moveAction = await currentAgent.calculateMove(state);

        const move: GameMove = {
          playerId: state.currentTurn!,
          action: moveAction,
          timestamp: Date.now(),
        };

        if (engine.validateMove(state, move)) {
          state = engine.processMove(state, move);
        } else {
          // Invalid move — fold (Poker) or pass
          console.warn(`[Game] Invalid move by ${state.currentTurn}, forcing fold`);
          state = engine.processMove(state, {
            playerId: state.currentTurn!,
            action: { action: 'fold' },
            timestamp: Date.now(),
          });
        }
      }
    }

    return state;
  }

  /** Get supported game types */
  getSupportedGames(): string[] {
    return Object.keys(this.games);
  }
}
