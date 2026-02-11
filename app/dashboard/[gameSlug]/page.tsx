import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Activity, 
  Users,
  Swords,
  Clock,
  Trophy,
  AlertTriangle,
  ArrowLeft,
  Wrench,
  Settings,
  ScrollText,
  Database
} from 'lucide-react';
import Nav from '@/components/Nav';
import PlayerManagement from '@/components/PlayerManagement';
import BattleManagement from '@/components/BattleManagement';
import ScoreManagement from '@/components/ScoreManagement';
import DataManagement from '@/components/DataManagement';
import GameAdminPanel from '@/components/GameAdminPanel';
import AuditLogViewer from '@/components/AuditLogViewer';
import { getGameBySlug, getGameStats, getGamePlayers, getGameBattles, getGameScores, getGameDataEntries } from '@/app/actions/admin';
import { getGameAvatars } from '@/models/Game';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ gameSlug: string }>;
}

export default async function GameDashboardPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }
  
  const userEmail = session.user?.email?.toLowerCase();
  if (ADMIN_EMAILS.length > 0 && (!userEmail || !ADMIN_EMAILS.includes(userEmail))) {
    redirect('/dashboard');
  }

  const { gameSlug } = await params;
  const game = await getGameBySlug(gameSlug);
  
  if (!game) {
    notFound();
  }

  const hasAsync = game.capabilities.includes('async');
  const hasLeaderboard = game.capabilities.includes('leaderboard');
  const hasData = game.capabilities.includes('data');
  const gameAvatars = getGameAvatars(game);

  const stats = await getGameStats(gameSlug);
  const players = await getGamePlayers(gameSlug);
  const battles = hasAsync ? await getGameBattles(gameSlug) : [];
  const scores = hasLeaderboard ? await getGameScores(gameSlug) : [];
  const dataEntries = hasData ? await getGameDataEntries(gameSlug) : [];

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        

        <div className="mb-6 mt-8">
          <div className="flex items-start gap-3 -mb-1 flex-">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4 -ml-3" />

              </Button>
            </Link>
            <h1 className=" -ml-5 text-3xl font-bold uppercase tracking-tight">{game.name}</h1>
            {!game.active && <Badge variant="destructive">INACTIVE</Badge>}
            {game.maintenance && (
              <Badge variant="secondary">
                <Wrench className="w-3 h-3 mr-1" />
                MAINTENANCE
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Manage {game.name}
            <span className="ml-2 text-xs">
              [{game.capabilities.map(c => c.toUpperCase()).join(', ')}]
            </span>
          </p>
          {game.motd && (
            <p className="text-sm text-muted-foreground mt-1 italic">
              MOTD: {game.motd}
            </p>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-game-overview">
              <Activity className="w-4 h-4 mr-2" />
              OVERVIEW
            </TabsTrigger>
            <TabsTrigger value="players" data-testid="tab-game-players">
              <Users className="w-4 h-4 mr-2" />
              PLAYERS
            </TabsTrigger>
            {hasAsync && (
              <TabsTrigger value="battles" data-testid="tab-game-battles">
                <Swords className="w-4 h-4 mr-2" />
                BATTLES
              </TabsTrigger>
            )}
            {hasLeaderboard && (
              <TabsTrigger value="leaderboards" data-testid="tab-game-leaderboards">
                <Trophy className="w-4 h-4 mr-2" />
                LEADERBOARDS
              </TabsTrigger>
            )}
            {hasData && (
              <TabsTrigger value="data" data-testid="tab-game-data">
                <Database className="w-4 h-4 mr-2" />
                DATA
              </TabsTrigger>
            )}
            <TabsTrigger value="audit" data-testid="tab-game-audit">
              <ScrollText className="w-4 h-4 mr-2" />
              AUDIT LOG
            </TabsTrigger>
            <TabsTrigger value="admin" data-testid="tab-game-admin">
              <Settings className="w-4 h-4 mr-2" />
              ADMIN
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase">TOTAL PLAYERS</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-game-total-players">{stats.totalPlayers}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.activePlayers} active, {stats.bannedPlayers} banned
                    </p>
                  </CardContent>
                </Card>

                {hasAsync && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium uppercase">ACTIVE BATTLES</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="stat-game-active-battles">{stats.activeBattles}</div>
                      <p className="text-xs text-muted-foreground">Currently in progress</p>
                    </CardContent>
                  </Card>
                )}

                {hasAsync && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium uppercase">PENDING BATTLES</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="stat-game-pending-battles">{stats.pendingBattles}</div>
                      <p className="text-xs text-muted-foreground">Waiting for opponent</p>
                    </CardContent>
                  </Card>
                )}

                {hasAsync && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium uppercase">COMPLETED</CardTitle>
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="stat-game-completed-battles">{stats.completedBattles}</div>
                      <p className="text-xs text-muted-foreground">Finished battles</p>
                    </CardContent>
                  </Card>
                )}

                {hasLeaderboard && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium uppercase">TOTAL SCORES</CardTitle>
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="stat-game-total-scores">{stats.totalScores}</div>
                      <p className="text-xs text-muted-foreground">Score submissions</p>
                    </CardContent>
                  </Card>
                )}

                {hasData && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium uppercase">DATA ENTRIES</CardTitle>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="stat-game-total-data">{stats.totalDataEntries}</div>
                      <p className="text-xs text-muted-foreground">Stored key-value pairs</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {hasAsync && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium uppercase">TOTAL BATTLES</CardTitle>
                      <Swords className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="stat-game-total-battles">{stats.totalBattles}</div>
                      <p className="text-xs text-muted-foreground">All-time battles created</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium uppercase">ABANDONED</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="stat-game-abandoned-battles">{stats.abandonedBattles}</div>
                      <p className="text-xs text-muted-foreground">Cancelled before starting</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="uppercase">QUICK STATS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{stats.activePlayers}</div>
                      <div className="text-xs text-muted-foreground uppercase">ACTIVE PLAYERS</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{stats.bannedPlayers}</div>
                      <div className="text-xs text-muted-foreground uppercase">BANNED PLAYERS</div>
                    </div>
                    {hasAsync && (
                      <>
                        <div className="text-center">
                          <div className="text-3xl font-bold">{stats.activeBattles + stats.pendingBattles}</div>
                          <div className="text-xs text-muted-foreground uppercase">ONGOING BATTLES</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold">
                            {stats.completedBattles > 0 
                              ? Math.round((stats.completedBattles / stats.totalBattles) * 100) 
                              : 0}%
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">COMPLETION RATE</div>
                        </div>
                      </>
                    )}
                    {hasLeaderboard && (
                      <div className="text-center">
                        <div className="text-3xl font-bold">{stats.totalScores}</div>
                        <div className="text-xs text-muted-foreground uppercase">TOTAL SCORES</div>
                      </div>
                    )}
                    {hasData && (
                      <div className="text-center">
                        <div className="text-3xl font-bold">{stats.totalDataEntries}</div>
                        <div className="text-xs text-muted-foreground uppercase">DATA ENTRIES</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="uppercase">API ROUTES</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 font-mono text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">POST</Badge>
                      <span>/api/{gameSlug}/register</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">GET</Badge>
                      <span>/api/{gameSlug}/ping</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">POST</Badge>
                      <span>/api/{gameSlug}/ping</span>
                    </div>
                    {hasAsync && (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">GET/POST</Badge>
                          <span>/api/{gameSlug}/battles</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">GET</Badge>
                          <span>/api/{gameSlug}/battles/[id]</span>
                        </div>
                      </>
                    )}
                    {hasLeaderboard && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">GET/POST</Badge>
                        <span>/api/{gameSlug}/scores</span>
                      </div>
                    )}
                    {hasData && (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">GET/POST/DEL</Badge>
                          <span>/api/{gameSlug}/data/[key]</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">POST</Badge>
                          <span>/api/{gameSlug}/data/[key]/delete</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="players">
            <PlayerManagement players={players} gameSlug={gameSlug} gameAvatars={gameAvatars} />
          </TabsContent>

          {hasAsync && (
            <TabsContent value="battles">
              <BattleManagement battles={battles} />
            </TabsContent>
          )}

          {hasLeaderboard && (
            <TabsContent value="leaderboards">
              <ScoreManagement scores={scores} gameSlug={gameSlug} />
            </TabsContent>
          )}

          {hasData && (
            <TabsContent value="data">
              <DataManagement entries={dataEntries} gameSlug={gameSlug} />
            </TabsContent>
          )}

          <TabsContent value="audit">
            <AuditLogViewer gameSlug={gameSlug} gameName={game.name} />
          </TabsContent>

          <TabsContent value="admin">
            <GameAdminPanel 
              gameSlug={gameSlug} 
              gameName={game.name} 
              maintenance={game.maintenance} 
              motd={game.motd} 
              haikunator={game.haikunator}
              versioning={game.versioning}
              avatars={game.avatars || null}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
