import { publicClient, walletClient, account } from '../blockchain/client';
import { contracts } from '../blockchain/config';
import { parseEther, decodeEventLog } from 'viem';

export class BlockchainService {
  
  // Get agent's escrow balance
  async getEscrowBalance(address: string): Promise<bigint> {
    const balance = await publicClient.readContract({
      address: contracts.wagerEscrow.address,
      abi: contracts.wagerEscrow.abi,
      functionName: 'getBalance',
      args: [address as `0x${string}`]
    });
    return balance as bigint;
  }

  // Deposit funds into escrow
  async deposit(amountEth: string) {
    if (!walletClient || !account) throw new Error("Wallet not initialized");
    
    console.log(`[Blockchain] Depositing ${amountEth} MON into escrow...`);
    const hash = await walletClient.writeContract({
      address: contracts.wagerEscrow.address,
      abi: contracts.wagerEscrow.abi,
      functionName: 'deposit',
      account,
      value: parseEther(amountEth)
    });
    console.log(`[Blockchain] Deposit tx: ${hash}`);
    return hash;
  }
  
  // Create a match on-chain
  async createMatch(opponentRaw: string, wagerAmountEth: string, gameType: string) {
    if (!walletClient || !account) throw new Error("Wallet not initialized");
    
    const amount = parseEther(wagerAmountEth);
    const balance = await this.getEscrowBalance(account.address);
    
    if (balance < amount) {
      console.log(`[Blockchain] Insufficient escrow balance. Depositing...`);
      await this.deposit(wagerAmountEth);
      // Wait a bit for indexing (in a real app we'd wait for confirmation)
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`[Blockchain] Creating match vs ${opponentRaw} for ${wagerAmountEth} MON`);
    
    // Create 32-byte padded buffer for gameType
    const gameTypeBytes = Buffer.alloc(32);
    gameTypeBytes.write(gameType);
    const gameTypeHex = "0x" + gameTypeBytes.toString('hex');
    
    const hash = await walletClient.writeContract({
      address: contracts.wagerEscrow.address,
      abi: contracts.wagerEscrow.abi,
      functionName: 'createMatch',
      args: [account.address, opponentRaw as `0x${string}`, amount, gameTypeHex as `0x${string}`],
      account
    });
    
    console.log(`[Blockchain] Transaction sent: ${hash}`);
    return hash;
  }

  // Settle a match on-chain (must be called by the oracle address)
  async settleMatch(matchId: string, winner: string) {
    if (!walletClient || !account) throw new Error("Wallet not initialized");
    
    console.log(`[Blockchain] Settling match ${matchId} — winner: ${winner}`);
    const hash = await walletClient.writeContract({
      address: contracts.wagerEscrow.address,
      abi: contracts.wagerEscrow.abi,
      functionName: 'settleMatch',
      args: [matchId as `0x${string}`, winner as `0x${string}`],
      account
    });
    console.log(`[Blockchain] Settlement tx: ${hash}`);
    return hash;
  }

  // Settle a draw on-chain
  async settleDraw(matchId: string) {
    if (!walletClient || !account) throw new Error("Wallet not initialized");
    
    console.log(`[Blockchain] Settling draw for match ${matchId}`);
    const hash = await walletClient.writeContract({
      address: contracts.wagerEscrow.address,
      abi: contracts.wagerEscrow.abi,
      functionName: 'settleDraw',
      args: [matchId as `0x${string}`],
      account
    });
    console.log(`[Blockchain] Draw settlement tx: ${hash}`);
    return hash;
  }

  // Register an agent on-chain
  async registerAgent(moltbookId: string) {
    if (!walletClient || !account) throw new Error("Wallet not initialized");

    console.log(`[Blockchain] Registering agent with moltbook ID: ${moltbookId}`);
    const hash = await walletClient.writeContract({
      address: contracts.agentRegistry.address,
      abi: contracts.agentRegistry.abi,
      functionName: 'registerAgent',
      args: [moltbookId],
      account
    });
    console.log(`[Blockchain] Registration tx: ${hash}`);
    return hash;
  }

  // Get agent stats from on-chain registry
  async getAgentStats(address: string) {
    const stats = await publicClient.readContract({
      address: contracts.agentRegistry.address,
      abi: contracts.agentRegistry.abi,
      functionName: 'getAgent',
      args: [address as `0x${string}`]
    });
    return stats;
  }
  
  // Listen for MatchCreated events
  async listenForMatches(callback: (matchData: any) => void) {
    console.log("[Blockchain] Listening for MatchCreated events...");
    
    publicClient.watchContractEvent({
      address: contracts.wagerEscrow.address,
      abi: contracts.wagerEscrow.abi,
      eventName: 'MatchCreated',
      onLogs: logs => {
        logs.forEach(log => {
          callback(log);
        });
      }
    });
  }
}
