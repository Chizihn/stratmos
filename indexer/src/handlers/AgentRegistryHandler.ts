/*
 * AgentRegistry Event Handlers for Envio HyperIndex
 * Processes: AgentRegistered, StatsUpdated, AchievementUnlocked
 */

import { AgentRegistry } from "generated";

AgentRegistry.AgentRegistered.handler(async ({ event, context }) => {
  context.Agent.set({
    id: event.params.wallet,
    wallet: event.params.wallet,
    moltbookId: event.params.moltbookId,
    eloRating: Number(event.params.initialElo),
    totalMatches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    totalWagered: 0n,
    totalWinnings: 0n,
    registeredAt: event.block.timestamp,
  });
});

AgentRegistry.StatsUpdated.handler(async ({ event, context }) => {
  const agent = await context.Agent.get(event.params.agent);
  if (agent) {
    context.Agent.set({
      ...agent,
      eloRating: Number(event.params.newElo),
      totalMatches: agent.totalMatches + 1,
      wins: event.params.won ? agent.wins + 1 : agent.wins,
      losses: event.params.won ? agent.losses : agent.losses + 1,
    });
  }
});

AgentRegistry.AchievementUnlocked.handler(async ({ event, context }) => {
  const achievementId = `${event.params.agent}-${event.params.achievement}`;
  context.Achievement.set({
    id: achievementId,
    agent: event.params.agent,
    name: event.params.achievement,
    unlockedAt: event.block.timestamp,
  });
});
