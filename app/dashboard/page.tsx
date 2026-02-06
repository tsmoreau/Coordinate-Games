import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Activity, 
  AlertTriangle,
  Gamepad2,
  Users,
  Swords,
  Settings,
  ExternalLink,
  Wrench,
  Clock,
  ScrollText
} from 'lucide-react';
import Nav from '@/components/Nav';
import GameManagement from '@/components/GameManagement';
import AuditLogViewer from '@/components/AuditLogViewer';
import { getPlatformStats, getAllGames } from '@/app/actions/admin';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }
  
  const userEmail = session.user?.email?.toLowerCase();
  if (ADMIN_EMAILS.length > 0 && (!userEmail || !ADMIN_EMAILS.includes(userEmail))) {
    redirect('/');
  }

  const stats = await getPlatformStats();
  const games = await getAllGames();

  const isAdminConfigured = ADMIN_EMAILS.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mt-8 mb-8">
          <h1 className="text-3xl font-bold uppercase tracking-tight -mb-1">PLATFORM DASHBOARD</h1>
          <p className="text-muted-foreground">Manage the coordinate.games platform</p>
        </div>

        {!isAdminConfigured && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-bold uppercase text-sm">SECURITY WARNING</p>
                  <p className="text-sm text-muted-foreground">
                    ADMIN_EMAILS is not configured. Set this environment variable to restrict dashboard access.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Activity className="w-4 h-4 mr-2" />
              OVERVIEW
            </TabsTrigger>
            <TabsTrigger value="admin" data-testid="tab-admin">
              <Settings className="w-4 h-4 mr-2" />
              ADMIN
            </TabsTrigger>
            <TabsTrigger value="games" data-testid="tab-games">
              <Gamepad2 className="w-4 h-4 mr-2" />
              GAMES
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <ScrollText className="w-4 h-4 mr-2" />
              AUDIT LOG
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase">TOTAL GAMES</CardTitle>
                    <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-games">{stats.totalGames}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.activeGames} active
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase">TOTAL PLAYERS</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-players">{stats.totalPlayers}</div>
                    <p className="text-xs text-muted-foreground">Across all games</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase">ACTIVE BATTLES</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-active-battles">{stats.activeBattles}</div>
                    <p className="text-xs text-muted-foreground">Currently in progress</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase">TOTAL BATTLES</CardTitle>
                    <Swords className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-battles">{stats.totalBattles}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.completedBattles} completed, {stats.pendingBattles} pending
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((game) => (
                  <Link key={game.slug} href={`/dashboard/${game.slug}`}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`card-game-${game.slug}`}>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium uppercase">{game.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {!game.active && <Badge variant="destructive">INACTIVE</Badge>}
                          {game.maintenance && <Badge variant="secondary">MAINTENANCE</Badge>}
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span>{game.playerCount} players</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Swords className="w-3 h-3 text-muted-foreground" />
                            <span>{game.battleCount} battles</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {game.capabilities.map((cap) => (
                            <Badge key={cap} variant="outline" className="text-[10px]">
                              {cap.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="admin">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="uppercase">PLATFORM CONFIGURATION</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold uppercase text-sm">ADMIN ACCESS</p>
                      <p className="text-sm text-muted-foreground">
                        {isAdminConfigured 
                          ? `Restricted to ${ADMIN_EMAILS.length} email(s)` 
                          : 'Not configured — anyone with login access can reach this dashboard'}
                      </p>
                    </div>
                    <Badge variant={isAdminConfigured ? 'default' : 'destructive'}>
                      {isAdminConfigured ? 'CONFIGURED' : 'OPEN'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold uppercase text-sm">LOGGED IN AS</p>
                      <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="uppercase">QUICK STATS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{stats.totalGames}</div>
                      <div className="text-xs text-muted-foreground uppercase">REGISTERED GAMES</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{stats.totalPlayers}</div>
                      <div className="text-xs text-muted-foreground uppercase">TOTAL IDENTITIES</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{stats.activeBattles + stats.pendingBattles}</div>
                      <div className="text-xs text-muted-foreground uppercase">ONGOING BATTLES</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {stats.totalBattles > 0
                          ? Math.round((stats.completedBattles / stats.totalBattles) * 100)
                          : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">COMPLETION RATE</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="games">
            <GameManagement games={games} />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogViewer games={games.map(g => ({ slug: g.slug, name: g.name }))} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
