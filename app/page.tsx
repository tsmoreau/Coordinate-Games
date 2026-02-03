import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Swords,
  Activity,
  Clock,
  Trophy,
  ArrowRight,
  Gamepad2,
  Users,
  Zap,
  Target,
} from "lucide-react";
import Nav from "@/components/Nav";
import BattlesList from "@/components/BattlesList";
import IsometricHero from "@/components/IsometricHero";
import { getBattles, getHubStats } from "@/app/actions/battles";
import { getDevices } from "@/app/actions/devices";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [battles, devices, stats] = await Promise.all([
    getBattles({ limit: 5 }),
    getDevices({ limit: 5 }),
    getHubStats()
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="relative overflow-hidden flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative w-full flex-1 flex flex-col items-center justify-center">
          <div className="text-center w-full">
            <div className="mb-8">
              <IsometricHero />
              <p className="text-sm text-muted-foreground mt-12 font-medium animate-pulse">
                Tap tiles to move the ball
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Gamepad2 className="w-6 h-6" />
            Available Games
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Swords className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Bird Wars</CardTitle>
                      <CardDescription>Turn-based tactical battles</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">Async</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Command your bird army in strategic turn-based combat. 
                  12 unique bird types, each with special abilities.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    <span>{stats.activeBattles} active</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{stats.pendingBattles} waiting</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/battles" className="flex-1">
                    <Button variant="outline" className="w-full" data-testid="button-birdwars-battles">
                      View Battles
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <CardTitle>Power Pentagon</CardTitle>
                      <CardDescription>High-score arcade action</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">Leaderboard</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Fast-paced arcade gameplay. Compete for the highest score 
                  on the global leaderboard.
                </p>
                {stats.topScores.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Top Scores
                    </div>
                    {stats.topScores.slice(0, 3).map((score, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{idx + 1}.</span>
                          <span className="font-medium">{score.displayName}</span>
                        </div>
                        <span className="font-mono text-muted-foreground">{score.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    <span>No scores yet - be the first!</span>
                  </div>
                )}
                <Button variant="outline" className="w-full" disabled data-testid="button-powerpentagon-leaderboard">
                  Leaderboard (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Recent Battles</CardTitle>
                  <CardDescription>
                    Latest Bird Wars activity
                  </CardDescription>
                </div>
                <Link href="/battles">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-view-all-battles"
                  >
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <BattlesList
                battles={battles}
                showFilters={false}
                showCreatedDate={false}
                emptyMessage="No battles yet. Start one from your Playdate!"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Recent Players</CardTitle>
                  <CardDescription>Cross-game player identity</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {stats.playerCount} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No players registered</p>
                  <p className="text-sm">Register via POST /api/register</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {devices.map((device) => (
                    <Link
                      key={device.deviceId}
                      href={`/player/${encodeURIComponent(device.displayName)}`}
                      className="block group"
                    >
                      <div className="hover-elevate border border-border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 overflow-hidden shrink-0">
                            <img 
                              src={`/birb${device.avatar.replace('BIRD', '').padStart(3, '0')}.png`} 
                              alt={device.avatar}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm uppercase tracking-tight truncate">
                              {device.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last seen {formatRelativeTime(device.lastSeen)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <section className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>For Developers</CardTitle>
              <CardDescription>
                Build games that connect to coordinate.games
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-2">Cross-Game Identity</h3>
                  <p className="text-sm text-muted-foreground">
                    Players register once and can participate in any game with the same identity.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-2">Game Types</h3>
                  <p className="text-sm text-muted-foreground">
                    Support for async turn-based battles and real-time leaderboard games.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-2">RESTful API</h3>
                  <p className="text-sm text-muted-foreground">
                    Simple JSON API with type-enforced routes under /api/[gameSlug]/.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/schema">
                  <Button variant="outline" data-testid="button-api-documentation">
                    <Target className="w-4 h-4 mr-2" />
                    View API Documentation
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gamepad2 className="w-4 h-4" />
            <span className="font-mono font-medium">coordinate.games</span>
          </div>
          <p>Multi-game hub for async multiplayer and leaderboard games</p>
        </div>
      </footer>
    </div>
  );
}
