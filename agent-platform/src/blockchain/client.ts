import { createPublicClient, createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from './config';
import dotenv from 'dotenv';

dotenv.config();

const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined;

// Public Client for reading data
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

// Wallet Client for transactions (if private key exists)
export const account = privateKey ? privateKeyToAccount(privateKey) : undefined;

export const walletClient = privateKey
  ? createWalletClient({
      account,
      chain: monadTestnet,
      transport: http(),
    }).extend(publicActions)
  : null;

if (!privateKey) {
  console.warn("⚠️ AGENT_PRIVATE_KEY not set in .env. Agent automation will be read-only.");
}
