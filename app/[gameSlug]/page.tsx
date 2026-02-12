import { notFound } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Activity, Clock, Trophy, ArrowLeft, Wrench, Gamepad2 } from 'lucide-react';
import BattlesList from '@/components/BattlesList';
import AvatarImage from '@/components/AvatarImage';
import { getPublicGameBySlug, getGameDevices, getGameLeaderboards } from '@/app/actions/games';
import { getBattles } from '@/app/actions/battles';
import { formatRelativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ gameSlug: string }>;
}

export default async function GamePage({ params }: Props) {
  const { gameSlug } = await params;
  const game = await getPublicGameBySlug(gameSlug);

  if (!game) {
    notFound();
  }

  const hasAsync = game.capabilities.includes('async');
  const hasLeaderboard = game.capabilities.includes('leaderboard');

  const [battles, devices, leaderboards] = await Promise.all([
    hasAsync ? getBattles({ gameSlug: game.slug, limit: 10 }) : Promise.resolve([]),
    hasAsync ? getGameDevices(game.slug, 5) : Promise.resolve([]),
    hasLeaderboard ? getGameLeaderboards(game.slug, 10) : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        <div className="mb-6 mt-8">
          <div className="flex items-start gap-3 -mb-1 flex-">
            <div className="">
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="button-back-home">
                  <ArrowLeft className="w-4 h-4 -ml-3" />
                </Button>
              </Link>
            </div>
             <h1 className=" -ml-5 text-3xl font-bold uppercase tracking-tight">{game.name}</h1>
            {game.maintenance && (
              <Badge variant="secondary">
                <Wrench className="w-3 h-3 mr-1" />
                MAINTENANCE
              </Badge>
            )}
          </div>
          {game.tagline && (
            <p className="text-muted-foreground mt-1">{game.tagline}</p>
          )}
          {game.description && (
            <p className="text-sm text-muted-foreground mt-2">{game.description}</p>
          )}
          {game.motd && (
            <p className="text-sm text-muted-foreground mt-2 italic">MOTD: {game.motd}</p>
          )}
          <div className="flex gap-2 mt-3">
            {game.capabilities.map((cap) => (
              <Badge key={cap} variant="outline" className="text-xs font-mono uppercase">
                {cap}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase">Players</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{game.playerCount}</div>
            </CardContent>
          </Card>

          {hasAsync && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium uppercase">Active</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{game.activeBattles}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium uppercase">Waiting</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{game.pendingBattles}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium uppercase">Completed</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{game.completedBattles}</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {hasAsync && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Recent Battles</CardTitle>
                    <CardDescription>Latest battle activity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <BattlesList
                  battles={battles.slice(0, 5)}
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
                    <CardDescription>Latest player activity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {devices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No players registered</p>
                    <p className="text-sm">Register via the API</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {devices.map((device) => (
                      <Link
                        key={device.deviceId}
                        href={`/player/${encodeURIComponent(device.displayName)}`}
                        className="block group"
                      >
                        <div className="hover:border-foreground/20 hover:bg-muted/50 transition-all cursor-pointer active:scale-[0.99] relative border border-border rounded-lg">
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 shrink-0">
                                <AvatarImage
                                  gameSlug={game.slug}
                                  avatarId={device.avatar}
                                  displayName={device.displayName}
                                  size={40}
                                />
                              </div>
                              <div>
                                <p className="font-bold text-sm uppercase tracking-tight">
                                  {device.displayName}
                                </p>
                                <p className="text-[10px] text-muted-foreground uppercase font-medium truncate max-w-[240px]">
                                  {device.deviceId}
                                </p>
                                <p className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Last seen {formatRelativeTime(device.lastSeen)}
                                </p>
                              </div>
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
        )}

        {hasLeaderboard && leaderboards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {leaderboards.map((board) => (
              <Card key={board.category}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        {board.category === 'default' ? 'Leaderboard' : board.category}
                      </CardTitle>
                      <CardDescription>Top {board.scores.length} players</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {board.scores.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No scores yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {board.scores.map((entry) => (
                        <Link
                          key={`${entry.deviceId}-${entry.rank}`}
                          href={`/player/${encodeURIComponent(entry.displayName)}`}
                          className="block group"
                        >
                          <div className="hover:border-foreground/20 hover:bg-muted/50 transition-all cursor-pointer active:scale-[0.99] relative border border-border rounded-lg">
                            <div className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-mono text-muted-foreground w-6 text-right">
                                  {entry.rank}
                                </span>
                                <p className="font-bold text-sm uppercase tracking-tight">
                                  {entry.displayName}
                                </p>
                              </div>
                              <span className="text-sm font-bold font-mono">
                                {entry.score.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="pb-8 text-center text-sm text-muted-foreground mt-16">
        <p>2026 Coordinate Games • Los Angeles</p>
      </footer>
    </div>
  );
}