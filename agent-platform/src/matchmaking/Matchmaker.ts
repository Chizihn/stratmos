import { GameEngine } from '../games/GameEngine';

interface QueueItem {
  playerId: string; // Wallet address
  wager: string;    // Wager amount in string (to avoid BigInt serialization issues initially)
  gameType: string;
  timestamp: number;
}

export class Matchmaker {
  private queue: QueueItem[] = [];
  
  addToQueue(playerId: string, wager: string, gameType: string) {
    console.log(`[Matchmaker] Adding ${playerId} to queue for ${gameType} (${wager} MON)`);
    this.queue.push({ 
      playerId, 
      wager, 
      gameType, 
      timestamp: Date.now() 
    });
    
    return this.tryMatch();
  }
  
  removeFromQueue(playerId: string) {
    this.queue = this.queue.filter(item => item.playerId !== playerId);
  }
  
  private tryMatch(): { players: string[], wager: string, gameType: string } | null {
    // Simple matching: find 2 players with same gameType and wager
    // In production, we'd use ranges for wagers and ELO bucketing
    
    if (this.queue.length < 2) return null;
    
    // Group by gameType and wager
    const groups: Record<string, QueueItem[]> = {};
    
    for (const item of this.queue) {
      const key = `${item.gameType}-${item.wager}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      
      if (groups[key].length >= 2) {
        // Match found!
        const player1 = groups[key][0];
        const player2 = groups[key][1];
        
        // Remove from queue
        this.removeFromQueue(player1.playerId);
        this.removeFromQueue(player2.playerId);
        
        console.log(`[Matchmaker] Match found: ${player1.playerId} vs ${player2.playerId}`);
        
        return {
          players: [player1.playerId, player2.playerId],
          wager: player1.wager,
          gameType: player1.gameType
        };
      }
    }
    
    return null;
  }
}
