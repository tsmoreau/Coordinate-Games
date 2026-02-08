import Nav from '@/components/Nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ParrotPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="pt-16 space-y-12">

          <section className="space-y-4">
            <h1 className="text-3xl font-bold" data-testid="text-parrot-title">Parrot Engine</h1>
            <p className="text-lg text-muted-foreground">
              A commit-resolve-replay runtime for the coordinate games platform.
            </p>
            <p className="text-sm text-muted-foreground">
              You don't need Parrot to build on the platform, but it integrates deeply and handles
              the hard parts: deterministic state, replay, and network synchronization.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">The Short Version</h2>
            <p className="text-sm text-muted-foreground">
              View-agnostic, coordinate-driven, deterministic state machine. Record a decision, validate it,
              execute it, produce effects, resolve state, send it over the wire, replay it on the other side.
              That loop doesn't care if the decision is "attack unit at tile 3,5" or "thrust 40, turn rate 15, distance 300."
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-semibold">Engine Primitives</h2>
            <p className="text-sm text-muted-foreground">
              The spec started with five primitives &mdash; Grid, Terrain, Entity, Action, Condition &mdash; and those
              are still at the heart of coordinate games. But the engine primitives underneath are more
              general. The grid coordinate system is core, but the runtime layer doesn't assume a
              specific spatial model:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-base">State</CardTitle>
                  <Badge variant="secondary">Primitive</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Here's the world right now. The complete, authoritative snapshot of everything
                    the simulation knows.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-base">Decision</CardTitle>
                  <Badge variant="secondary">Primitive</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Here's what I chose to do. A player or AI commits an intent that the engine
                    will validate and resolve.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-base">Resolution</CardTitle>
                  <Badge variant="secondary">Primitive</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Here's what happened, deterministically. Given the same state and the same
                    decision, the outcome is always identical.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-base">Recording</CardTitle>
                  <Badge variant="secondary">Primitive</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Here's the proof it happened. An immutable log of decisions and outcomes
                    that enables full replay.
                  </p>
                </CardContent>
              </Card>

              <Card className="sm:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-base">Transmission</CardTitle>
                  <Badge variant="secondary">Primitive</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Here's how the other side finds out. The wire protocol that synchronizes
                    state across clients so both sides can replay from the same recording.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Two-Queue Architecture</h2>
            <p className="text-sm text-muted-foreground">
              Simulation owns the world. Projection is just a lens you hold up to it.
            </p>
            <p className="text-sm text-muted-foreground">
              The two-queue split keeps these concerns apart:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">EffectProcessor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Deterministic state changes. This is the simulation &mdash; the single source of
                    truth that both sides agree on.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">AnimationQueue</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Skippable visuals. The camera can do whatever it wants without touching the
                    sim. On constrained hardware like Playdate, culling isn't an optimization you add
                    later &mdash; it's the default behavior.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">From Spec to Engine</h2>
            <p className="text-sm text-muted-foreground">
              The top-line evolution: start with the spec's five primitives (Grid, Terrain, Entity,
              Action, Condition), then realize those are Bird Wars primitives wearing engine clothes.
              The actual engine primitives are more fundamental.
            </p>
            <p className="text-sm text-muted-foreground">
              The grid coordinate system remains core to the platform &mdash; it's in the name. But
              the engine can express any game that fits the commit-resolve-replay loop, whether it
              uses a tile grid, continuous coordinates, or something else entirely.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
