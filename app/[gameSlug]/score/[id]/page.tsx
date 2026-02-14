import { notFound } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import AvatarImage from '@/components/AvatarImage';
import { getPublicGameBySlug, getScoreById } from '@/app/actions/games';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ gameSlug: string; id: string }>;
}

export default async function ScoreDetailPage({ params }: Props) {
  const { gameSlug, id } = await params;

  const game = await getPublicGameBySlug(gameSlug);
  if (!game || !game.capabilities.includes('leaderboard')) {
    notFound();
  }

  const score = await getScoreById(game.slug, id);
  if (!score) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 mt-8">
          <Link href={`/${game.slug}/score`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leaderboards
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <AvatarImage
                gameSlug={game.slug}
                avatarId={score.avatar}
                displayName={score.displayName}
                size={64}
              />
            </div>
            <CardTitle className="text-2xl">
              <Trophy className="h-5 w-5 inline mr-2" />
              {score.score.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Player</span>
              <Link
                href={`/${game.slug}/player/${encodeURIComponent(score.displayName)}`}
                className="text-sm font-bold uppercase tracking-tight hover:underline"
              >
                {score.displayName}
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Category</span>
              <Badge variant="outline">{score.category}</Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Submitted</span>
              <span className="text-sm font-medium">{formatDate(score.createdAt)}</span>
            </div>
            {score.metadata && Object.keys(score.metadata).length > 0 && (
              <div className="py-2 border-t border-border">
                <span className="text-sm text-muted-foreground block mb-2">Metadata</span>
                <pre className="text-xs text-muted-foreground p-3 bg-muted rounded overflow-x-auto">
                  {JSON.stringify(score.metadata, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
