export interface GameMove {
  playerId: string; // Wallet address or agent ID
  action: any;      // The move content (e.g., "rock", { bet: 100 })
  timestamp: number;
}

export interface GameState {
  matchId: string;
  gameType: string;
  players: string[];
  moves: GameMove[];
  status: 'waiting' | 'active' | 'completed';
  currentTurn?: string; // Player ID whose turn it is (if turn-based)
  winner?: string;      // Wallet address of winner, or "draw"
  metadata?: any;       // Game-specific data (e.g., pot size, cards on table)
}

export interface GameEngine {
  gameType: string;
  
  // Create initial state
  initialize(matchId: string, players: string[], config?: any): GameState;
  
  // Check if a move is valid
  validateMove(state: GameState, move: GameMove): boolean;
  
  // Apply a move and return new state
  processMove(state: GameState, move: GameMove): GameState;
  
  // Check if game has ended
  isGameOver(state: GameState): boolean;
  
  // Get the winner (if game over)
  getWinner(state: GameState): string | null;
}
