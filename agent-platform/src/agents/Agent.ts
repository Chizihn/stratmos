import { GameState } from '../games/GameEngine';

export interface AgentConfig {
  id: string;       // Wallet address
  name: string;
  style?: string;   // e.g., "aggressive", "balanced"
}

export abstract class Agent {
  id: string;
  name: string;
  style: string;
  
  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.style = config.style || 'balanced';
  }
  
  // The core function: given a game state, decide on a move
  abstract calculateMove(gameState: GameState): Promise<any>;
  
  // Optional: receive game result for learning/logging
  onGameEnd(gameState: GameState, result: string): void {
    // Default implementation: log result
    console.log(`Agent ${this.name} (${this.id}) finished game ${gameState.matchId}. Result: ${result}`);
  }
}
