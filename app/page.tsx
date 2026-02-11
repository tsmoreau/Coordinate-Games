import Link from "next/link";
import Nav from "@/components/Nav";
import IsometricHero from "@/components/IsometricHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getActiveGames } from "@/app/actions/games";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const games = await getActiveGames();

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="relative min-h-[100vh] bg-background">
        <IsometricHero />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 pointer-events-none">
          <p className="hidden text-sm text-muted-foreground font-medium animate-pulse">
            Tap tiles to move the ball
          </p>
        </div>
      </section>

      {/* Games Section */}
      <main className="max-w-5xl mx-auto px-4 py-24">
        <section>
          <h2 className="hidden font-mono text-xl font-bold uppercase tracking-tight text-center mb-8 text-muted-foreground">coordinate games</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {games.map((game) => (
              <Card key={game.slug}>
                <CardHeader>
                  <CardTitle className="text-lg text-center">
                    {game.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {game.tagline && (
                    <p className="text-sm text-muted-foreground text-center">
                      {game.tagline}
                    </p>
                  )}

                  <div className="flex justify-center gap-2">
                    {game.capabilities.map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs font-mono uppercase">
                        {cap}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    {game.playerCount} players
                    {game.capabilities.includes('async') && (
                      <> · {game.activeBattles} active · {game.pendingBattles} waiting</>
                    )}
                  </p>

                  {game.maintenance ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      Maintenance
                    </Button>
                  ) : (
                    <Link href={`/${game.slug}`} className="block">
                      <Button
                        variant="outline"
                        className="w-full"
                      >
                        Open
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="pb-8 text-center text-sm text-muted-foreground">
        <p>2026 Coordinate Games • Los Angeles</p>
      </footer>
    </div>
  );
}