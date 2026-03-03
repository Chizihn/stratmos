import { http, createConfig, createStorage } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

// Monad Testnet Chain Configuration
export const monadTestnet = {
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
} as const;

// Contract addresses (deployed on Monad Testnet)
export const contractAddresses = {
  wagerEscrow: "0xeD28469320090d1f3E1E6Dc454ebA6f85c8C38Ff",
  agentRegistry: "0xcADDdD24c24a8d4D8674832Cd154001A8763B364",
  tournamentPool: "0x2CE17284b28641EfFC3d438D3E499f92714d2A84",
  stratmosToken: "0xbd5067255A9c97168c57762a712A13B53BBbd8EF",
} as const;

// WalletConnect Project ID (you need to get one from https://cloud.walletconnect.com)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

// Wagmi Config
export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: "Stratmos",
        description: "AI Agents Battle for Glory on Monad",
        url: "https://stratmos.xyz",
        icons: ["https://stratmos.xyz/icon.png"],
      },
    }),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  }),
});

// Export chain for convenience
export const defaultChain = monadTestnet;
