'use client';

import { Gamepad2, Grid3x3, Swords, Cpu, Monitor, Radio, Globe } from 'lucide-react';
import Nav from '@/components/Nav';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ParrotEnginePage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <img src="/parrot.png" alt="Parrot Engine" className="mb-6" />
          <div className="flex items-center gap-2 mb-4">
            <h1 className="text-3xl font-bold">Parrot Engine</h1>
            <Badge variant="outline" className="text-xs">v0.1.0</Badge>
          </div>
          <p className="text-muted-foreground mb-4">
            Deterministic turn-based game engine for Playdate, written in Lua. 
            Commit-resolve-replay runtime — decisions in, deterministic state out, 
            recorded automatically. Recording drives replay, undo, save/load, and 
            async multiplayer.
          </p>
          <p className="text-muted-foreground mb-4">
            Config-driven. Factory functions with defaults, game overrides what it needs. 
            Simulation and rendering are separate layers. New game 
            = new <code className="bg-muted px-1 rounded">/game/</code> folder.
          </p>
          <p className="text-sm text-muted-foreground">
            41 files, ~6500 lines. 22 implemented, 19 stubs.
          </p>
        </div>

        {/* Module Group Accordions */}
        <Accordion type="single" collapsible className="space-y-4">

          {/* Grid & Spatial */}
          <AccordionItem value="grid" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Grid & Spatial</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Tile storage, projection, pathfinding, cursor. This layer doesn't know battles exist.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">projection.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Grid-to-screen coordinate math. Supports isometric and true perspective 
                    projections. Caches trig values per rotation quadrant so it's not recalculating 
                    every frame. Handles screen bounds checking for tile visibility culling.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">grid.lua</p>
                  <p className="text-sm text-muted-foreground">
                    The tile data itself — terrain types, height values, rotation state, focus 
                    tracking. Delegates all projection math to the projection module. Supports 
                    grid generation and terrain assignment.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">cursor.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Focus tile tracking. Handles rotation-aware movement so d-pad input always 
                    feels correct regardless of the current camera quadrant.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">directions.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Maps screen-space d-pad directions to grid-space deltas based on the 
                    current rotation quadrant. Pressing "up" always moves the cursor away from 
                    the player visually, regardless of how the grid is rotated.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">pathfinding.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Standalone module (no factory). BFS for reachable tiles within a movement budget, 
                    A* for shortest path. The game provides cost and passability callbacks so the 
                    engine doesn't need to know terrain rules.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">lineOfSight.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Bresenham line-of-sight checks. Opt-in per game via action definitions.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">generation.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Procedural grid generation with seeded RNG. Opt-in.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Battle & Entities */}
          <AccordionItem value="battle" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Battle & Entities</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Entity lifecycle, actions, turn flow, recording, effects. The deterministic simulation core.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">battleState.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Top-level battle orchestrator. Manages phase flow (select → act → resolve → next turn), 
                    action execution, and win condition checking. Currently handles both UI flow and simulation 
                    execution — a planned logic.lua extraction will separate the simulation guts.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">entityManager.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Entity CRUD, spatial queries, team management. Follows the "position equals presence" 
                    rule — an entity with a position is on the grid, nil position means off-grid. 
                    Tracks acted/unacted state per turn.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">entityRegistry.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Type definitions for entities. Games register their entity types at boot via a 
                    config callback — stats, movement rules, sprite references, whatever the game needs.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">actionRegistry.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Action definitions with isAvailable, validate, and execute functions. Games register 
                    their own actions (move, attack, heal, capture — whatever). The engine handles the 
                    execution pipeline; the game defines what actions exist and what they do.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">turnManager.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Turn counter, team rotation, turn lifecycle callbacks. Straightforward bookkeeping.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">recording.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Captures every action as it executes. Core to the engine — not opt-in. A recording 
                    is a list of decisions that can be replayed to reproduce any game state. This is 
                    what makes replay, undo, save/load, and network sync all the same mechanism.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">seededRandom.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Deterministic RNG. All game randomness must go through this, never math.random. 
                    Same seed, same sequence, every time.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">effects.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Deterministic state change queue. Actions produce effects, effects can chain 
                    (DAMAGE → DESTROY → DROP_ITEM). Processed in order, always the same result. 
                    This is the first of the two queues — the one that matters for game state.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">animation.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The second queue — visual animations fed from processed effects. Entirely skippable 
                    via instantMode. Skip the animation queue and the game state is identical.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">hooks.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Event hooks — onDamaged, onDestroyed, onEntered, etc. Games register callbacks 
                    for game-specific reactions to engine events.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">conditions.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Status effects. Apply, tick per turn, auto-remove on expiry. Opt-in.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* System */}
          <AccordionItem value="system" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">System</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Input, logging, save/load, audio, settings, messaging, compression.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">input.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Single input controller for all screens. Events use hardware names 
                    (A, B, UP, DOWN, LEFT, RIGHT, CRANK_CW, CRANK_CCW). Supports keyed 
                    block reasons so multiple systems can block/unblock input independently 
                    without stepping on each other. Menu button is a system event, not an input.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">logger.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Leveled logging (DEBUG/INFO/WARN/ERROR) with category filtering. 
                    Global as Log — one of only two globals in the engine.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">compression.lua</p>
                  <p className="text-sm text-muted-foreground">
                    State string pack/unpack for network wire format. Base62 encoding, bitmask 
                    packing, path encoding. The client-side half of the codec system — roughly 
                    3.5× compression over raw JSON.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">save.lua + saveSchema.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Slot-based save I/O. Engine handles file operations; games implement their own 
                    serialize/deserialize/validate/migrate schema.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">messaging.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    In-game message display. Toast notifications, battle log.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">audio.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sound effects and music playback.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">settings.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Persistent key-value settings.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">achievements.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Achievement tracking via pd-achievements.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Render & UI */}
          <AccordionItem value="render" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Render & UI</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Drawing, entity info display, spatial and first-person renderers.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">renderer.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Draws grid, entities, cursor, debug overlays. Checks a needsRedraw flag to 
                    avoid unnecessary redraws — on Playdate, every frame you don't draw is battery 
                    you save.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">infoPanel.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Cursor hover queries. Reports tile info and entities at the current focus 
                    position. The UI reads from this; it doesn't query the grid directly.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">renderFlat.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cached image strategy for flat grids with no elevation. Draws once, reuses 
                    until invalidated.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">renderElevated.lua</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">Stub</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Per-tile sprite strategy for grids with elevation. Depth sorting changes 
                    per rotation quadrant.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Network */}
          <AccordionItem value="network" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Network</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Online async multiplayer. Three rules: singleton socket, Connection: close header, 
                atomic requests. Extracted from a shipped game, not invented in a vacuum.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">manager.lua</p>
                  <p className="text-sm text-muted-foreground">
                    HTTP primitives. WiFi gating, auth header injection, game slug path 
                    construction. Everything else in the network layer goes through this.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">registration.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Device registration with auto-retry on SSL/NTP errors (common on Playdate 
                    cold boot). Stores credentials via dataStore. Deterministic tokens from 
                    serial number via HMAC-SHA256.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">ping.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Two pings — a public GET for version check and server status, and an 
                    authenticated POST for presence tracking.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">lobby.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Battle list with cursor pagination, create/join/cancel. Headless — the engine 
                    handles state, pagination, caching, and API calls. The game handles rendering 
                    and button mapping.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">submitter.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Turn submission with codec encoding. Single-flight (won't send a second 
                    request while one is in progress), built-in retry logic.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">poller.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Incremental turn polling. Asks the server "anything new since turn N?" on 
                    a 5-second default interval. Marks turns as applied so it doesn't re-fetch.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">connectionStatus.lua</p>
                  <p className="text-sm text-muted-foreground">
                    WiFi state tracking, connection quality assessment, reconnect detection.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">leaderboard.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Score submission and rankings retrieval. Supports time-period filtering.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">dataStore.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Persistent key-value storage via Playdate's datastore API. Used for tokens, 
                    cached data, local settings.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Server Endpoints */}
          <AccordionItem value="server" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Server Endpoints</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                coordinate.games REST API. NextJS + MongoDB. Games are scoped 
                by <code className="bg-muted px-1 rounded">[gameSlug]</code> in 
                the URL path. Capabilities system controls which endpoints are available 
                per game (async, leaderboard, data).
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">Global</p>
                  <p className="text-sm text-muted-foreground">
                    Platform health check, game listing, seed endpoint.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">Registration & Identity</p>
                  <p className="text-sm text-muted-foreground">
                    Per-game identity via Playdate serial number. Device registers once per game, 
                    gets a token. Serial number links identities across games internally.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">Async Battles</p>
                  <p className="text-sm text-muted-foreground">
                    Full turn-based multiplayer API. Create, join, submit turns, poll for 
                    updates, forfeit. Supports codec-encoded wire format — server stores expanded 
                    JSON, clients send compact strings.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">Leaderboard</p>
                  <p className="text-sm text-muted-foreground">
                    Score submission and ranked retrieval with time-period filtering.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">Data Storage</p>
                  <p className="text-sm text-muted-foreground">
                    Key-value storage with scoping — global, player-owned, or public.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">Codec System</p>
                  <p className="text-sm text-muted-foreground">
                    Server-side codec registry. Games register codecs by ID. Server decodes on 
                    receipt, stores JSON. Unknown codec or decode failure returns 400.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Game Layer */}
          <AccordionItem value="game" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Game Layer</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Everything game-specific. A new game replaces this folder entirely.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">config.lua</p>
                  <p className="text-sm text-muted-foreground">
                    Single file defining all game data. Grid dimensions, entity type definitions, 
                    action definitions, terrain rules, win conditions, turn callbacks. This is 
                    the game. Everything else is how it runs.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">screens/</p>
                  <p className="text-sm text-muted-foreground">
                    Scene manager with lifecycle (enter → update/draw → exit). Each screen returns 
                    a scene name to trigger transitions. Currently ships with: start, mainMenu, 
                    gameSetup, settings, about, demo, fpDemo.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </main>

      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gamepad2 className="w-4 h-4" />
            <span className="font-mono font-medium">Parrot Engine</span>
          </div>
          <p>Deterministic turn-based game engine for Playdate</p>
        </div>
      </footer>
    </div>
  );
}