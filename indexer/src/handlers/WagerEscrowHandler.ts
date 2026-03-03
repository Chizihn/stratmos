/*
 * WagerEscrow Event Handlers for Envio HyperIndex
 * Processes: MatchCreated, MatchSettled, MatchCancelled, Deposited, Withdrawn
 */

import { WagerEscrow } from "generated";

WagerEscrow.MatchCreated.handler(async ({ event, context }) => {
  const matchId = event.params.matchId;
  const agent1Address = event.params.agent1;
  const agent2Address = event.params.agent2;

  // Ensure agent entities exist
  let agent1 = await context.Agent.get(agent1Address);
  if (!agent1) {
    agent1 = {
      id: agent1Address,
      wallet: agent1Address,
      eloRating: 1500,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalWagered: 0n,
      totalWinnings: 0n,
      registeredAt: event.block.timestamp,
    };
    context.Agent.set(agent1);
  }

  let agent2 = await context.Agent.get(agent2Address);
  if (!agent2) {
    agent2 = {
      id: agent2Address,
      wallet: agent2Address,
      eloRating: 1500,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalWagered: 0n,
      totalWinnings: 0n,
      registeredAt: event.block.timestamp,
    };
    context.Agent.set(agent2);
  }

  // Create match entity
  context.Match.set({
    id: matchId,
    agent1: agent1Address,
    agent2: agent2Address,
    wager: event.params.wager,
    status: "Created",
    createdAt: event.block.timestamp,
  });
});

WagerEscrow.MatchSettled.handler(async ({ event, context }) => {
  const match = await context.Match.get(event.params.matchId);
  if (match) {
    context.Match.set({
      ...match,
      winner: event.params.winner,
      payout: event.params.payout,
      status: "Settled",
      settledAt: event.block.timestamp,
    });
  }
});

WagerEscrow.MatchCancelled.handler(async ({ event, context }) => {
  const match = await context.Match.get(event.params.matchId);
  if (match) {
    context.Match.set({
      ...match,
      status: "Cancelled",
      cancelReason: event.params.reason,
      settledAt: event.block.timestamp,
    });
  }
});

WagerEscrow.Deposited.handler(async ({ event, context }) => {
  context.Deposit.set({
    id: event.transaction.hash,
    agent: event.params.agent,
    amount: event.params.amount,
    timestamp: event.block.timestamp,
  });
});

WagerEscrow.Withdrawn.handler(async ({ event, context }) => {
  context.Withdrawal.set({
    id: event.transaction.hash,
    agent: event.params.agent,
    amount: event.params.amount,
    timestamp: event.block.timestamp,
  });
});
