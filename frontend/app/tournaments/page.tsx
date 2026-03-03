"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Trophy,
  Users,
  Loader2,
  Swords,
  Crown,
  Coins,
  Clock,
  Zap,
  CheckCircle2,
  Timer,
  Flame,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useTournamentCount,
  useTournaments,
} from "@/hooks/useContracts";
import { formatEther, fromHex } from "viem";
import { useMemo } from "react";

function decodeGameType(gameTypeBytes: `0x${string}`): string {
  try {
    const decoded = fromHex(gameTypeBytes, "string").replace(/\0/g, "").trim();
    return decoded || "Unknown";
  } catch {
    return "Unknown";
  }
}

export default function TournamentsPage() {
  const { data: tournamentCountData, isLoading: isLoadingCount } = useTournamentCount();
  const tournamentCount = tournamentCountData ? Number(tournamentCountData) : 0;

  // Generate tournament IDs (1-indexed sequential)
  const tournamentIds = useMemo(() => {
    if (tournamentCount === 0) return [];
    return Array.from({ length: tournamentCount }, (_, i) => String(i + 1));
  }, [tournamentCount]);

  const { tournaments, isLoading: isLoadingTournaments } = useTournaments(tournamentIds);
  const isLoading = isLoadingCount || isLoadingTournaments;

  // Parse tournament data
  const parsedTournaments = tournaments.map((t: any, i: number) => {
    if (!t) return null;
    const status = Number(t.status ?? 0);
    const maxParticipants = Number(t.maxParticipants ?? 0);
    const currentParticipants = Number(t.currentParticipants ?? 0);
    const entryFee = t.entryFee ?? 0n;
    const prizePool = t.prizePool ?? 0n;
    const startTime = Number(t.startTime ?? 0);

    return {
      id: i + 1,
      name: t.name || `Tournament #${i + 1}`,
      gameType: t.gameType ? decodeGameType(t.gameType as `0x${string}`) : "Unknown",
      status,
      statusLabel: status === 0 ? "Registration" : status === 1 ? "Active" : "Completed",
      maxParticipants,
      currentParticipants,
      entryFee: formatEther(entryFee),
      prizePool: formatEther(prizePool),
      startTime: startTime > 0 ? new Date(startTime * 1000) : null,
      progress: maxParticipants > 0 ? (currentParticipants / maxParticipants) * 100 : 0,
      winner: t.winner || null,
    };
  }).filter(Boolean);

  const activeTournaments = parsedTournaments.filter(t => t!.status === 1);
  const upcomingTournaments = parsedTournaments.filter(t => t!.status === 0);
  const completedTournaments = parsedTournaments.filter(t => t!.status === 2);

  return (
    <div className="min-h-screen bg-hero-gradient">
      <Header />

      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">TOURNAMENTS</h1>
                <p className="text-sm text-muted-foreground">Compete for glory and massive prize pools</p>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center">
                  <Play className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-green-400">{activeTournaments.length}</div>
                  <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Active</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                  <Timer className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-2xl font-black stat-value-gold">{upcomingTournaments.length}</div>
                  <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Upcoming</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-black stat-value-cyan">{completedTournaments.length}</div>
                  <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Completed</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tournament Tabs */}
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="bg-card/60 border border-border/50 backdrop-blur-sm">
              <TabsTrigger value="active" className="gap-2 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                <Flame className="w-4 h-4" />
                Active
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                <Clock className="w-4 h-4" />
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </TabsTrigger>
            </TabsList>

            {/* Active Tournaments */}
            <TabsContent value="active">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : activeTournaments.length === 0 ? (
                <EmptyState icon={Flame} title="No Active Tournaments" subtitle="Check upcoming tournaments to register early." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeTournaments.map((t) => (
                    <TournamentCard key={t!.id} tournament={t!} variant="active" />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Upcoming Tournaments */}
            <TabsContent value="upcoming">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : upcomingTournaments.length === 0 ? (
                <EmptyState icon={Clock} title="No Upcoming Tournaments" subtitle="New tournaments will appear here when created." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {upcomingTournaments.map((t) => (
                    <TournamentCard key={t!.id} tournament={t!} variant="upcoming" />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Completed Tournaments */}
            <TabsContent value="completed">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : completedTournaments.length === 0 ? (
                <EmptyState icon={Trophy} title="No Completed Tournaments" subtitle="Completed tournaments and their results will show here." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {completedTournaments.map((t) => (
                    <TournamentCard key={t!.id} tournament={t!} variant="completed" />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <Card className="bg-card/40 border-border/30 backdrop-blur-sm">
      <CardContent className="py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/30 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium mb-1">{title}</p>
        <p className="text-sm text-muted-foreground/70">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function TournamentCard({ tournament, variant }: { tournament: any; variant: "active" | "upcoming" | "completed" }) {
  const accentColors = {
    active: { border: "border-green-500/30", bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-500" },
    upcoming: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500" },
    completed: { border: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-400", dot: "bg-cyan-500" },
  };
  const colors = accentColors[variant];

  return (
    <Card className={`bg-card/60 ${colors.border} backdrop-blur-sm card-hover transition-all`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-foreground mb-1">{tournament.name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${colors.bg} ${colors.text} border-transparent text-xs`}>
                {tournament.gameType}
              </Badge>
              <Badge variant="outline" className={`${colors.bg} ${colors.text} border-transparent text-xs`}>
                {variant === "active" && (
                  <span className="relative flex h-2 w-2 mr-1">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.dot} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.dot}`}></span>
                  </span>
                )}
                {tournament.statusLabel}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Prize Pool</div>
            <div className="text-xl font-black stat-value-gold">{tournament.prizePool} MON</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-muted/30 border border-border/20 text-center">
            <div className="text-xs text-muted-foreground mb-1">Entry Fee</div>
            <div className="text-sm font-bold text-foreground">{tournament.entryFee} MON</div>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-border/20 text-center">
            <div className="text-xs text-muted-foreground mb-1">Players</div>
            <div className="text-sm font-bold text-foreground">
              {tournament.currentParticipants}/{tournament.maxParticipants}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-border/20 text-center">
            <div className="text-xs text-muted-foreground mb-1">Start</div>
            <div className="text-sm font-bold text-foreground">
              {tournament.startTime
                ? tournament.startTime.toLocaleDateString()
                : "TBD"}
            </div>
          </div>
        </div>

        {/* Progress */}
        {variant !== "completed" && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Registration Progress</span>
              <span>{tournament.currentParticipants}/{tournament.maxParticipants}</span>
            </div>
            <Progress value={tournament.progress} className="h-2" />
          </div>
        )}

        {/* Action */}
        {variant === "upcoming" && (
          <Button className="w-full gap-2 bg-red-600 hover:bg-red-500 btn-arena">
            <Zap className="w-4 h-4" />
            Register
          </Button>
        )}
        {variant === "active" && (
          <Button variant="outline" className="w-full gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10">
            <Swords className="w-4 h-4" />
            View Matches
          </Button>
        )}
        {variant === "completed" && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-400 font-bold">Winner declared</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
