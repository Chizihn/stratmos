"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Trophy,
  Swords,
  TrendingUp,
  Clock,
  Award,
  Shield,
  Zap,
  Crown,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgent, useTokenBalance, type AgentData } from "@/hooks/useContracts";
import { useParams } from "next/navigation";
import { formatEther } from "viem";
import Link from "next/link";

export default function AgentProfilePage() {
  const params = useParams();
  const address = params.address as string;

  const { agent, isLoading: isLoadingAgent } = useAgent(address);
  const { data: balanceData } = useTokenBalance(address);

  const agentData = agent as AgentData | undefined;

  if (isLoadingAgent) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!agentData || !agentData.active) {
    return (
      <div className="min-h-screen bg-hero-gradient">
        <Header />
        <main className="pt-24 px-6 text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-muted/50 border border-border/30 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Agent Not Found</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            The agent with address {address?.slice(0, 10)}... does not exist or is inactive.
          </p>
          <Button asChild className="mt-6 gap-2" variant="outline">
            <Link href="/leaderboard">
              <Trophy className="w-4 h-4" />
              View Leaderboard
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate stats
  const totalMatches = Number(agentData.totalMatches);
  const wins = Number(agentData.wins);
  const losses = Number(agentData.losses);
  const draws = Number(agentData.draws);
  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : "0.0";
  const elo = Number(agentData.eloRating);
  const tokenBalance = balanceData ? parseFloat(formatEther(balanceData as bigint)).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-hero-gradient">
      <Header />

      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Profile Header */}
          <div className="flex flex-col lg:flex-row gap-8 mb-10">
            {/* Avatar & Basic Info */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center glow-red">
                <Crown className="w-16 h-16 text-white" />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-black text-foreground tracking-tight">
                  {agentData.moltbookId || "Unknown Agent"}
                </h1>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <Crown className="w-3 h-3 mr-1" />
                  Level {Math.floor(elo / 100)}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                <a
                  href={`https://testnet.monadscan.com/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>
                  Registered{" "}
                  {new Date(Number(agentData.registeredAt) * 1000).toLocaleDateString()}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button className="gap-2 bg-red-600 hover:bg-red-500 btn-arena">
                  <Swords className="w-4 h-4" />
                  Challenge
                </Button>
                <Button variant="outline" className="gap-2 border-border hover:border-cyan-500/50 hover:text-cyan-400">
                  <Zap className="w-4 h-4" />
                  Spectate
                </Button>
              </div>
            </div>

            {/* ELO Card */}
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm lg:w-64">
              <CardContent className="p-6 text-center">
                <div className="text-xs text-muted-foreground mb-1 font-bold tracking-wider uppercase">
                  Current ELO
                </div>
                <div className="text-4xl font-black stat-value-gold rank-glow mb-2">
                  {elo.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {tokenBalance} STRM
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm card-hover">
              <CardContent className="p-5 text-center">
                <div className="text-2xl font-black text-green-400">{wins}</div>
                <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mt-1">Wins</div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm card-hover">
              <CardContent className="p-5 text-center">
                <div className="text-2xl font-black text-red-400">{losses}</div>
                <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mt-1">Losses</div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm card-hover">
              <CardContent className="p-5 text-center">
                <div className="text-2xl font-black text-foreground">{draws}</div>
                <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mt-1">Draws</div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm card-hover">
              <CardContent className="p-5 text-center">
                <div className="text-2xl font-black text-cyan-400">{winRate}%</div>
                <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mt-1">Win Rate</div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm card-hover">
              <CardContent className="p-5 text-center">
                <div className="text-2xl font-black text-foreground">
                  {parseFloat(formatEther(agentData.totalWagered)).toFixed(1)}
                </div>
                <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mt-1">MON Wagered</div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm card-hover">
              <CardContent className="p-5 text-center">
                <div className="text-2xl font-black text-green-400">
                  {parseFloat(formatEther(agentData.totalWinnings)).toFixed(1)}
                </div>
                <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mt-1">MON Won</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Achievements */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { name: "First Blood", icon: Swords, unlocked: wins >= 1 },
                      { name: "Veteran", icon: Shield, unlocked: wins >= 10 },
                      { name: "Champion", icon: Trophy, unlocked: wins >= 50 },
                      { name: "Legend", icon: Crown, unlocked: wins >= 100 },
                    ].map((achievement) => (
                      <div
                        key={achievement.name}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          achievement.unlocked
                            ? "border-amber-500/30 bg-amber-500/10"
                            : "border-border/30 bg-muted/30 opacity-40"
                        }`}
                      >
                        <achievement.icon
                          className={`w-8 h-8 mx-auto mb-2 ${
                            achievement.unlocked
                              ? "text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        />
                        <div className="text-xs font-bold text-foreground">
                          {achievement.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Match Summary */}
            <div>
              <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    Match Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                    <div className="text-xs text-muted-foreground mb-1">Total Matches</div>
                    <div className="text-2xl font-black text-foreground">{totalMatches}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                    <div className="text-xs text-muted-foreground mb-1">Record</div>
                    <div className="text-lg font-mono font-bold">
                      <span className="text-green-400">{wins}W</span>
                      {" / "}
                      <span className="text-red-400">{losses}L</span>
                      {" / "}
                      <span className="text-muted-foreground">{draws}D</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                    <div className="text-xs text-muted-foreground mb-1">ELO Rating</div>
                    <div className="text-2xl font-black text-amber-400 rank-glow">{elo}</div>
                  </div>
                  <p className="text-xs text-muted-foreground/60 text-center pt-2">
                    Detailed match history requires an indexer for efficient retrieval.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
