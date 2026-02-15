import { notFound } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';
import AvatarImage from '@/components/AvatarImage';
import { getGameConfig, getGameLeaderboards } from '@/app/actions/games';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ gameSlug: string }>;
}

export default async function ScoreListPage({ params }: Props) {
  const { gameSlug } = await params;
  const game = await getGameConfig(gameSlug);

  if (!game || !game.capabilities.includes('leaderboard')) {
    notFound();
  }

  const leaderboards = await getGameLeaderboards(game.slug, 50);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 mt-8">
          <div className="flex items-start gap-3 -mb-1">
            <Link href={`/${game.slug}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 -ml-3" />
              </Button>
            </Link>
            <h1 className="-ml-5 text-3xl font-bold uppercase tracking-tight">
              {game.name} Leaderboards
            </h1>
          </div>
        </div>

        {leaderboards.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No scores yet</p>
            <p className="text-sm">Submit scores from your Playdate to see them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leaderboards.map((board) => (
              <Card key={board.category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    {board.category === 'default' ? 'Leaderboard' : board.category}
                  </CardTitle>
                  <CardDescription>Top {board.scores.length} players</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {board.scores.map((entry) => (
                      <Link
                        key={`${entry.deviceId}-${entry.rank}`}
                        href={`/${game.slug}/players/${encodeURIComponent(entry.displayName)}`}
                        className="block group"
                      >
                        <div className="hover:border-foreground/20 hover:bg-muted/50 transition-all cursor-pointer active:scale-[0.99] relative border border-border rounded-lg">
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-mono text-muted-foreground w-6 text-right">
                                {entry.rank}
                              </span>
                              <div className="w-8 h-8 shrink-0">
                                <AvatarImage
                                  gameSlug={game.slug}
                                  avatarId={entry.avatar}
                                  displayName={entry.displayName}
                                  size={32}
                                />
                              </div>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
