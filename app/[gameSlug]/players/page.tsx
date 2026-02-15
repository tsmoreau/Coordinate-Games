import { notFound } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { getGameConfig } from '@/app/actions/games';
import { getGamePlayersList } from '@/app/actions/players';
import { PlayerGrid } from './PlayerGrid';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ gameSlug: string }>;
}

export default async function PlayerListPage({ params }: Props) {
  const { gameSlug } = await params;
  const game = await getGameConfig(gameSlug);

  if (!game) {
    notFound();
  }

  const players = await getGamePlayersList(game.slug, 50);

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
              {game.name} Players
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {players.length} player{players.length !== 1 ? 's' : ''}
          </p>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No players registered</p>
            <p className="text-sm">Register via the API</p>
          </div>
        ) : (
          <PlayerGrid players={players} gameSlug={game.slug} />
        )}
      </main>
    </div>
  );
}