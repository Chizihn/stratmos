import { GameEngine, GameState, GameMove } from './GameEngine';

export class RPSGame implements GameEngine {
  gameType = "RPS";
  
  initialize(matchId: string, players: string[]): GameState {
    if (players.length !== 2) {
      throw new Error("RPS requires exactly 2 players");
    }
    
    return {
      matchId,
      gameType: this.gameType,
      players,
      moves: [],
      status: 'active',
      currentTurn: undefined, // Simultaneous moves
      winner: undefined
    };
  }
  
  validateMove(state: GameState, move: GameMove): boolean {
    if (state.status !== 'active') return false;
    if (!state.players.includes(move.playerId)) return false;
    
    // Check if player already moved
    const existingMove = state.moves.find(m => m.playerId === move.playerId);
    if (existingMove) return false;
    
    const validActions = ["rock", "paper", "scissors"];
    return validActions.includes(move.action.toLowerCase());
  }
  
  processMove(state: GameState, move: GameMove): GameState {
    const newState = { ...state };
    newState.moves = [...state.moves, move];
    
    // Check if both players moved
    if (this.isGameOver(newState)) {
       newState.status = 'completed';
       newState.winner = this.getWinner(newState) || "draw";
    }
    
    return newState;
  }
  
  isGameOver(state: GameState): boolean {
    return state.moves.length === 2;
  }
  
  getWinner(state: GameState): string | null {
    if (!this.isGameOver(state)) return null;
    
    const move1 = state.moves.find(m => m.playerId === state.players[0]);
    const move2 = state.moves.find(m => m.playerId === state.players[1]);
    
    if (!move1 || !move2) return null;
    
    const a1 = move1.action.toLowerCase();
    const a2 = move2.action.toLowerCase();
    
    if (a1 === a2) return null; // Draw
    
    if (
      (a1 === "rock" && a2 === "scissors") ||
      (a1 === "paper" && a2 === "rock") ||
      (a1 === "scissors" && a2 === "paper")
    ) {
      return state.players[0];
    }
    
    return state.players[1];
  }
}
