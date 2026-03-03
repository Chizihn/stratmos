import express from 'express';

const router = express.Router();

// Mock agent registry for now
const availableAgents = [
  { id: "agent-1", name: "RPS Bot 1", style: "Aggressive", gameTypes: ["RPS"] },
  { id: "agent-2", name: "Tactical Bot", style: "Calculated", gameTypes: ["RPS", "Blotto"] }
];

router.get('/', (req, res) => {
  res.json(availableAgents);
});

router.post('/register', (req, res) => {
  // Logic to register a new agent (user can deploy their own code?)
  // For now, just a placeholder
  res.json({ status: 'registered', id: `agent-${Date.now()}` });
});

export default router;
