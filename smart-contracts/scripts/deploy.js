// Deploy script for Stratmos contracts on Monad
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

async function main() {
  console.log("🚀 Deploying Stratmos contracts to Monad Testnet...\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} MON\n`);

  if (balance === 0n) {
    console.error("❌ No MON balance! Get testnet tokens from faucet first.");
    process.exit(1);
  }

  // Load compiled artifacts
  const loadArtifact = (solFileName, contractName) => {
    const path = `./artifacts/contracts/${solFileName}/${contractName}.json`;
    return JSON.parse(readFileSync(path, "utf-8"));
  };

  const deploy = async (solFileName, contractName, ...args) => {
    console.log(`📦 Deploying ${contractName}...`);
    const artifact = loadArtifact(solFileName, contractName);
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`   ✅ ${contractName}: ${address}`);
    return { contract, address };
  };

  try {
    // 1. Deploy AgentRegistry (no constructor args)
    const agentRegistry = await deploy("AgentRegistry.sol", "AgentRegistry");

    // 2. Deploy WagerEscrow (constructor takes oracle address - use deployer for now)
    const wagerEscrow = await deploy("WagerEscrow.sol", "WagerEscrow", wallet.address);

    // 3. Deploy TournamentPool (constructor takes oracle address - file has typo TournametPool.sol)
    const tournamentPool = await deploy("TournametPool.sol", "TournamentPool", wallet.address);

    // 4. Deploy StratmosToken (constructor: name, symbol, initialSupply, treasury)
    const initialSupply = ethers.parseEther("100000000"); // 100M tokens
    const stratmosToken = await deploy(
      "StratmosToken.sol", "StratmosToken",
      "Stratmos", "STRM", initialSupply, wallet.address
    );

    // Configure contracts
    console.log("\n⚙️  Configuring contracts...");

    // Add deployer as oracle on AgentRegistry
    const registryContract = agentRegistry.contract;
    const tx1 = await registryContract.addOracle(wallet.address);
    await tx1.wait();
    console.log("   ✅ AgentRegistry oracle set to deployer");

    // Add revenue depositors on StratmosToken
    const tokenContract = stratmosToken.contract;
    const tx2 = await tokenContract.addDepositor(wagerEscrow.address);
    await tx2.wait();
    const tx3 = await tokenContract.addDepositor(tournamentPool.address);
    await tx3.wait();
    console.log("   ✅ Revenue depositors configured");

    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log("\nContract Addresses:");
    console.log(`  StratmosToken:   ${stratmosToken.address}`);
    console.log(`  AgentRegistry:   ${agentRegistry.address}`);
    console.log(`  WagerEscrow:     ${wagerEscrow.address}`);
    console.log(`  TournamentPool:  ${tournamentPool.address}`);
    console.log("\nAdd these to your frontend .env.local:");
    console.log(`NEXT_PUBLIC_STRATMOS_TOKEN=${stratmosToken.address}`);
    console.log(`NEXT_PUBLIC_AGENT_REGISTRY=${agentRegistry.address}`);
    console.log(`NEXT_PUBLIC_WAGER_ESCROW=${wagerEscrow.address}`);
    console.log(`NEXT_PUBLIC_TOURNAMENT_POOL=${tournamentPool.address}`);

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    if (error.data) console.error("   Data:", error.data);
    process.exit(1);
  }
}

main();
