/*
 * TournamentPool Event Handlers for Envio HyperIndex
 * Processes: TournamentCreated, ParticipantRegistered, TournamentStarted, PrizesDistributed
 */

import { TournamentPool } from "generated";

TournamentPool.TournamentCreated.handler(async ({ event, context }) => {
  context.Tournament.set({
    id: event.params.tournamentId.toString(),
    name: event.params.name,
    entryFee: event.params.entryFee,
    prizePool: 0n,
    participantCount: 0,
    status: "Registration",
    createdAt: event.block.timestamp,
  });
});

TournamentPool.ParticipantRegistered.handler(async ({ event, context }) => {
  const tournamentId = event.params.tournamentId.toString();
  const participantId = `${tournamentId}-${event.params.participant}`;

  context.TournamentParticipant.set({
    id: participantId,
    tournament: tournamentId,
    participant: event.params.participant,
    registeredAt: event.block.timestamp,
  });

  const tournament = await context.Tournament.get(tournamentId);
  if (tournament) {
    context.Tournament.set({
      ...tournament,
      participantCount: tournament.participantCount + 1,
    });
  }
});

TournamentPool.TournamentStarted.handler(async ({ event, context }) => {
  const tournament = await context.Tournament.get(event.params.tournamentId.toString());
  if (tournament) {
    context.Tournament.set({
      ...tournament,
      status: "Active",
      participantCount: Number(event.params.participantCount),
    });
  }
});

TournamentPool.PrizesDistributed.handler(async ({ event, context }) => {
  const tournament = await context.Tournament.get(event.params.tournamentId.toString());
  if (tournament) {
    context.Tournament.set({
      ...tournament,
      status: "Completed",
      winners: event.params.winners,
      payouts: event.params.amounts,
    });
  }
});
