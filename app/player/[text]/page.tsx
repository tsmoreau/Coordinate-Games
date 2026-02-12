import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Swords, 
  Activity, 
  Clock, 
  Calendar,
  ArrowLeft,
  User,
  Target,
  TrendingUp
} from 'lucide-react';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import Nav from '@/components/Nav';
import AvatarImage from '@/components/AvatarImage';
import { getPlayerByDisplayName, getPlayerBattles } from '@/app/actions/players';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ text: string }>;
}

function getBattleStatusBadge(status: string, winnerId: string | null, deviceId: string) {
  switch (status) {
    case 'active':
      return <Badge variant="default" data-testid="badge-active">Active</Badge>;
    case 'pending':
      return <Badge variant="secondary" data-testid="badge-pending">Pending</Badge>;
    case 'completed':
      if (winnerId === deviceId) {
        return <Badge variant="default" data-testid="badge-won">Won</Badge>;
      } else if (winnerId === null) {
        return <Badge variant="secondary" data-testid="badge-draw">Draw</Badge>;
      } else {
        return <Badge variant="destructive" data-testid="badge-lost">Lost</Badge>;
      }
    case 'abandoned':
      return <Badge variant="outline" data-testid="badge-abandoned">Abandoned</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function PlayerAvatarDisplay({ avatar, displayName, gameSlug }: { avatar: string | null; displayName: string; gameSlug?: string }) {
  return (
    <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4 border-2 border-border overflow-hidden" data-testid="img-player-avatar">
      <AvatarImage
        gameSlug={gameSlug || ''}
        avatarId={avatar}
        displayName={displayName}
        size={64}
      />
    </div>
  );
}

export default async function PlayerProfilePage({ params }: Props) {
  const { text } = await params;
  const displayName = decodeURIComponent(text);
  
  const player = await getPlayerByDisplayName(displayName);
  
  if (!player) {
    notFound();
  }

  const battles = await getPlayerBattles(player.deviceId, 10);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card className="lg:col-span-1 lg:sticky lg:top-24 h-fit">
            <CardHeader className="text-center">
              <PlayerAvatarDisplay avatar={player.avatar} displayName={player.displayName} gameSlug={player.gameSlug} />
              <CardTitle className="text-2xl" data-testid="text-player-name">
                {player.displayName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={player.isActive ? "default" : "secondary"} data-testid="badge-player-status">
                  {player.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="text-sm font-medium" data-testid="text-member-since">
                  {formatDate(player.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Last Seen</span>
                <span className="text-sm font-medium" data-testid="text-last-seen">
                  {formatRelativeTime(player.lastSeen)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wins</CardTitle>
                  <Trophy className="h-4 w-4 text-green-500 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="stat-wins">{player.stats.wins}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Losses</CardTitle>
                  <Target className="h-4 w-4 text-red-500 dark:text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="stat-losses">{player.stats.losses}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Draws</CardTitle>
                  <Swords className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-draws">{player.stats.draws}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-winrate">{player.stats.winRate}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Battles</CardTitle>
                  <Swords className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-battles">{player.stats.totalBattles}</div>
                  <p className="text-xs text-muted-foreground">{player.stats.completedBattles} completed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Battles</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-active-battles">{player.stats.activeBattles}</div>
                  <p className="text-xs text-muted-foreground">{player.stats.pendingBattles} pending</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Turns Played</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-turns">{player.stats.totalTurnsSubmitted}</div>
                  <p className="text-xs text-muted-foreground">Total actions</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Battles</CardTitle>
                <CardDescription>Latest battle history for this player</CardDescription>
              </CardHeader>
              <CardContent>
                {battles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Swords className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No battles yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {battles.map((battle) => (
                      <Link 
                        key={battle.battleId} 
                        href={`/battle/${encodeURIComponent(battle.displayName)}`}
                        className="block"
                        data-testid={`link-battle-${battle.battleId}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-border hover-elevate">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-sm truncate">{battle.displayName}</p>
                              {getBattleStatusBadge(battle.status, battle.winnerId, player.deviceId)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              vs {battle.opponentName || 'Waiting for opponent'} 
                              {battle.status !== 'pending' && ` · Turn ${battle.currentTurn}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(battle.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
