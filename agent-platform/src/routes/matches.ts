import express from 'express';
import { Matchmaker } from '../matchmaking/Matchmaker';
import { RPSGame } from '../games/RPS';

const router = express.Router();
const matchmaker = new Matchmaker();

// TODO: Persist active games
const activeGames: Record<string, any> = {};

// POST /matches/join
// Body: { playerId, wager, gameType, signature (for auth) }
router.post('/join', (req, res) => {
  const { playerId, wager, gameType } = req.body;
  
  if (!playerId || !wager || !gameType) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  
  const match = matchmaker.addToQueue(playerId, wager, gameType);
  
  if (match) {
    // Start game!
    const matchId = `match-${Date.now()}`;
    const game = new RPSGame(); // Factory needed for other types
    const state = game.initialize(matchId, match.players);
    
    activeGames[matchId] = { game, state };
    
    res.json({ status: 'matched', matchId, players: match.players });
  } else {
    res.json({ status: 'queued' });
  }
});

// POST /matches/:matchId/move
router.post('/:matchId/move', (req, res) => {
  const { matchId } = req.params;
  const { playerId, action } = req.body;
  
  const session = activeGames[matchId];
  if (!session) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  
  const { game, state } = session;
  
  const move = { playerId, action, timestamp: Date.now() };
  
  if (!game.validateMove(state, move)) {
    res.status(400).json({ error: 'Invalid move' });
    return;
  }
  
  const newState = game.processMove(state, move);
  session.state = newState;
  
  if (game.isGameOver(newState)) {
     const winner = game.getWinner(newState);
     // TODO: Settle on blockchain
     console.log(`Match ${matchId} completed. Winner: ${winner}`);
  }
  
  res.json({ status: 'move_accepted', state: newState });
});

// GET /matches/:matchId
router.get('/:matchId', (req, res) => {
  const { matchId } = req.params;
  const session = activeGames[matchId];
  
  if (!session) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  
  res.json(session.state);
});

export default router;
