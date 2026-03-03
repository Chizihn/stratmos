// deploy-stratmos.ts

import { ethers } from "ethers";
import { readFileSync } from "fs";
import { config } from "dotenv";

config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

if (!PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY not set in .env");
  process.exit(1);
}

interface DeployedContract {
  contract: ethers.Contract;
  address: string;
}

async function main() {
  console.log("🚀 Deploying Stratmos contracts to Monad Testnet...\n");

  if (!PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} MON\n`);

  if (balance === 0n) {
    console.error("❌ No MON balance! Get testnet tokens from faucet first.");
    process.exit(1);
  }

  // ────────────────────────────────────────────────────────────────
  // Helper: Load compiled artifact
  // ────────────────────────────────────────────────────────────────
  const loadArtifact = (solFileName: string, contractName: string) => {
    const path = `./artifacts/contracts/${solFileName}/${contractName}.json`;
    const file = readFileSync(path, "utf-8");
    return JSON.parse(file) as {
      abi: ethers.InterfaceAbi;
      bytecode: string;
    };
  };

  // ────────────────────────────────────────────────────────────────
  // Helper: Deploy contract and wait for confirmation
  // ────────────────────────────────────────────────────────────────
  const deploy = async (
    solFileName: string,
    contractName: string,
    ...args: any[]
  ): Promise<DeployedContract> => {
    console.log(`📦 Deploying ${contractName}...`);

    const { abi, bytecode } = loadArtifact(solFileName, contractName);
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    const contract = (await factory.deploy(...args)) as ethers.Contract;
    const receipt = await contract.waitForDeployment();

    const address = await contract.getAddress();

    console.log(`   ✅ ${contractName}: ${address}`);
    console.log(`   ⛽ Gas used: ${receipt?.gasUsed?.toString() ?? "unknown"}`);

    return { contract, address };
  };

  try {
    // 1. AgentRegistry (no constructor args)
    const agentRegistry = await deploy("AgentRegistry.sol", "AgentRegistry");

    // 2. WagerEscrow (oracle = deployer for now)
    const wagerEscrow = await deploy(
      "WagerEscrow.sol",
      "WagerEscrow",
      wallet.address,
    );

    // 3. TournamentPool (oracle = deployer; note: filename has typo "TournametPool.sol")
    const tournamentPool = await deploy("TournametPool.sol", "TournamentPool", wallet.address);

    // 4. StratmosToken
    const initialSupply = ethers.parseEther("100000000"); // 100M tokens
    const stratmosToken = await deploy(
      "StratmosToken.sol",
      "StratmosToken",
      "Stratmos",
      "STRM",
      initialSupply,
      wallet.address,
    );

    // ────────────────────────────────────────────────────────────────
    // Post-deployment configuration
    // ────────────────────────────────────────────────────────────────
    console.log("\n⚙️  Configuring contracts...");

    // AgentRegistry: add deployer as oracle
    const registry = agentRegistry.contract;
    const tx1 = await registry.addOracle(wallet.address);
    await tx1.wait();
    console.log("   ✅ AgentRegistry oracle set to deployer");

    // StratmosToken: add revenue depositors
    const token = stratmosToken.contract;
    const tx2 = await token.addDepositor(wagerEscrow.address);
    await tx2.wait();

    const tx3 = await token.addDepositor(tournamentPool.address);
    await tx3.wait();

    console.log(
      "   ✅ Revenue depositors configured (WagerEscrow + TournamentPool)",
    );

    // ────────────────────────────────────────────────────────────────
    // Summary
    // ────────────────────────────────────────────────────────────────
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));

    console.log("\nContract Addresses:");
    console.log(`  StratmosToken     : ${stratmosToken.address}`);
    console.log(`  AgentRegistry     : ${agentRegistry.address}`);
    console.log(`  WagerEscrow       : ${wagerEscrow.address}`);
    console.log(`  TournamentPool    : ${tournamentPool.address}`);

    console.log("\nAdd these to your frontend .env.local:");
    console.log(`NEXT_PUBLIC_STRATMOS_TOKEN=${stratmosToken.address}`);
    console.log(`NEXT_PUBLIC_AGENT_REGISTRY=${agentRegistry.address}`);
    console.log(`NEXT_PUBLIC_WAGER_ESCROW=${wagerEscrow.address}`);
    console.log(`NEXT_PUBLIC_TOURNAMENT_POOL=${tournamentPool.address}`);
  } catch (error: any) {
    console.error("\n❌ Deployment failed:");
    console.error(error?.shortMessage ?? error.message);

    if (error?.data) {
      console.error("   Data:", error.data);
    }
    if (error?.reason) {
      console.error("   Reason:", error.reason);
    }

    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
