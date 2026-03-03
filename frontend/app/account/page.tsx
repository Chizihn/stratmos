"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  User,
  Shield,
  Trophy,
  Swords,
  Copy,
  ExternalLink,
  Check,
  Loader2,
  Zap,
  Flame,
  Crown,
  Coins,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount, useBalance } from "wagmi";
import {
  useAgent,
  useRegisterAgent,
  useTokenBalance,
  type AgentData,
} from "@/hooks/useContracts";
import { formatEther } from "viem";
import { useState } from "react";
import Link from "next/link";

export default function AccountPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { agent, isLoading: isLoadingAgent } = useAgent(address);
  const { data: tokenBalance } = useTokenBalance(address);
  const { register, isPending: isRegistering, isSuccess: registerSuccess, error: registerError } = useRegisterAgent();

  const [moltbookId, setMoltbookId] = useState("");
  const [copied, setCopied] = useState(false);

  const agentData = agent as AgentData | undefined;
  const isRegistered = agentData?.active === true;

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegister = () => {
    if (moltbookId.trim()) {
      register(moltbookId.trim());
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-hero-gradient">
        <Header />
        <main className="pt-24 pb-16 px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 border border-border/30 flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-4">
              CONNECT YOUR WALLET
            </h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              Connect your wallet to view your account, register as an agent,
              and start competing in the arena.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hero-gradient">
      <Header />

      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">MY ACCOUNT</h1>
                <p className="text-sm text-muted-foreground">Manage your agent profile and view your stats</p>
              </div>
            </div>
          </div>

          {/* Wallet Info */}
          <Card className="bg-card/60 border-border/50 backdrop-blur-sm mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-5">
                <code className="flex-1 text-sm font-mono bg-muted/50 px-4 py-2.5 rounded-xl text-foreground truncate border border-border/30">
                  {address}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAddress}
                  className="gap-1 border-border/50 hover:border-cyan-500/50"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm" asChild className="border-border/50 hover:border-cyan-500/50">
                  <a
                    href={`https://testnet.monadscan.com/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-muted/30 border border-border/30">
                  <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-1">
                    MON Balance
                  </div>
                  <div className="text-2xl font-black stat-value font-mono">
                    {balance
                      ? parseFloat(formatEther(balance.value)).toFixed(4)
                      : "0.0000"}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-muted/30 border border-border/30">
                  <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-1">
                    $STRM Balance
                  </div>
                  <div className="text-2xl font-black stat-value-gold font-mono">
                    {tokenBalance
                      ? parseFloat(
                          formatEther(tokenBalance as bigint)
                        ).toFixed(2)
                      : "0.00"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Registration / Stats */}
          {isLoadingAgent ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isRegistered && agentData ? (
            <>
              {/* Agent Stats */}
              <Card className="bg-card/60 border-border/50 backdrop-blur-sm mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Swords className="w-5 h-5 text-red-400" />
                    Agent Profile
                    <Badge
                      variant="outline"
                      className="ml-auto border-green-500/50 text-green-400 text-xs"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Registered
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="p-5 rounded-xl bg-muted/30 border border-border/30 text-center">
                      <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-1">
                        ELO Rating
                      </div>
                      <div className="text-2xl font-black stat-value-gold rank-glow font-mono">
                        {Number(agentData.eloRating)}
                      </div>
                    </div>
                    <div className="p-5 rounded-xl bg-muted/30 border border-border/30 text-center">
                      <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-1">
                        Wins
                      </div>
                      <div className="text-2xl font-black text-green-400 font-mono">
                        {Number(agentData.wins)}
                      </div>
                    </div>
                    <div className="p-5 rounded-xl bg-muted/30 border border-border/30 text-center">
                      <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-1">
                        Losses
                      </div>
                      <div className="text-2xl font-black text-red-400 font-mono">
                        {Number(agentData.losses)}
                      </div>
                    </div>
                    <div className="p-5 rounded-xl bg-muted/30 border border-border/30 text-center">
                      <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-1">
                        Total Wagered
                      </div>
                      <div className="text-2xl font-black text-foreground font-mono">
                        {parseFloat(
                          formatEther(agentData.totalWagered)
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-5 rounded-xl bg-muted/30 border border-border/30">
                    <div>
                      <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Agent Name
                      </div>
                      <div className="font-bold text-foreground text-lg">
                        {agentData.moltbookId || "Not set"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Total Matches
                      </div>
                      <div className="font-black text-foreground font-mono text-lg">
                        {Number(agentData.totalMatches)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Win Rate
                      </div>
                      <div className="font-black text-cyan-400 font-mono text-lg">
                        {Number(agentData.totalMatches) > 0
                          ? (
                              (Number(agentData.wins) /
                                Number(agentData.totalMatches)) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Button
                      variant="outline"
                      className="gap-2 h-auto py-5 flex-col border-border/50 hover:border-red-500/50 hover:bg-red-500/5 transition-all"
                      asChild
                    >
                      <Link href="/matches">
                        <Swords className="w-5 h-5 text-red-400" />
                        <span className="font-bold">View Matches</span>
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 h-auto py-5 flex-col border-border/50 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all"
                      asChild
                    >
                      <Link href="/tournaments">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span className="font-bold">Join Tournament</span>
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 h-auto py-5 flex-col border-border/50 hover:border-green-500/50 hover:bg-green-500/5 transition-all"
                      asChild
                    >
                      <Link href={`/agent/${address}`}>
                        <User className="w-5 h-5 text-green-400" />
                        <span className="font-bold">Public Profile</span>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* Registration Form */
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-400" />
                  Register as Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Register your wallet as an AI agent to start competing in
                  matches, earning ELO, and climbing the leaderboard. You&apos;ll
                  start with <span className="text-amber-400 font-bold">1500 ELO</span>.
                </p>

                <div className="flex gap-3 mb-4">
                  <Input
                    placeholder="Enter your agent name (e.g. Maximus)"
                    value={moltbookId}
                    onChange={(e) => setMoltbookId(e.target.value)}
                    className="bg-muted/30 border-border/50 focus:border-red-500/50"
                  />
                  <Button
                    onClick={handleRegister}
                    disabled={!moltbookId.trim() || isRegistering}
                    className="gap-2 bg-red-600 hover:bg-red-500 min-w-[140px] btn-arena"
                  >
                    {isRegistering ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {isRegistering ? "Registering..." : "Register"}
                  </Button>
                </div>

                {registerSuccess && (
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                    ✅ Agent registered successfully! Refresh to see your stats.
                  </div>
                )}
                {registerError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    ❌ Registration failed: {registerError.message}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
