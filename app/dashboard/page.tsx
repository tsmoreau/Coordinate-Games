import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Swords, 
  Activity, 
  Clock, 
  Trophy,
  Users,
  AlertTriangle
} from 'lucide-react';
import Nav from '@/components/Nav';
import PlayerManagement from '@/components/PlayerManagement';
import BattleManagement from '@/components/BattleManagement';
import { getAdminStats, getAllPlayers, getAllBattles } from '@/app/actions/admin';

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

  const stats = await getAdminStats();
  const players = await getAllPlayers();
  const battles = await getAllBattles();

  const isAdminConfigured = ADMIN_EMAILS.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold uppercase tracking-tight mb-2">ADMIN DASHBOARD</h1>
          <p className="text-muted-foreground">Manage Bird Wars players and battles</p>
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
            <TabsTrigger value="players" data-testid="tab-players">
              <Users className="w-4 h-4 mr-2" />
              PLAYERS
            </TabsTrigger>
            <TabsTrigger value="battles" data-testid="tab-battles">
              <Swords className="w-4 h-4 mr-2" />
              BATTLES
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
                    <div className="text-2xl font-bold" data-testid="stat-total-players">{stats.totalPlayers}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.activePlayers} active, {stats.bannedPlayers} banned
                    </p>
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
                    <CardTitle className="text-sm font-medium uppercase">PENDING BATTLES</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-pending-battles">{stats.pendingBattles}</div>
                    <p className="text-xs text-muted-foreground">Waiting for opponent</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase">COMPLETED</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-completed-battles">{stats.completedBattles}</div>
                    <p className="text-xs text-muted-foreground">Finished battles</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase">TOTAL BATTLES</CardTitle>
                    <Swords className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-battles">{stats.totalBattles}</div>
                    <p className="text-xs text-muted-foreground">All-time battles created</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase">ABANDONED</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-abandoned-battles">{stats.abandonedBattles}</div>
                    <p className="text-xs text-muted-foreground">Cancelled before starting</p>
                  </CardContent>
                </Card>
              </div>

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
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="players">
            <PlayerManagement players={players} />
          </TabsContent>

          <TabsContent value="battles">
            <BattleManagement battles={battles} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
