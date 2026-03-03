import { contractAddresses } from "./wagmi";
import AgentRegistryArtifact from "./abis/AgentRegistry.json";
import WagerEscrowArtifact from "./abis/WagerEscrow.json";
import TournamentPoolArtifact from "./abis/TournamentPool.json";
import StratmosTokenArtifact from "./abis/StratmosToken.json";

export const contracts = {
  agentRegistry: {
    address: contractAddresses.agentRegistry as `0x${string}`,
    abi: AgentRegistryArtifact.abi,
  },
  wagerEscrow: {
    address: contractAddresses.wagerEscrow as `0x${string}`,
    abi: WagerEscrowArtifact.abi,
  },
  tournamentPool: {
    address: contractAddresses.tournamentPool as `0x${string}`,
    abi: TournamentPoolArtifact.abi,
  },
  stratmosToken: {
    address: contractAddresses.stratmosToken as `0x${string}`,
    abi: StratmosTokenArtifact.abi,
  },
} as const;
