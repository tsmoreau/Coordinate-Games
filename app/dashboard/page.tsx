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
  Code,
  Key,
  Shield,
  Eye,
  Ban,
  CheckCircle
} from 'lucide-react';
import Nav from '@/components/Nav';
import GameManagement from '@/components/GameManagement';
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
        <div className="mt-8 mb-6">
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
            <TabsTrigger value="devs" data-testid="tab-devs">
              <Code className="w-4 h-4 mr-2" />
              DEVS
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

          <TabsContent value="devs">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase">REGISTERED DEVS</CardTitle>
                    <Code className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-devs">4</div>
                    <p className="text-xs text-muted-foreground">3 active, 1 pending</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase">API KEYS ISSUED</CardTitle>
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-api-keys">5</div>
                    <p className="text-xs text-muted-foreground">4 active, 1 revoked</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase">REGISTERED GAMES</CardTitle>
                    <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-dev-games">3</div>
                    <p className="text-xs text-muted-foreground">Via developer portal</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="uppercase">DEVELOPER ACCOUNTS</CardTitle>
                  <Button size="sm" variant="outline" data-testid="button-invite-dev">
                    <Users className="w-4 h-4 mr-2" />
                    INVITE DEV
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { id: 'alex-chen', name: 'Alex Chen', email: 'alex@studioforge.dev', status: 'active', games: 2, keys: 2, joined: 'Jan 12, 2026' },
                      { id: 'maria-santos', name: 'Maria Santos', email: 'maria@pixelbound.io', status: 'active', games: 1, keys: 2, joined: 'Jan 18, 2026' },
                      { id: 'jordan-blake', name: 'Jordan Blake', email: 'jordan@nightowlgames.com', status: 'active', games: 0, keys: 1, joined: 'Feb 01, 2026' },
                      { id: 'sam-patel', name: 'Sam Patel', email: 'sam@indiearcade.co', status: 'pending', games: 0, keys: 0, joined: 'Feb 06, 2026' },
                    ].map((dev) => (
                      <div
                        key={dev.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-md border"
                        data-testid={`row-dev-${dev.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted text-muted-foreground">
                            <Code className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm uppercase truncate" data-testid={`text-dev-name-${dev.id}`}>{dev.name}</p>
                            <p className="text-xs text-muted-foreground truncate" data-testid={`text-dev-email-${dev.id}`}>{dev.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="text-xs text-muted-foreground hidden sm:block" data-testid={`text-dev-joined-${dev.id}`}>
                            Joined {dev.joined}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-dev-games-${dev.id}`}>
                            <Gamepad2 className="w-3 h-3" />
                            <span>{dev.games}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-dev-keys-${dev.id}`}>
                            <Key className="w-3 h-3" />
                            <span>{dev.keys}</span>
                          </div>
                          <Badge variant={dev.status === 'active' ? 'default' : 'secondary'} data-testid={`badge-dev-status-${dev.id}`}>
                            {dev.status.toUpperCase()}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" data-testid={`button-view-dev-${dev.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {dev.status === 'pending' ? (
                              <Button size="icon" variant="ghost" data-testid={`button-approve-dev-${dev.id}`}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button size="icon" variant="ghost" data-testid={`button-revoke-dev-${dev.id}`}>
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}
