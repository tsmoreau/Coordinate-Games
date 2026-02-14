import { notFound } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Users,
  Clock,
  Gamepad2,
  Activity,
} from 'lucide-react';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import AvatarImage from '@/components/AvatarImage';
import { DownloadBattleButton } from '@/components/DownloadBattleButton';
import { getPublicGameBySlug } from '@/app/actions/games';
import { getBattleByDisplayName, getBattleTurns } from '@/app/actions/battles';
import { MatchTurnList } from './MatchTurnList';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ gameSlug: string; text: string }>;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'pending':
      return <Badge variant="warning">Waiting for Opponent</Badge>;
    case 'completed':
      return <Badge variant="secondary">Completed</Badge>;
    case 'abandoned':
      return <Badge variant="destructive">Abandoned</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default async function MatchDetailPage({ params }: Props) {
  const { gameSlug, text } = await params;
  const displayName = decodeURIComponent(text);

  const game = await getPublicGameBySlug(gameSlug);
  if (!game) {
    notFound();
  }

  const battle = await getBattleByDisplayName(displayName, game.slug);
  if (!battle) {
    notFound();
  }

  const turns = await getBattleTurns(battle.battleId);

  const players = [battle.player1DeviceId, battle.player2DeviceId].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 mt-8">
          <div className="flex items-start gap-3 -mb-1">
            <Link href={`/${game.slug}/match`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 -ml-3" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="-ml-5 text-3xl font-bold uppercase tracking-tight">
                  {battle.displayName}
                </h1>
                {getStatusBadge(battle.status)}
              </div>
              <p className="text-muted-foreground mt-1 -ml-5">
                <span className="font-mono text-xs">{battle.battleId}</span> · Created {formatDate(battle.createdAt)}
              </p>
            </div>
            <DownloadBattleButton battle={battle} turns={turns} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Current Turn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{battle.currentTurn}</p>
              {battle.status === 'active' && (
                <p className="text-sm text-muted-foreground mt-1">
                  {battle.currentPlayerIndex === 0
                    ? battle.player1DisplayName
                    : battle.player2DisplayName}&apos;s turn (P{battle.currentPlayerIndex + 1})
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{players.length}/2</p>
              <p className="text-sm text-muted-foreground mt-1">
                {battle.player2DeviceId ? 'Match ready' : 'Waiting for opponent'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Last Update
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{formatRelativeTime(battle.updatedAt)}</p>
              <p className="text-sm text-muted-foreground mt-1">{formatDate(battle.updatedAt)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Players</CardTitle>
              <CardDescription>Players in this match</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link
                href={`/${game.slug}/player/${encodeURIComponent(battle.player1DisplayName || '')}`}
                className="block group no-underline"
              >
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card transition-all active:scale-[0.98] hover:border-foreground/20 hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0">
                      <AvatarImage
                        gameSlug={game.slug}
                        avatarId={battle.player1Avatar}
                        displayName={battle.player1DisplayName || 'Player 1'}
                        size={40}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm uppercase tracking-tight">
                          {battle.player1DisplayName}
                        </p>
                        <Badge variant="outline" className="text-xs">P1</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {battle.player1DeviceId.substring(0, 16)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {battle.status === 'active' && battle.currentPlayerIndex === 0 && (
                      <Badge variant="default">Current Turn</Badge>
                    )}
                    {battle.winnerId === battle.player1DeviceId && (
                      <Badge variant="success">Winner</Badge>
                    )}
                  </div>
                </div>
              </Link>

              {battle.player2DeviceId ? (
                <Link
                  href={`/${game.slug}/player/${encodeURIComponent(battle.player2DisplayName || '')}`}
                  className="block group no-underline"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card transition-all active:scale-[0.98] hover:border-foreground/20 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 shrink-0">
                        <AvatarImage
                          gameSlug={game.slug}
                          avatarId={battle.player2Avatar}
                          displayName={battle.player2DisplayName || 'Player 2'}
                          size={40}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm uppercase tracking-tight">
                            {battle.player2DisplayName}
                          </p>
                          <Badge variant="outline" className="text-xs">P2</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {battle.player2DeviceId.substring(0, 16)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {battle.status === 'active' && battle.currentPlayerIndex === 1 && (
                        <Badge variant="default">Current Turn</Badge>
                      )}
                      {battle.winnerId === battle.player2DeviceId && (
                        <Badge variant="success">Winner</Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center justify-center p-4 rounded-lg border border-dashed border-border">
                  <p className="text-muted-foreground text-sm">Waiting for Player 2 to join...</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Turn History</CardTitle>
              <CardDescription>
                {turns.length} turn{turns.length !== 1 ? 's' : ''} recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MatchTurnList
                turns={turns}
                player1DeviceId={battle.player1DeviceId}
                player1DisplayName={battle.player1DisplayName}
                player2DeviceId={battle.player2DeviceId}
                player2DisplayName={battle.player2DisplayName}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
