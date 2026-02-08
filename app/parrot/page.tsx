import Nav from '@/components/Nav';
import { Card, CardContent } from '@/components/ui/card';

export default function ParrotPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">

        <img
          src="/parrot.png"
          alt="Parrot Engine"
          className="mb-10"
          data-testid="img-parrot-logo"
        />

        <h1 className="text-3xl font-bold mb-3" data-testid="text-parrot-title">Parrot Engine</h1>
        <p className="text-lg text-muted-foreground mb-2">
          A commit-resolve-replay runtime for the coordinate games platform.
        </p>
        <p className="text-sm text-muted-foreground mb-16">
          You don't need Parrot to build on the platform, but it integrates deeply and handles
          the hard parts: deterministic state, replay, and network synchronization.
        </p>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">The Short Version</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            View-agnostic, coordinate-driven, deterministic state machine. Record a decision, validate it,
            execute it, produce effects, resolve state, send it over the wire, replay it on the other side.
            That loop doesn't care if the decision is "attack unit at tile 3,5" or "thrust 40, turn rate 15, distance 300."
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-3">Engine Primitives</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            The spec started with five primitives &mdash; Grid, Terrain, Entity, Action, Condition &mdash; and those
            are still at the heart of coordinate games. But the engine primitives underneath are more
            general. The grid coordinate system is core, but the runtime layer doesn't assume a
            specific spatial model.
          </p>

          <div className="space-y-3">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm font-semibold mb-1">State</p>
                <p className="text-sm text-muted-foreground">
                  Here's the world right now. The complete, authoritative snapshot of everything the simulation knows.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm font-semibold mb-1">Decision</p>
                <p className="text-sm text-muted-foreground">
                  Here's what I chose to do. A player or AI commits an intent that the engine will validate and resolve.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm font-semibold mb-1">Resolution</p>
                <p className="text-sm text-muted-foreground">
                  Here's what happened, deterministically. Given the same state and the same decision, the outcome is always identical.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm font-semibold mb-1">Recording</p>
                <p className="text-sm text-muted-foreground">
                  Here's the proof it happened. An immutable log of decisions and outcomes that enables full replay.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm font-semibold mb-1">Transmission</p>
                <p className="text-sm text-muted-foreground">
                  Here's how the other side finds out. The wire protocol that synchronizes state across clients so both sides can replay from the same recording.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Two-Queue Architecture</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Simulation owns the world. Projection is just a lens you hold up to it.
            The two-queue split keeps these concerns apart:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm font-semibold mb-1">EffectProcessor</p>
                <p className="text-sm text-muted-foreground">
                  Deterministic state changes. This is the simulation &mdash; the single source of truth that both sides agree on.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm font-semibold mb-1">AnimationQueue</p>
                <p className="text-sm text-muted-foreground">
                  Skippable visuals. The camera can do whatever it wants without touching the sim.
                  On constrained hardware like Playdate, culling isn't an optimization you add later &mdash; it's the default behavior.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">From Spec to Engine</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            The top-line evolution: start with the spec's five primitives (Grid, Terrain, Entity,
            Action, Condition), then realize those are Bird Wars primitives wearing engine clothes.
            The actual engine primitives are more fundamental.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The grid coordinate system remains core to the platform &mdash; it's in the name. But
            the engine can express any game that fits the commit-resolve-replay loop, whether it
            uses a tile grid, continuous coordinates, or something else entirely.
          </p>
        </section>

      </main>
    </div>
  );
}
