import { notFound } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Gamepad2 } from 'lucide-react';
import AvatarImage from '@/components/AvatarImage';
import { getPublicGameBySlug } from '@/app/actions/games';
import { getGamePlayersList } from '@/app/actions/players';
import { formatRelativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ gameSlug: string }>;
}

export default async function PlayerListPage({ params }: Props) {
  const { gameSlug } = await params;
  const game = await getPublicGameBySlug(gameSlug);

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
          <div className="grid gap-4">
            {players.map((player) => (
              <Link
                key={player.deviceId}
                href={`/${game.slug}/player/${encodeURIComponent(player.displayName)}`}
                className="block group"
              >
                <div className="hover:border-foreground/20 hover:bg-muted/50 transition-all cursor-pointer active:scale-[0.99] relative border border-border rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 shrink-0">
                        <AvatarImage
                          gameSlug={game.slug}
                          avatarId={player.avatar}
                          displayName={player.displayName}
                          size={40}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-sm uppercase tracking-tight">
                          {player.displayName}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium truncate max-w-[240px]">
                          {player.deviceId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(player.lastSeen)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
