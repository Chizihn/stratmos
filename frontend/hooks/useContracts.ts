import { useReadContract, useWriteContract, useReadContracts } from "wagmi";
import { contracts } from "../lib/contracts";

// ----------------------------------------------------------------------
// Agent Registry Hooks
// ----------------------------------------------------------------------

export interface AgentData {
  wallet: string;
  moltbookId: string;
  eloRating: bigint;
  totalMatches: bigint;
  wins: bigint;
  losses: bigint;
  draws: bigint;
  totalWagered: bigint;
  totalWinnings: bigint;
  registeredAt: bigint;
  active: boolean;
}

export function useAgent(address: string | undefined) {
  const result = useReadContract({
    ...contracts.agentRegistry,
    functionName: "getAgent",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    ...result,
    agent: result.data as AgentData | undefined,
  };
}

export function useAgents(addresses: string[]) {
  const { data, ...rest } = useReadContracts({
    contracts: addresses.map((addr) => ({
      ...contracts.agentRegistry,
      abi: contracts.agentRegistry.abi as any,
      functionName: "getAgent",
      args: [addr as `0x${string}`],
    })),
    query: {
      enabled: addresses.length > 0,
    },
  });

  return {
    ...rest,
    agents: data?.map((r: any) => r.result) ?? [],
  };
}

export function useAgentCount() {
  return useReadContract({
    ...contracts.agentRegistry,
    functionName: "getAgentCount",
  });
}

export function useLeaderboard(count: number = 10) {
  return useReadContract({
    ...contracts.agentRegistry,
    functionName: "getLeaderboard",
    args: [BigInt(count)],
  });
}

export function useRegisterAgent() {
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const register = (moltbookId: string) => {
    writeContract({
      ...contracts.agentRegistry,
      functionName: "registerAgent",
      args: [moltbookId],
    });
  };

  return { register, isPending, isSuccess, error };
}

// ----------------------------------------------------------------------
// Wager Escrow Hooks
// ----------------------------------------------------------------------

export function useMatch(matchId: string | undefined) {
  return useReadContract({
    ...contracts.wagerEscrow,
    functionName: "getMatch",
    args: matchId ? [matchId as `0x${string}`] : undefined,
    query: {
      enabled: !!matchId,
    },
  });
}

export function useCreateMatch() {
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const createMatch = (opponent: string, wagerAmount: bigint, gameType: string) => {
    writeContract({
      ...contracts.wagerEscrow,
      functionName: "createMatch",
      args: [opponent as `0x${string}`, opponent as `0x${string}`, wagerAmount, gameType as `0x${string}`], // args mismatch? let's check ABI
      // createMatch(address _agent1, address _agent2, uint256 _wager, bytes32 _gameType)
    });
  };
  
  return { writeContract, isPending, isSuccess, error };
}

export function useMatchCount() {
  return useReadContract({
    ...contracts.wagerEscrow,
    functionName: "matchCounter",
  });
}

export function useMatches(matchIds: string[]) {
  const { data, ...rest } = useReadContracts({
    contracts: matchIds.map((id) => ({
      ...contracts.wagerEscrow,
      abi: contracts.wagerEscrow.abi as any,
      functionName: "getMatch",
      args: [id as `0x${string}`],
    })),
    query: {
      enabled: matchIds.length > 0,
    },
  });

  return {
    ...rest,
    matches: data?.map((r: any) => r.result) ?? [],
  };
}

// ----------------------------------------------------------------------
// Tournament Hooks
// ----------------------------------------------------------------------

export function useTournamentCount() {
  return useReadContract({
    ...contracts.tournamentPool,
    functionName: "tournamentCounter",
  });
}

export function useTournament(tournamentId: string) {
  return useReadContract({
    ...contracts.tournamentPool,
    functionName: "getTournament",
    args: [BigInt(tournamentId)],
  });
}

export function useTournaments(tournamentIds: string[]) {
  const { data, ...rest } = useReadContracts({
    contracts: tournamentIds.map((id) => ({
      ...contracts.tournamentPool,
      abi: contracts.tournamentPool.abi as any,
      functionName: "getTournament",
      args: [BigInt(id)],
    })),
    query: {
      enabled: tournamentIds.length > 0,
    },
  });

  return {
    ...rest,
    tournaments: data?.map((r: any) => r.result) ?? [],
  };
}

// ----------------------------------------------------------------------
// Token Hooks
// ----------------------------------------------------------------------

export function useTokenBalance(address: string | undefined) {
  return useReadContract({
    ...contracts.stratmosToken,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  });
}
