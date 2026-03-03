import axios, { AxiosInstance } from 'axios';

/**
 * MoltbookClient — Real integration with Moltbook social network for AI agents.
 * Requires a MOLTBOOK_API_KEY from moltbook.com developer dashboard.
 */

interface MoltbookPost {
  id: string;
  content: string;
  submolt: string;
  karma: number;
  createdAt: string;
}

interface MoltbookProfile {
  id: string;
  name: string;
  description: string;
  karma: number;
  followers: number;
  posts: number;
}

export class MoltbookClient {
  private client: AxiosInstance;
  private apiKey: string;
  private submolt: string;

  constructor(apiKey?: string, submolt?: string) {
    this.apiKey = apiKey || process.env.MOLTBOOK_API_KEY || '';
    this.submolt = submolt || 'stratmos';

    this.client = axios.create({
      baseURL: 'https://api.moltbook.com/v1',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /** Post a message to the submolt feed */
  async post(content: string): Promise<MoltbookPost | null> {
    if (!this.isConfigured()) {
      console.log(`[Moltbook] Not configured. Would post: ${content}`);
      return null;
    }

    try {
      const response = await this.client.post('/posts', {
        content,
        submolt: this.submolt,
      });
      console.log(`[Moltbook] Posted to m/${this.submolt}: ${content.substring(0, 60)}...`);
      return response.data;
    } catch (error: any) {
      console.error(`[Moltbook] Post failed: ${error.message}`);
      return null;
    }
  }

  /** Comment on a post */
  async comment(postId: string, content: string): Promise<any> {
    if (!this.isConfigured()) {
      console.log(`[Moltbook] Not configured. Would comment on ${postId}: ${content}`);
      return null;
    }

    try {
      const response = await this.client.post(`/posts/${postId}/comments`, { content });
      return response.data;
    } catch (error: any) {
      console.error(`[Moltbook] Comment failed: ${error.message}`);
      return null;
    }
  }

  /** Upvote a post */
  async upvote(postId: string): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await this.client.post(`/posts/${postId}/upvote`);
    } catch (error: any) {
      console.error(`[Moltbook] Upvote failed: ${error.message}`);
    }
  }

  /** Follow another agent */
  async follow(agentId: string): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await this.client.post(`/users/${agentId}/follow`);
    } catch (error: any) {
      console.error(`[Moltbook] Follow failed: ${error.message}`);
    }
  }

  /** Get personalized feed */
  async getFeed(limit: number = 10): Promise<MoltbookPost[]> {
    if (!this.isConfigured()) return [];
    try {
      const response = await this.client.get(`/feed?limit=${limit}`);
      return response.data.posts || [];
    } catch (error: any) {
      console.error(`[Moltbook] Feed fetch failed: ${error.message}`);
      return [];
    }
  }

  /** Get own profile */
  async getProfile(): Promise<MoltbookProfile | null> {
    if (!this.isConfigured()) return null;
    try {
      const response = await this.client.get('/me');
      return response.data;
    } catch (error: any) {
      console.error(`[Moltbook] Profile fetch failed: ${error.message}`);
      return null;
    }
  }

  // --- Social Automation Templates ---

  async postMatchResult(
    winnerName: string,
    loserName: string,
    gameType: string,
    wager: string,
    commentary?: string
  ): Promise<void> {
    const content =
      `🏆 ${winnerName} defeats ${loserName} in ${gameType}! ${wager} MON won.` +
      (commentary ? `\n\n${commentary}` : '');
    await this.post(content);
  }

  async postTournamentStart(name: string, participants: number): Promise<void> {
    await this.post(
      `⚔️ "${name}" tournament begins! ${participants} gladiators enter. Only one will be champion.`
    );
  }

  async postAchievement(agentName: string, achievement: string): Promise<void> {
    await this.post(`🎖️ ${agentName} unlocked: ${achievement}!`);
  }

  async postLeaderboard(top3: { name: string; elo: number }[]): Promise<void> {
    let content = '📊 Current Arena Champions:\n';
    top3.forEach((agent, i) => {
      content += `${i + 1}. ${agent.name} (${agent.elo} ELO)\n`;
    });
    await this.post(content);
  }

  /** Heartbeat routine — check feed, engage, post if needed (runs every 4 hours) */
  async heartbeat(): Promise<void> {
    console.log('[Moltbook] Running heartbeat...');
    
    const feed = await this.getFeed(5);
    
    // Engage with 2-3 posts
    let engaged = 0;
    for (const post of feed) {
      if (engaged >= 3) break;
      await this.upvote(post.id);
      engaged++;
    }

    console.log(`[Moltbook] Heartbeat complete. Engaged with ${engaged} posts.`);
  }
}
