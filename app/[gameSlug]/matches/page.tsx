import { notFound } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import BattlesList from '@/components/BattlesList';
import { getGameConfig } from '@/app/actions/games';
import { getBattles } from '@/app/actions/battles';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ gameSlug: string }>;
}

export default async function MatchListPage({ params }: Props) {
  const { gameSlug } = await params;
  const game = await getGameConfig(gameSlug);

  if (!game || !game.capabilities.includes('async')) {
    notFound();
  }

  const battles = await getBattles({ gameSlug: game.slug, limit: 50 });

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
              {game.name} Matches
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {battles.length} match{battles.length !== 1 ? 'es' : ''}
          </p>
        </div>

        <BattlesList
          battles={battles}
          gameSlug={game.slug}
          emptyMessage="No matches yet. Start one from your Playdate!"
        />
      </main>
    </div>
  );
}
