import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import agentRoutes from './routes/agents';
import matchRoutes from './routes/matches';
import { BlockchainService } from './services/BlockchainService';
import { MatchCoordinator } from './services/MatchCoordinator';
import { MoltbookClient } from './social/MoltbookClient';
import { Matchmaker } from './matchmaking/Matchmaker';
import { PERSONALITIES } from './agents/personalities';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Services ---
const blockchain = new BlockchainService();
const moltbook = new MoltbookClient();
const matchCoordinator = new MatchCoordinator(blockchain, moltbook);
const matchmaker = new Matchmaker();

// --- Routes ---
app.get('/', (_req, res) => {
  res.json({ 
    name: 'Stratmos Agent Platform',
    status: 'active',
    version: '0.2.0',
    supportedGames: matchCoordinator.getSupportedGames(),
    agentPersonalities: Object.keys(PERSONALITIES),
  });
});

app.use('/api/agents', agentRoutes);
app.use('/api/matches', matchRoutes);

// Run a match directly via API
app.post('/api/run-match', async (req, res) => {
  try {
    const { player1Wallet, player2Wallet, player1Personality, player2Personality, gameType, wagerEth } = req.body;
    
    if (!player1Wallet || !player2Wallet || !gameType || !wagerEth) {
      return res.status(400).json({ error: 'Missing required fields: player1Wallet, player2Wallet, gameType, wagerEth' });
    }

    const result = await matchCoordinator.runMatch({
      player1Wallet,
      player2Wallet,
      player1Personality: player1Personality || 'TITAN',
      player2Personality: player2Personality || 'MAXIMUS',
      gameType: gameType.toUpperCase(),
      wagerEth,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[API] Match error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Agent personalities info
app.get('/api/personalities', (_req, res) => {
  res.json(PERSONALITIES);
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`
  🚀 Stratmos Agent Platform running on port ${PORT}
  🔗 Network: Monad Testnet
  🎮 Games: ${matchCoordinator.getSupportedGames().join(', ')}
  🤖 Agents: ${Object.keys(PERSONALITIES).join(', ')}
  📱 Moltbook: ${moltbook.isConfigured() ? 'Connected' : 'Not configured (add MOLTBOOK_API_KEY)'}
  `);

  // Start Moltbook heartbeat (every 4 hours)
  if (moltbook.isConfigured()) {
    setInterval(() => moltbook.heartbeat(), 4 * 60 * 60 * 1000);
    console.log('  💓 Moltbook heartbeat scheduled (every 4 hours)');
  }
});
