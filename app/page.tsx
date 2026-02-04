import Link from "next/link";
import Nav from "@/components/Nav";
import IsometricHero from "@/components/IsometricHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getHubStats } from "@/app/actions/battles";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = await getHubStats();

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

      {/* Minimal Games Section */}
      <main className="max-w-5xl mx-auto px-4 py-24">
        <section>
          
          <h2 className= "hidden font-mono text-xl font-bold uppercase tracking-tight text-center mb-8 text-muted-foreground">coordinate games</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bird Wars */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-center">
                  Bird Wars: First Flight
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Turn-based tactics in the vien of Advance Wars.
                </p>

                <p className="text-xs text-muted-foreground text-center">
                  {stats.activeBattles} active · {stats.pendingBattles} waiting
                </p>

                <Link href="/battles" className="block">
                  <Button
                    variant="outline"
                    className="w-full"
                    data-testid="button-birdwars-battles text-center"
                  >
                    Open
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Power Pentagon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-center">
                  Pulse Pentagon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Score attack music arcade. Version of a classic.
                </p>

                <p className="text-xs text-muted-foreground text-center">
                  Global leaderboard
                </p>

                <Button
                  variant="outline"
                  className="w-full"
                  disabled
                  data-testid="button-powerpentagon-leaderboard"
                >
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            {/* Power Pentagon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-center">
                  Play Chess
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Online chess. For Playdate.
                </p>

                <p className="text-xs text-muted-foreground text-center">
                  Global leaderboard
                </p>

                <Button
                  variant="outline"
                  className="w-full"
                  disabled
                  data-testid="button-powerpentagon-leaderboard"
                >
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <footer className="pb-8 text-center text-sm text-muted-foreground">
        <p>2026 Coordinate Games • Los Angeles</p>
      </footer>
    </div>
  );
}
