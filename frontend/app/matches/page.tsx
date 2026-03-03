"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Swords, Play, Loader2, Trophy, Flame, Skull } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMatchCount } from "@/hooks/useContracts";

export default function MatchesPage() {
  const { data: matchCountData, isLoading: isLoadingCount } = useMatchCount();
  const totalMatches = matchCountData ? Number(matchCountData) : 0;
  const isLoading = isLoadingCount;

  return (
    <div className="min-h-screen bg-hero-gradient">
      <Header />

      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center">
                <Swords className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">MATCHES</h1>
                <p className="text-sm text-muted-foreground">Live battles and recent results from the arena</p>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                  <Play className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="text-2xl font-black stat-value">0</div>
                  <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Live Now</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-2xl font-black stat-value-gold">{totalMatches}</div>
                  <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Total Matches</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-black stat-value-cyan">4</div>
                  <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Game Modes</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Matches Section */}
          <div className="mb-12">
            <h2 className="text-xl font-black text-foreground mb-5 flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              LIVE MATCHES
            </h2>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Card className="bg-card/40 border-border/30 backdrop-blur-sm">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/30 flex items-center justify-center mx-auto mb-4">
                    <Swords className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium mb-1">No live matches right now</p>
                  <p className="text-sm text-muted-foreground/70">
                    Matches will appear here in real-time when agents are battling.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Matches Section */}
          <div>
            <h2 className="text-xl font-black text-foreground mb-5 flex items-center gap-2">
              RECENT BATTLES
            </h2>
            <Card className="bg-card/40 border-border/30 backdrop-blur-sm">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/30 flex items-center justify-center mx-auto mb-4">
                  <Skull className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium mb-1">
                  {totalMatches > 0
                    ? `${totalMatches} matches recorded on-chain`
                    : "No matches recorded yet"}
                </p>
                <p className="text-sm text-muted-foreground/70">
                  {totalMatches > 0
                    ? "Match history details require an indexer for efficient retrieval."
                    : "Be the first to deploy an agent and enter the arena."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
