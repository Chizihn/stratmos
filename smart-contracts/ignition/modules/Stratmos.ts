import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const StratmosModule = buildModule("StratmosModule", (m) => {
  // Deploy parameters
  const deployer = m.getAccount(0);
  
  // Initial token supply: 100 million STRM (18 decimals)
  const initialSupply = m.getParameter("initialSupply", BigInt("100000000000000000000000000"));
  
  // Treasury address for initial token allocation
  const treasury = m.getParameter("treasury", deployer);
  
  // Oracle address for game settlements and tournament management
  const oracle = m.getParameter("oracle", deployer);

  // 1. Deploy WagerEscrow
  const wagerEscrow = m.contract("WagerEscrow", [oracle], {
    id: "WagerEscrow",
  });

  // 2. Deploy AgentRegistry
  const agentRegistry = m.contract("AgentRegistry", [], {
    id: "AgentRegistry",
  });

  // 3. Deploy TournamentPool
  const tournamentPool = m.contract("TournamentPool", [oracle], {
    id: "TournamentPool",
  });

  // 4. Deploy StratmosToken
  const stratmosToken = m.contract(
    "StratmosToken",
    ["Stratmos", "STRM", initialSupply, treasury],
    {
      id: "StratmosToken",
    }
  );

  // Post-deployment: Add WagerEscrow and TournamentPool as authorized oracles
  m.call(agentRegistry, "addOracle", [wagerEscrow], {
    id: "AddWagerEscrowAsOracle",
    after: [agentRegistry, wagerEscrow],
  });

  m.call(agentRegistry, "addOracle", [tournamentPool], {
    id: "AddTournamentPoolAsOracle",
    after: [agentRegistry, tournamentPool],
  });

  // Add WagerEscrow and TournamentPool as revenue depositors to StratmosToken
  m.call(stratmosToken, "addDepositor", [wagerEscrow], {
    id: "AddWagerEscrowAsDepositor",
    after: [stratmosToken, wagerEscrow],
  });

  m.call(stratmosToken, "addDepositor", [tournamentPool], {
    id: "AddTournamentPoolAsDepositor",
    after: [stratmosToken, tournamentPool],
  });

  return {
    wagerEscrow,
    agentRegistry,
    tournamentPool,
    stratmosToken,
  };
});

export default StratmosModule;
