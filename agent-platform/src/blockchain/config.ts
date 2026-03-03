import { defineChain } from "viem";
import AgentRegistryArtifact from "./abis/AgentRegistry.json";
import WagerEscrowArtifact from "./abis/WagerEscrow.json";
import TournamentPoolArtifact from "./abis/TournamentPool.json";
import StratmosTokenArtifact from "./abis/StratmosToken.json";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadScan",
      url: "https://testnet.monadscan.com",
    },
  },
  testnet: true,
});

export const contractAddresses = {
  agentRegistry: "0xcADDdD24c24a8d4D8674832Cd154001A8763B364",
  wagerEscrow: "0xeD28469320090d1f3E1E6Dc454ebA6f85c8C38Ff",
  tournamentPool: "0x2CE17284b28641EfFC3d438D3E499f92714d2A84",
  stratmosToken: "0xbd5067255A9c97168c57762a712A13B53BBbd8EF",
} as const;

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
