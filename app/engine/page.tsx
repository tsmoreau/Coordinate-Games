"use client";

import {
  Gamepad2,
  Grid3x3,
  Swords,
  Cpu,
  Monitor,
  Radio,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import Nav from "@/components/Nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function ApiMethod({
  signature,
  description,
}: {
  signature: string;
  description?: string;
}) {
  return (
    <div className="py-1">
      <code className="text-xs font-mono text-foreground/80">{signature}</code>
      {description && (
        <span className="text-xs text-muted-foreground ml-2">
          — {description}
        </span>
      )}
    </div>
  );
}

function ApiSection({
  id,
  methods,
}: {
  id: string;
  methods: { sig: string; desc?: string }[];
}) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value={id} className="border-0">
        <AccordionTrigger className="hover:no-underline py-1.5 text-xs text-muted-foreground font-medium [&>svg]:h-3 [&>svg]:w-3">
          API Reference ({methods.length})
        </AccordionTrigger>
        <AccordionContent className="pt-1 pb-0">
          <div className="border-l-2 border-border pl-3 space-y-0">
            {methods.map((m, i) => (
              <ApiMethod key={i} signature={m.sig} description={m.desc} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function ConfigKey({
  name,
  defaultVal,
  modules,
  effect,
}: {
  name: string;
  defaultVal: string;
  modules: string;
  effect: string;
}) {
  return (
    <div className="py-1.5 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 items-baseline text-xs border-b border-border/50 last:border-0">
      <div>
        <code className="font-mono text-foreground/90">{name}</code>
        <span className="text-muted-foreground ml-1.5">— {effect}</span>
      </div>
      <span className="text-muted-foreground/60 font-mono whitespace-nowrap">
        {defaultVal}
      </span>
      <span className="text-muted-foreground/40 whitespace-nowrap">
        {modules}
      </span>
    </div>
  );
}

function ShapeField({
  name,
  defaultVal,
  effect,
}: {
  name: string;
  defaultVal?: string;
  effect: string;
}) {
  return (
    <div className="py-1">
      <code className="text-xs font-mono text-foreground/80">{name}</code>
      {defaultVal && (
        <span className="text-xs text-muted-foreground/60 font-mono ml-1.5">
          = {defaultVal}
        </span>
      )}
      <span className="text-xs text-muted-foreground ml-1.5">— {effect}</span>
    </div>
  );
}

export default function ParrotEnginePage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <img src="/parrot.png" alt="Parrot Engine" className="mb-6" />
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Parrot Engine</h1>
              <Badge variant="outline" className="text-xs">
                v0.1.2
              </Badge>
            </div>
            <Button variant="outline" asChild data-testid="link-github-parrot">
              <a href="#">
                <SiGithub className="w-4 h-4 mr-2" />
                on GitHub
              </a>
            </Button>
          </div>
          <p className="text-muted-foreground mb-4">
            Deterministic turn-based game engine for Playdate, written in Lua.
            Commit-resolve-replay runtime: decisions in, deterministic state
            out, recorded automatically. Recording drives replay, undo,
            save/load, and async multiplayer.
          </p>
          <p className="text-muted-foreground mb-4">
            Config-driven. Factory functions with defaults, game overrides what
            it needs. Simulation and rendering are separate layers. New game =
            new <code className="bg-muted px-1 rounded">/game/</code> folder.
          </p>
        </div>

        {/* Module Group Accordions */}
        <Accordion type="single" collapsible className="space-y-4">
          {/* Grid & Spatial */}
          <AccordionItem
            value="grid"
            className="border rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Grid & Spatial</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Tile storage, projection, pathfinding, cursor. This layer
                doesn't know battles exist.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    projection.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Grid-to-screen coordinate math. Supports isometric and true
                    perspective projections. Caches trig values per rotation
                    quadrant so it's not recalculating every frame. Handles
                    screen bounds checking for tile visibility culling.
                  </p>
                  <ApiSection
                    id="projection"
                    methods={[
                      {
                        sig: "getScreenPosition(gridX, gridY, height)",
                        desc: "grid coords to screen pixels, cached",
                      },
                      {
                        sig: "getRawProjection(gridX, gridY, height)",
                        desc: "uncached projection",
                      },
                      {
                        sig: "getGridPosition(screenX, screenY)",
                        desc: "inverse projection",
                      },
                      {
                        sig: "isTileOnScreen(x, y, height, precalcX, precalcY)",
                        desc: "viewport bounds check",
                      },
                      {
                        sig: "getVisibleBounds()",
                        desc: "grid-space bounding box of visible area",
                      },
                      {
                        sig: "getTileCorners(gridX, gridY, height)",
                        desc: "four corner screen positions",
                      },
                      { sig: "getQuadrant()", desc: "rotation quadrant 0-3" },
                      {
                        sig: "getViewAngle() / setViewAngle(angle)",
                        desc: "perspective tilt",
                      },
                      {
                        sig: "cycleViewAngle()",
                        desc: "step through preset angles",
                      },
                      {
                        sig: "updateCache()",
                        desc: "rebuild projection cache",
                      },
                      { sig: "invalidate()", desc: "mark cache dirty" },
                      { sig: "reset()", desc: "clear all caches" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    grid.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The tile data itself: terrain types, height values, rotation
                    state, focus tracking. Delegates all projection math to the
                    projection module. Supports grid generation and terrain
                    assignment.
                  </p>
                  <ApiSection
                    id="grid"
                    methods={[
                      {
                        sig: "getScreenPosition(x, y, height)",
                        desc: "delegates to projection",
                      },
                      {
                        sig: "getGridPosition(screenX, screenY)",
                        desc: "delegates to projection",
                      },
                      { sig: "tileExists(x, y)", desc: "valid tile check" },
                      {
                        sig: "getTileHeight(x, y)",
                        desc: "height from cache/heightMap, 0 if flat",
                      },
                      {
                        sig: "isInBounds(x, y)",
                        desc: "bounds check without tile validity",
                      },
                      {
                        sig: "setTerrainAt(x, y, key) / getTerrainAt(x, y)",
                        desc: "per-tile terrain strings",
                      },
                      {
                        sig: "getValidTiles()",
                        desc: "returns validTiles hash table",
                      },
                      {
                        sig: "getFocus()",
                        desc: "returns x, y, height of cursor",
                      },
                      {
                        sig: "setFocus(x, y)",
                        desc: "move cursor, notifies InfoPanel and CameraPan",
                      },
                      {
                        sig: "moveFocus(dx, dy)",
                        desc: "relative cursor move",
                      },
                      {
                        sig: "startRotation(angle)",
                        desc: "begin animated rotation",
                      },
                      {
                        sig: "updateRotation()",
                        desc: "advance rotation, returns true while animating",
                      },
                      {
                        sig: "getReachableTiles(startX, startY, range, canPassThrough)",
                        desc: "BFS flood fill",
                      },
                      {
                        sig: "getTilesInRadius(centerX, centerY, radius)",
                        desc: "Manhattan distance area",
                      },
                      {
                        sig: "getPath(startX, startY, endX, endY, occupancyCheck, costFn)",
                        desc: "A* shortest path",
                      },
                      {
                        sig: "isTileOccluded(x, y)",
                        desc: "check occlusion cache",
                      },
                      {
                        sig: "updateOcclusionCache(quadrant)",
                        desc: "rebuild for quadrant",
                      },
                      {
                        sig: "resetGrid()",
                        desc: "clear caches, run generateGrid or default rectangle",
                      },
                      {
                        sig: "setInfoPanel(infoPanel) / setCameraPan(cameraPan)",
                        desc: "post-construction wiring",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    cursor.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Focus tile tracking. Handles rotation-aware movement so
                    d-pad input always feels correct regardless of the current
                    camera quadrant.
                  </p>
                  <ApiSection
                    id="cursor"
                    methods={[
                      { sig: "getPosition()", desc: "returns x, y" },
                      {
                        sig: "setPosition(x, y)",
                        desc: "absolute move, validates tile exists",
                      },
                      {
                        sig: "moveByScreenDirection(screenDirection)",
                        desc: "screen-relative move",
                      },
                      {
                        sig: "moveByDirection(direction)",
                        desc: "absolute grid direction",
                      },
                      { sig: "moveBy(dx, dy)", desc: "relative move" },
                      {
                        sig: "isFocused(x, y) / isValidPosition(x, y)",
                        desc: "checks",
                      },
                      { sig: "reset()", desc: "restore to grid center" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    directions.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Maps screen-space d-pad directions to grid-space deltas
                    based on the current rotation quadrant. Pressing "up" always
                    moves the cursor away from the player visually, regardless
                    of how the grid is rotated.
                  </p>
                  <ApiSection
                    id="directions"
                    methods={[
                      {
                        sig: "getVector(facing)",
                        desc: "facing string to {dx, dy}",
                      },
                      {
                        sig: "screenToVector(screenDirection, rotation)",
                        desc: "screen input to grid delta",
                      },
                      {
                        sig: "getQuadrant(rotation)",
                        desc: "degrees to quadrant 0-3",
                      },
                      {
                        sig: "rotate(facing, steps)",
                        desc: "rotate facing by N 90° steps",
                      },
                      { sig: "opposite(facing)", desc: '"n" → "s", etc.' },
                      {
                        sig: "fromDelta(fromX, fromY, toX, toY)",
                        desc: "grid delta to facing string",
                      },
                      {
                        sig: "getScreenEdgeLabels(rotation)",
                        desc: "compass direction per screen edge",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    cameraPan.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Camera offset management for panning the grid view. Smooth
                    scrolling to keep the active area in frame.
                  </p>
                  <ApiSection
                    id="cameraPan"
                    methods={[
                      {
                        sig: "update(focusX, focusY)",
                        desc: "recalculate camera offset",
                      },
                      { sig: "reset()", desc: "zero offsets" },
                      { sig: "setGrid(g)", desc: "swap grid reference" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    pathfinding.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Standalone module (no factory). BFS for reachable tiles
                    within a movement budget, A* for shortest path. The game
                    provides cost and passability callbacks so the engine
                    doesn't need to know terrain rules.
                  </p>
                  <ApiSection
                    id="pathfinding"
                    methods={[
                      {
                        sig: "getPath(startX, startY, endX, endY, occupancyCheck, costFn)",
                        desc: "A* with Manhattan heuristic, returns path or nil",
                      },
                      {
                        sig: "getReachableTiles(startX, startY, maxRange, occupancyCheck, costFn)",
                        desc: "cost-weighted BFS flood fill",
                      },
                      {
                        sig: "getTilesInRadius(centerX, centerY, radius)",
                        desc: "Manhattan radius",
                      },
                      {
                        sig: "getTilesInLine(startX, startY, direction, maxRange, stopAtBlocked)",
                        desc: "ray cast along cardinal",
                      },
                      {
                        sig: "isReachable(x, y, reachableTiles)",
                        desc: "check position in reachable set",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    lineOfSight.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Bresenham line-of-sight checks. Opt-in per game via action
                    definitions.
                  </p>
                  <ApiSection
                    id="los"
                    methods={[
                      {
                        sig: "isVisible(fromX, fromZ, toX, toZ)",
                        desc: "stub — always returns true",
                      },
                      {
                        sig: "getVisibleTiles(x, z, range)",
                        desc: "stub — returns {}",
                      },
                      { sig: "invalidate()", desc: "stub" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    generation.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Procedural grid generation with seeded RNG. Opt-in.
                  </p>
                  <ApiSection
                    id="generation"
                    methods={[
                      { sig: "generate(genConfig)", desc: "stub" },
                      { sig: "applyHeightMap(heightMap)", desc: "stub" },
                      { sig: "applyTerrainMap(terrainMap)", desc: "stub" },
                      { sig: "smoothHeights(passes)", desc: "stub" },
                    ]}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Battle & Entities */}
          <AccordionItem
            value="battle"
            className="border rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Battle & Entities</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Entity lifecycle, actions, turn flow, recording, effects. The
                deterministic simulation core.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    battleState.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Top-level battle orchestrator. Manages phase flow (select →
                    act → resolve → next turn), action execution, and win
                    condition checking. Owns the UI phase machine: how the human
                    navigates decisions.
                  </p>
                  <ApiSection
                    id="battleState"
                    methods={[
                      {
                        sig: "getPhase() / isPhase(phase)",
                        desc: "current phase string",
                      },
                      {
                        sig: "getSelectedUnit()",
                        desc: "currently selected entity",
                      },
                      { sig: "toIdle()", desc: "deselect, clear state" },
                      {
                        sig: "selectUnit(unit)",
                        desc: "select entity, build action menu",
                      },
                      {
                        sig: "toChoosingMoveTarget()",
                        desc: "compute reachable tiles, enter move phase",
                      },
                      {
                        sig: "toChoosingAttackTarget()",
                        desc: "compute attack targets",
                      },
                      {
                        sig: "toChoosingCustomTarget(actionId)",
                        desc: "custom target phase",
                      },
                      {
                        sig: "toChoosingFacing()",
                        desc: "facing selection (when enableFacing)",
                      },
                      {
                        sig: "toEntitySelect(selectableEntities)",
                        desc: "entity selection list",
                      },
                      {
                        sig: "toAnimating() / toEnemyTurn() / toGameOver(winner)",
                        desc: "state transitions",
                      },
                      {
                        sig: "buildActionMenuForUnit(unit)",
                        desc: "rebuild menu from action registry",
                      },
                      {
                        sig: "menuNavigate(direction) / menuSelect()",
                        desc: "menu interaction",
                      },
                      {
                        sig: "executeMove(toX, toY, precomputedPath)",
                        desc: "move via logic",
                      },
                      {
                        sig: "executeAttack(targetId)",
                        desc: "attack via logic",
                      },
                      { sig: "executeWait()", desc: "end unit's turn" },
                      {
                        sig: "getReachableTiles() / isReachable(x, y)",
                        desc: "computed move range",
                      },
                      {
                        sig: "getAttackTargets()",
                        desc: "computed attack targets",
                      },
                      {
                        sig: "setFacingDirection(facing) / confirmFacing() / cancelFacing()",
                        desc: "facing control",
                      },
                      { sig: "reset()", desc: "clear all phase state" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    logic.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pure simulation orchestrator. Single execution path for all
                    game actions. Handles what happens when a decision is made:
                    validate, record, execute, process effects. Recording is
                    automatic; every action routed through logic is captured
                    without the caller needing to think about it.
                  </p>
                  <ApiSection
                    id="logic"
                    methods={[
                      {
                        sig: "getAvailableActions(entity)",
                        desc: "action IDs entity can use",
                      },
                      {
                        sig: "getValidTargets(entity, actionId)",
                        desc: "valid targets for action",
                      },
                      {
                        sig: "getMoveTargets(entity)",
                        desc: "reachable tiles",
                      },
                      {
                        sig: "getAttackTargets(entity)",
                        desc: "valid attack targets",
                      },
                      {
                        sig: "isActionLegal(entity, actionId, target, params)",
                        desc: "validate",
                      },
                      {
                        sig: "executeAction(entity, actionId, target, params)",
                        desc: "execute, record, process effects",
                      },
                      { sig: "reset()", desc: "clear state" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    entityManager.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Entity CRUD, spatial queries, team management. Follows the
                    "position equals presence" rule: an entity with a position
                    is on the grid, nil position means off-grid. Tracks
                    acted/unacted state per turn.
                  </p>
                  <ApiSection
                    id="entityManager"
                    methods={[
                      {
                        sig: "spawn(entityType, gridX, gridY, team, extraData)",
                        desc: "create from registered type",
                      },
                      { sig: "destroy(entityId)", desc: "remove entity" },
                      {
                        sig: "moveEntity(entityId, newX, newY)",
                        desc: "update grid position",
                      },
                      {
                        sig: "setOffGrid(entityId)",
                        desc: "remove from grid, keep alive",
                      },
                      { sig: "getById(id)", desc: "single entity" },
                      {
                        sig: "getAtPosition(x, y)",
                        desc: "entity at grid position (default slot)",
                      },
                      {
                        sig: "getAllAtPosition(x, y)",
                        desc: "all entities across all slots",
                      },
                      {
                        sig: "getByTeam(team) / getByType(type)",
                        desc: "filtered queries",
                      },
                      {
                        sig: "getAll() / getAllOnGrid()",
                        desc: "all entities / only those with positions",
                      },
                      {
                        sig: "count(filterFn)",
                        desc: "count matching predicate",
                      },
                      {
                        sig: "modifyStat(entityId, stat, delta) / setStat(entityId, stat, value)",
                        desc: "stat mutation",
                      },
                      {
                        sig: "setFacing(entityId, direction)",
                        desc: "set facing n/e/s/w",
                      },
                      {
                        sig: "rotateFacings(steps)",
                        desc: "rotate all entity facings by N steps",
                      },
                      {
                        sig: "isSlotFree(x, y, slot) / isAreaFree(x, y, w, h, slot)",
                        desc: "multi-tile checks",
                      },
                      {
                        sig: "loadInto(cargoId, transportId) / unload(transportId, x, y)",
                        desc: "transport",
                      },
                      {
                        sig: "getVersion()",
                        desc: "increments on any mutation (dirty tracking)",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    entityRegistry.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Type definitions for entities. Games register their entity
                    types at boot via a config callback: stats, movement rules,
                    sprite references, whatever the game needs.
                  </p>
                  <ApiSection
                    id="entityRegistry"
                    methods={[
                      {
                        sig: "register(typeId, definition)",
                        desc: "register entity type",
                      },
                      { sig: "unregister(typeId)", desc: "remove type" },
                      {
                        sig: "isRegistered(typeId) / getType(typeId)",
                        desc: "type queries",
                      },
                      {
                        sig: "getAllTypes() / getTypeIds()",
                        desc: "all types",
                      },
                      { sig: "getTypesForTeam(team)", desc: "filter by team" },
                      {
                        sig: "validateSpawn(typeId, x, y, team)",
                        desc: "check spawn legality",
                      },
                      {
                        sig: "setSlots(slotList) / getSlots() / isValidSlot(slot)",
                        desc: "multi-slot support",
                      },
                      { sig: "reset()", desc: "clear all registrations" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    actionRegistry.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Action definitions with isAvailable, validate, and execute
                    functions. Games register their own actions (move, attack,
                    heal, capture, whatever). The engine handles the execution
                    pipeline; the game defines what actions exist and what they
                    do.
                  </p>
                  <ApiSection
                    id="actionRegistry"
                    methods={[
                      {
                        sig: "register(actionType, handler)",
                        desc: "register action with handler table",
                      },
                      {
                        sig: "isAvailable(actionType, entity)",
                        desc: "check handler's isAvailable",
                      },
                      {
                        sig: "validate(actionType, entity, target, params)",
                        desc: "check handler's validate",
                      },
                      {
                        sig: "execute(actionType, entity, target, params)",
                        desc: "run handler, returns effects[]",
                      },
                      {
                        sig: "getTargets(actionType, entity)",
                        desc: "custom target generation",
                      },
                      {
                        sig: "getCost(actionType, entity, target, params)",
                        desc: "action cost",
                      },
                      {
                        sig: "getLabel(actionType) / getHandler(actionType)",
                        desc: "queries",
                      },
                      { sig: "reset()", desc: "clear registrations" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    turnManager.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Turn counter, team rotation, turn lifecycle callbacks.
                    Straightforward bookkeeping.
                  </p>
                  <ApiSection
                    id="turnManager"
                    methods={[
                      {
                        sig: "getCurrentTurn() / getCurrentTeam()",
                        desc: "turn state",
                      },
                      {
                        sig: "hasActed(entityId) / markActed(entityId) / canAct(entityId)",
                        desc: "per-entity turn state",
                      },
                      {
                        sig: "getActableEntities()",
                        desc: "entities that haven't acted",
                      },
                      {
                        sig: "startTurn()",
                        desc: "begin turn, reset flags, fire condition ticks",
                      },
                      {
                        sig: "endTurn() / forceEndTurn()",
                        desc: "advance to next team/turn",
                      },
                      {
                        sig: "checkAutoAdvance()",
                        desc: "auto-end if all entities acted",
                      },
                      {
                        sig: "checkWinCondition()",
                        desc: "evaluate win, returns winner or nil",
                      },
                      {
                        sig: "setState(turn, team)",
                        desc: "restore from save",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    recording.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Captures every action as it executes. Core to the engine,
                    not opt-in. A recording is a list of decisions that can be
                    replayed to reproduce any game state. This is what makes
                    replay, undo, save/load, and network sync all the same
                    mechanism.
                  </p>
                  <ApiSection
                    id="recording"
                    methods={[
                      {
                        sig: "startRecording(seed) / stopRecording() / isRecording()",
                        desc: "session lifecycle",
                      },
                      {
                        sig: "record(actionData)",
                        desc: "record arbitrary action table",
                      },
                      {
                        sig: "bufferMove(unitId, fromX, fromY, toX, toY, path)",
                        desc: "buffer move data",
                      },
                      {
                        sig: "recordAttack(unitId, targetId)",
                        desc: "convenience",
                      },
                      {
                        sig: "recordWait(unitId) / recordCapture(...) / recordBuild(...)",
                        desc: "convenience helpers",
                      },
                      {
                        sig: "finalize()",
                        desc: "package recording with action count",
                      },
                      {
                        sig: "getActions() / getActionCount()",
                        desc: "access recorded data",
                      },
                      { sig: "popLastAction()", desc: "undo support" },
                      {
                        sig: "exportState() / importState(state)",
                        desc: "serialize/restore",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    seededRandom.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Deterministic RNG. All game randomness must go through this,
                    never math.random. Same seed, same sequence, every time.
                  </p>
                  <ApiSection
                    id="seededRandom"
                    methods={[
                      {
                        sig: "setSeed(newSeed) / getSeed()",
                        desc: "seed management",
                      },
                      { sig: "random()", desc: "float [0, 1)" },
                      {
                        sig: "randomInt(min, max)",
                        desc: "integer in range inclusive",
                      },
                      { sig: "randomFloat(min, max)", desc: "float in range" },
                      {
                        sig: "chance(percent)",
                        desc: "true with probability 1-100",
                      },
                      { sig: "pick(array)", desc: "random element" },
                      { sig: "shuffle(array)", desc: "in-place Fisher-Yates" },
                      {
                        sig: "getCallCount() / peek()",
                        desc: "debug: call count and state without advancing",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    effects.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Deterministic state change queue. Actions produce effects,
                    effects can chain (DAMAGE → DESTROY → DROP_ITEM). Processed
                    in order, always the same result. This is the first of the
                    two queues, the one that matters for game state.
                  </p>
                  <ApiSection
                    id="effects"
                    methods={[
                      {
                        sig: "registerHandler(effectType, handler)",
                        desc: "custom effect handler",
                      },
                      {
                        sig: "queue(effect) / queueAll(effects)",
                        desc: "add to pending",
                      },
                      {
                        sig: "processAll()",
                        desc: "drain queue, apply, fire hooks, cascade",
                      },
                      {
                        sig: "apply(effects)",
                        desc: "queue + processAll in one call",
                      },
                      {
                        sig: "getPendingCount() / clear()",
                        desc: "queue state",
                      },
                      {
                        sig: "setHooks(hooks) / setConditions(conditions)",
                        desc: "circular dep wiring",
                      },
                      { sig: "reset()", desc: "clear queue and handlers" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    animation.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The second queue: visual animations fed from processed
                    effects. Frame-based tween engine with sequential playback.
                    Entirely skippable via instantMode. Skip the animation queue
                    and the game state is identical.
                  </p>
                  <ApiSection
                    id="animation"
                    methods={[
                      {
                        sig: "add(anim)",
                        desc: "add {type, duration, onStart, onUpdate, onComplete}",
                      },
                      {
                        sig: "update()",
                        desc: "advance current animation one frame",
                      },
                      { sig: "isPlaying()", desc: "animation in progress" },
                      {
                        sig: "skipAll()",
                        desc: "fire all remaining onComplete immediately",
                      },
                      {
                        sig: "enqueueEffects(processedEffects, onComplete)",
                        desc: "bridge effects to visuals",
                      },
                      {
                        sig: "setOnQueueEmpty(callback)",
                        desc: "notification when queue drains",
                      },
                      { sig: "clear() / reset()", desc: "discard queue" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    hooks.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Event hooks: onDamaged, onDestroyed, onEntered, etc. Games
                    register callbacks for game-specific reactions to engine
                    events.
                  </p>
                  <ApiSection
                    id="hooks"
                    methods={[
                      {
                        sig: "fire(entity, hookName, ...)",
                        desc: "fire entity type + condition hooks, returns merged effects",
                      },
                      {
                        sig: "fireEntityHook(entity, hookName, ...)",
                        desc: "entity type hooks only",
                      },
                      {
                        sig: "fireConditionHooks(entityId, hookName, ...)",
                        desc: "condition hooks only",
                      },
                      {
                        sig: "fireExited(x, y, mover) / fireEntered(x, y, mover)",
                        desc: "positional hooks",
                      },
                      {
                        sig: "fireMoved(mover, fromX, fromY, toX, toY)",
                        desc: "movement hook",
                      },
                      {
                        sig: "fireAdjacent(entity, adjacentPositions)",
                        desc: "adjacency hook",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    conditions.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status effects. Apply, tick per turn, auto-remove on expiry.
                    Opt-in.
                  </p>
                  <ApiSection
                    id="conditions"
                    methods={[
                      {
                        sig: "registerDefinitions(defs) / registerDefinition(id, def)",
                        desc: "register condition types",
                      },
                      {
                        sig: "apply(entityId, conditionId, params, sourceId)",
                        desc: "apply condition, stacking rules",
                      },
                      {
                        sig: "remove(entityId, conditionId) / removeAll(entityId)",
                        desc: "remove conditions",
                      },
                      {
                        sig: "tick(entityId) / tickEnd(entityId)",
                        desc: "turn-start/end processing",
                      },
                      {
                        sig: "getActive(entityId) / hasCondition(entityId, conditionId)",
                        desc: "queries",
                      },
                      {
                        sig: "getStackCount(entityId, conditionId)",
                        desc: "stack count",
                      },
                      {
                        sig: "isActionBlocked(entityId)",
                        desc: "any condition blocks actions",
                      },
                      {
                        sig: "getStatMods(entityId)",
                        desc: "net stat modifiers from all conditions",
                      },
                      {
                        sig: "fireHook(entityId, hookName, ...)",
                        desc: "fire hooks on active conditions",
                      },
                      {
                        sig: "reset() / resetAll()",
                        desc: "clear instances / clear everything",
                      },
                    ]}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Game Layer */}
          <AccordionItem
            value="game"
            className="border rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Game Layer</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Everything game-specific. A new game replaces this folder
                entirely.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    config.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Single file defining all game data. Grid dimensions, entity
                    type definitions, action definitions, terrain rules, win
                    conditions, turn callbacks. This is the game. Everything
                    else is how it runs.
                  </p>
                  <ApiSection
                    id="config"
                    methods={[
                      {
                        sig: "registerEntities(entityRegistry)",
                        desc: "entity type definitions",
                      },
                      {
                        sig: "registerActions(actionRegistry)",
                        desc: "action handlers",
                      },
                      {
                        sig: "registerConditions(conditions)",
                        desc: "condition definitions",
                      },
                      {
                        sig: "registerSounds(audio)",
                        desc: "sample-based sound definitions",
                      },
                      {
                        sig: "registerSynth(synth)",
                        desc: "synth slots, styles, SFX events, beat callbacks",
                      },
                      {
                        sig: "registerCodec(compression)",
                        desc: "wire codec for network encoding",
                      },
                      {
                        sig: "registerScreens(sceneManager)",
                        desc: "screen registry",
                      },
                      {
                        sig: "generateGrid(config, gameState)",
                        desc: "custom grid shape/height generator",
                      },
                      {
                        sig: "onTurnStart(turnNumber, team)",
                        desc: "turn start callback",
                      },
                      {
                        sig: "onTurnEnd(turnNumber, team)",
                        desc: "turn end callback",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    screens/
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Scene manager with lifecycle (enter → update/draw → exit).
                    Each screen returns a scene name to trigger transitions.
                  </p>
                  <ApiSection
                    id="screens"
                    methods={[
                      { sig: "new(params)", desc: "construction" },
                      {
                        sig: "enter(params) or onEnter(params)",
                        desc: "after construction, before first update",
                      },
                      {
                        sig: "update()",
                        desc: "every frame, return screen name to transition",
                      },
                      {
                        sig: "exit() or onExit()",
                        desc: "cleanup sprites, timers, state",
                      },
                      {
                        sig: "drawOverlays()",
                        desc: "optional, after gfx.sprite.update()",
                      },
                      { sig: "draw()", desc: "must be empty — sprites only" },
                    ]}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Render & UI */}
          <AccordionItem
            value="render"
            className="border rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Render & UI</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Drawing, entity display, overlays. All rendering is
                sprite-based: if a player can see it, it's a sprite.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    render.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Core render orchestrator. Coordinates tile drawing, entity
                    sprites, focus indicators, and overlays into a unified
                    sprite-based pipeline.
                  </p>
                  <ApiSection
                    id="render"
                    methods={[
                      {
                        sig: "updateRenderState()",
                        desc: "per-frame update, delegates to all submodules",
                      },
                      {
                        sig: "setHudDataProvider(fn)",
                        desc: "game provides HUD data function",
                      },
                      { sig: "setTitleText(text)", desc: "title overlay" },
                      {
                        sig: "setMessage(text) / clearMessage()",
                        desc: "message overlay",
                      },
                      {
                        sig: "setGameOver(text) / clearGameOver()",
                        desc: "game over overlay",
                      },
                      {
                        sig: "getMovementPath()",
                        desc: "movement arrow's path for executeMove",
                      },
                      {
                        sig: "reset()",
                        desc: "rebuild submodules, handles flat↔elevated swap",
                      },
                      {
                        sig: "clearCaches()",
                        desc: "invalidate all submodule caches",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    renderUnits.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Entity sprite management. Smooth position interpolation for
                    movement, damage flash effects, draw mode toggling for
                    visual feedback.
                  </p>
                  <ApiSection
                    id="renderUnits"
                    methods={[
                      {
                        sig: "isAnimating()",
                        desc: "true during movement slides or idle loops",
                      },
                      {
                        sig: "update()",
                        desc: "collect unit sprites, advance animations",
                      },
                      {
                        sig: "reset() / clearCaches()",
                        desc: "rebuild/invalidate sprite caches",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    renderTile.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Individual tile rendering with terrain-aware drawing and
                    height support.
                  </p>
                  <ApiSection
                    id="renderTile"
                    methods={[
                      {
                        sig: "update()",
                        desc: "collect tile sprites with Z-sort",
                      },
                      {
                        sig: "reset() / clearCaches()",
                        desc: "rebuild/invalidate tile sprites",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    renderFocus.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cursor and selection highlighting. Visual feedback for the
                    currently focused tile and selected entities.
                  </p>
                  <ApiSection
                    id="renderFocus"
                    methods={[
                      { sig: "updatePulse()", desc: "advance pulse animation" },
                      { sig: "update()", desc: "collect focus sprites" },
                      {
                        sig: "reset() / clearCaches()",
                        desc: "rebuild/invalidate",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    renderIndicators.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Movement range overlays, attack target highlights, action
                    feedback indicators. The visual layer for decision-making.
                  </p>
                  <ApiSection
                    id="renderIndicators"
                    methods={[
                      {
                        sig: "update()",
                        desc: "collect indicator sprites based on battleState phase",
                      },
                      {
                        sig: "reset() / clearCaches()",
                        desc: "rebuild/invalidate diamond images",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    renderFlat.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cached image strategy for flat grids with no elevation.
                    Draws once, reuses until invalidated.
                  </p>
                  <ApiSection
                    id="renderFlat"
                    methods={[
                      { sig: "update()", desc: "collect tile sprites" },
                      {
                        sig: "reset() / clearCaches()",
                        desc: "rebuild/invalidate cached image",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    movementArrow.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Painted-path movement arrow. Self-manages lifecycle via
                    battleState phase observation. The displayed path IS the
                    executed path.
                  </p>
                  <ApiSection
                    id="movementArrow"
                    methods={[
                      {
                        sig: "getPath()",
                        desc: "returns displayed path array — this is the executed path",
                      },
                      {
                        sig: "update()",
                        desc: "per-frame: extend/backtrack/snap path, manage sprites",
                      },
                      {
                        sig: "reset() / clearCaches()",
                        desc: "clear path state and sprites",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    infoPanel.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cursor hover queries. Reports tile info and entities at the
                    current focus position. The UI reads from this; it doesn't
                    query the grid directly.
                  </p>
                  <ApiSection
                    id="infoPanel"
                    methods={[
                      { sig: "update(x, y)", desc: "refresh for new position" },
                      {
                        sig: "getPosition() / getX() / getY()",
                        desc: "cursor position",
                      },
                      {
                        sig: "getTile() / tileExists() / getTileHeight() / getTileTerrain()",
                        desc: "tile queries",
                      },
                      {
                        sig: "getEntities() / getPrimaryEntity() / hasEntity()",
                        desc: "entities at cursor",
                      },
                      {
                        sig: "getEntityOfType(type) / getEntitiesByTeam(team)",
                        desc: "filtered entity queries",
                      },
                      {
                        sig: "hasHostile(team) / hasFriendly(team)",
                        desc: "team checks",
                      },
                      {
                        sig: "getSelectableEntities() / hasSelectableEntity()",
                        desc: "selectable entity queries",
                      },
                      {
                        sig: "getUnit() / getItem() / getStructure()",
                        desc: "named slot convenience",
                      },
                      { sig: "isPassableFor(entity)", desc: "movement check" },
                      {
                        sig: "getAll()",
                        desc: "full dump: position, tile, entities, terrain",
                      },
                    ]}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* System */}
          <AccordionItem
            value="system"
            className="border rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">System</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Input, logging, save/load, audio, settings, messaging,
                compression.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    input.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Single input controller for all screens. Events use hardware
                    names (A, B, UP, DOWN, LEFT, RIGHT, CRANK_CW, CRANK_CCW).
                    Supports keyed block reasons so multiple systems can
                    block/unblock input independently without stepping on each
                    other. Menu button is a system event, not an input.
                  </p>
                  <ApiSection
                    id="input"
                    methods={[
                      {
                        sig: "update()",
                        desc: "poll hardware, call once per frame",
                      },
                      {
                        sig: "pressed(event) / held(event)",
                        desc: "frame-exact and held checks",
                      },
                      {
                        sig: "getCrankChange()",
                        desc: "raw crank degrees this frame",
                      },
                      {
                        sig: "on(event, callback, context)",
                        desc: "register listener scoped to context",
                      },
                      {
                        sig: "setContext(name) / getContext() / clearContext(context)",
                        desc: "context system",
                      },
                      {
                        sig: "block(reason) / unblock(reason) / isBlocked(reason)",
                        desc: "keyed blocking",
                      },
                      { sig: "reset()", desc: "clear all state" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    logger.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Leveled logging (DEBUG/INFO/WARN/ERROR) with category
                    filtering. Global as Log, one of only two globals in the
                    engine.
                  </p>
                  <ApiSection
                    id="logger"
                    methods={[
                      {
                        sig: "debug(module, msg, ...) / info / warn / error",
                        desc: "log at level",
                      },
                      { sig: "setLevel(level)", desc: "minimum output level" },
                      {
                        sig: "enableModule(name) / disableModule(name)",
                        desc: "filter by module",
                      },
                      {
                        sig: "system(name) / module(name) / section(name)",
                        desc: "section markers",
                      },
                      {
                        sig: "transition(module, from, to)",
                        desc: "state transition log",
                      },
                      {
                        sig: "phaseChange(module, newPhase)",
                        desc: "battle phase log",
                      },
                      {
                        sig: "action(module, actionType, details)",
                        desc: "action execution log",
                      },
                      {
                        sig: "table(module, name, t, maxDepth)",
                        desc: "dump table contents",
                      },
                      {
                        sig: "enableScreenOutput(enabled, maxLines)",
                        desc: "on-screen debug display",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    compression.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    State string pack/unpack for network wire format. Base62
                    encoding, bitmask packing, path encoding. The client-side
                    half of the codec system, roughly 3.5× compression over raw
                    JSON.
                  </p>
                  <ApiSection
                    id="compression"
                    methods={[
                      {
                        sig: "toBase62(number, minLength) / fromBase62(str)",
                        desc: "Base62 encode/decode",
                      },
                      {
                        sig: "toBitmask(flags, flagOrder) / fromBitmask(mask, flagOrder)",
                        desc: "bitmask pack/unpack",
                      },
                      {
                        sig: "registerCodec(codec) / setActiveCodec(codecId)",
                        desc: "codec registry",
                      },
                      {
                        sig: "packRecording(turnData) / unpackRecording(encoded)",
                        desc: "turn data codec",
                      },
                      {
                        sig: "packState(stateTable) / unpackState(encoded)",
                        desc: "state codec",
                      },
                      {
                        sig: "buildSubmitBody(turnData)",
                        desc: "package for network submission",
                      },
                      { sig: "reset()", desc: "clear codecs" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    save.lua + saveSchema.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Slot-based save I/O. Engine handles file operations; games
                    implement their own serialize/deserialize/validate/migrate
                    schema.
                  </p>
                  <ApiSection
                    id="save"
                    methods={[
                      {
                        sig: "loadCurrent() / saveCurrent(data)",
                        desc: "current.json (player identity, settings)",
                      },
                      {
                        sig: "generateRandomName() / assignRandomUserData(data)",
                        desc: "new player setup",
                      },
                      {
                        sig: "save(slot, data) / load(slot) / delete(slot)",
                        desc: "numbered save slots",
                      },
                      {
                        sig: "getSlotInfo(slot) / getAllSlotInfo()",
                        desc: "slot metadata",
                      },
                      {
                        sig: "saveReplay(modeKey, recording) / loadReplay(modeKey)",
                        desc: "high-score replays",
                      },
                      {
                        sig: "saveNumberedReplay(recording)",
                        desc: "auto-incrementing replay save",
                      },
                      {
                        sig: "listAllReplays()",
                        desc: "all replays with metadata",
                      },
                      {
                        sig: "loadReplayByFilename(filename) / deleteReplayByFilename(filename)",
                        desc: "direct replay access",
                      },
                      {
                        sig: "SaveSchema.create({serialize, deserialize, validate, migrate})",
                        desc: "schema constructor",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    analogRecording.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Time-quantized analog input recording for crank and
                    continuous inputs. Fixed tick rate, frame-rate independent,
                    deterministic.
                  </p>
                  <ApiSection
                    id="analogRecording"
                    methods={[
                      {
                        sig: "startRecording(seed) / stopRecording()",
                        desc: "session lifecycle",
                      },
                      {
                        sig: "recordFrame(crankChange)",
                        desc: "per-frame, returns ticks emitted",
                      },
                      {
                        sig: "liveTickStep()",
                        desc: "consume one tick during live play, returns crank value",
                      },
                      {
                        sig: "recordButton(button, event)",
                        desc: "sparse button event at current tick",
                      },
                      {
                        sig: "startReplay(recording)",
                        desc: "begin playback, returns seed",
                      },
                      {
                        sig: "replayFrame()",
                        desc: "per-frame replay, returns crank/buttons/finished",
                      },
                      {
                        sig: "replayTickStep()",
                        desc: "advance one tick exactly",
                      },
                      {
                        sig: "seekToTick(targetTick)",
                        desc: "reset counters for re-sim to target",
                      },
                      {
                        sig: "getCurrentTick() / getTotalTicks() / getTickInterval()",
                        desc: "position queries",
                      },
                      {
                        sig: "isRecording() / isReplaying() / isIdle()",
                        desc: "state checks",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    messaging.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Five message types: banner, modal, confirm, toast, status.
                    Sprite-based rendering with state machines and animation.
                    Games override rendering via custom builder functions in
                    config.
                  </p>
                  <ApiSection
                    id="messaging"
                    methods={[
                      {
                        sig: "showBanner(text, options) / dismissBanner()",
                        desc: "slide-in banner",
                      },
                      {
                        sig: "showModal(title, options) / dismissModal()",
                        desc: "centered dialog with buttons",
                      },
                      {
                        sig: "showConfirm(text, options)",
                        desc: "two-button confirmation",
                      },
                      {
                        sig: "showToast(text, options) / dismissToast()",
                        desc: "brief notification",
                      },
                      {
                        sig: "showSubmitting() / showSubmitted(cb) / showSubmitFailed(cb)",
                        desc: "network status",
                      },
                      {
                        sig: "update()",
                        desc: "advance animations/timers each frame",
                      },
                      {
                        sig: "isInputBlocked() / hasActiveMessage()",
                        desc: "state queries",
                      },
                      {
                        sig: "dismissAll() / cleanup()",
                        desc: "clear everything",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    audio.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sample-based audio. WAV/ADPCM via sampleplayer (RAM, instant
                    trigger) and fileplayer (disk streaming, for music).
                    Declarative registration.
                  </p>
                  <ApiSection
                    id="audio"
                    methods={[
                      {
                        sig: "register(id, {file, volume, loops, stream})",
                        desc: "register sound definition",
                      },
                      { sig: "loadAll()", desc: "load all samples into RAM" },
                      {
                        sig: "play(id, overrides) / stop(id)",
                        desc: "playback",
                      },
                      {
                        sig: "stopAll() / stopMusic()",
                        desc: "stop all / stop streamed only",
                      },
                      {
                        sig: "setSoundVolume(level) / setMusicVolume(level)",
                        desc: "master volumes 0-1",
                      },
                      {
                        sig: "isPlaying(id) / isRegistered(id)",
                        desc: "queries",
                      },
                      {
                        sig: "reset()",
                        desc: "stop everything, release references",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    synth.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Procedural audio. Permanent synth channels, style system,
                    beat clock, SFX events. Coexists with audio.lua for
                    sample-based sounds.
                  </p>
                  <ApiSection
                    id="synth"
                    methods={[
                      {
                        sig: "addMusicSlots(names) / addSfxSlots(names, defs)",
                        desc: "declare voice slots",
                      },
                      {
                        sig: "configureSfxSlot(name, voiceDef)",
                        desc: "configure SFX slot voice",
                      },
                      {
                        sig: "registerStyle(name, styleDef)",
                        desc: "named voice definition collection",
                      },
                      {
                        sig: "registerSfxEvent(name, {slot, note, vel, dur})",
                        desc: "named SFX trigger",
                      },
                      {
                        sig: "onBeat(callback)",
                        desc: "register beat callback fn(beat, beatLength)",
                      },
                      {
                        sig: "loadStyle(name)",
                        desc: "reconfigure all music slots from style",
                      },
                      {
                        sig: "playNote(slotName, midiNote, velocity, duration)",
                        desc: "fire note on any slot",
                      },
                      {
                        sig: "sfx(eventName)",
                        desc: "fire registered SFX event",
                      },
                      {
                        sig: "setBPM(bpm) / startClock() / stopClock()",
                        desc: "beat clock control",
                      },
                      {
                        sig: "setMusicVolume(level) / setSfxVolume(level)",
                        desc: "volume control",
                      },
                      {
                        sig: "fadeOut(duration)",
                        desc: "ramp music to silence",
                      },
                      {
                        sig: "update(dt)",
                        desc: "per-frame: fade + beat clock",
                      },
                      {
                        sig: "getStyle() / getStyleName() / isSlotActive(name)",
                        desc: "queries",
                      },
                      {
                        sig: "stop() / stopAll() / reset()",
                        desc: "silence and teardown",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    sceneManager.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Screen lifecycle management. Handles exit → sprite cleanup →
                    construct → enter.
                  </p>
                  <ApiSection
                    id="sceneManager"
                    methods={[
                      {
                        sig: "registerScreen(name, screenClass)",
                        desc: "add screen to registry",
                      },
                      {
                        sig: "changeScreen(screenName, params)",
                        desc: "full transition lifecycle",
                      },
                      {
                        sig: "update()",
                        desc: "call active screen's update, handle transitions",
                      },
                      {
                        sig: "drawOverlays()",
                        desc: "call active screen's drawOverlays",
                      },
                      {
                        sig: "getActiveScreenName() / isRegistered(name)",
                        desc: "queries",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    settings.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Persistent key-value settings. Stub — save/load not yet
                    implemented.
                  </p>
                  <ApiSection
                    id="settings"
                    methods={[
                      { sig: "get(key) / set(key, value)", desc: "read/write" },
                      { sig: "save() / load()", desc: "stub — no-op" },
                      { sig: "reset()", desc: "clear to defaults" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    achievements.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Achievement tracking. Stub — no persistence yet.
                  </p>
                  <ApiSection
                    id="achievements"
                    methods={[
                      {
                        sig: "registerDefinitions(definitions)",
                        desc: "bulk register",
                      },
                      {
                        sig: "unlock(achievementId) / isUnlocked(achievementId)",
                        desc: "grant and check",
                      },
                      { sig: "getUnlocked()", desc: "all unlocked IDs" },
                      { sig: "reset()", desc: "clear unlocks" },
                    ]}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Network */}
          <AccordionItem
            value="network"
            className="border rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Network</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Online async multiplayer. Three rules: singleton socket,
                Connection: close header, atomic requests. Extracted from a
                shipped game, not invented in a vacuum.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    manager.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    HTTP primitives. WiFi gating, auth header injection, game
                    slug path construction. Everything else in the network layer
                    goes through this.
                  </p>
                  <ApiSection
                    id="manager"
                    methods={[
                      {
                        sig: "request(owner, method, path, headers, body, callback, retryCount)",
                        desc: "raw HTTP request",
                      },
                      {
                        sig: "get(owner, path, headers, callback)",
                        desc: "GET shorthand",
                      },
                      {
                        sig: "post(owner, path, headers, body, callback)",
                        desc: "POST shorthand",
                      },
                      {
                        sig: "delete(owner, path, headers, callback)",
                        desc: "DELETE shorthand",
                      },
                      { sig: "isAvailable()", desc: "WiFi available" },
                      {
                        sig: "isPermissionDenied() / clearPermissionDenied()",
                        desc: "WiFi permission",
                      },
                      {
                        sig: "closeActiveConnection()",
                        desc: "abort in-flight request",
                      },
                      {
                        sig: "isActive() / getActiveOwner()",
                        desc: "connection state",
                      },
                      { sig: "reset()", desc: "close connection, clear state" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    registration.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Device registration with auto-retry on SSL/NTP errors
                    (common on Playdate cold boot). Stores credentials via
                    dataStore. Deterministic tokens from serial number via
                    HMAC-SHA256.
                  </p>
                  <ApiSection
                    id="registration"
                    methods={[
                      {
                        sig: "register(displayName, avatar, callback)",
                        desc: "register new device",
                      },
                      {
                        sig: "updateProfile(displayName, avatar, callback)",
                        desc: "update profile",
                      },
                      {
                        sig: "loadCredentials() / clearCredentials()",
                        desc: "credential persistence",
                      },
                      { sig: "isRegistered()", desc: "has valid credentials" },
                      {
                        sig: "getDeviceId() / getSecretToken() / getDisplayName() / getAvatar()",
                        desc: "credential reads",
                      },
                      {
                        sig: "getAuthHeaders()",
                        desc: "{X-Device-ID, X-Secret-Token}",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    ping.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Two pings: a public GET for version check and server status,
                    and an authenticated POST for presence tracking.
                  </p>
                  <ApiSection
                    id="ping"
                    methods={[
                      { sig: "check(callback)", desc: "ping server" },
                      {
                        sig: "presence(message, callback)",
                        desc: "authenticated presence ping",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    lobby.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Battle list with cursor pagination, create/join/cancel.
                    Headless: the engine handles state, pagination, caching, and
                    API calls. The game handles rendering and button mapping.
                  </p>
                  <ApiSection
                    id="lobby"
                    methods={[
                      {
                        sig: "loadBattles(params, callback)",
                        desc: "fetch battle list with cursor pagination",
                      },
                      {
                        sig: "loadBattleDetail(battleId, callback)",
                        desc: "single battle details",
                      },
                      {
                        sig: "loadBattleTurns(battleId, callback)",
                        desc: "turn history",
                      },
                      {
                        sig: "createBattle(settings, callback)",
                        desc: "create new battle",
                      },
                      {
                        sig: "joinBattle(battleId, callback)",
                        desc: "join existing",
                      },
                      {
                        sig: "forfeitBattle(battleId, callback)",
                        desc: "forfeit",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    submitter.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Turn submission with codec encoding. Single-flight (won't
                    send a second request while one is in progress), built-in
                    retry logic.
                  </p>
                  <ApiSection
                    id="submitter"
                    methods={[
                      {
                        sig: "submit(battleId, turnNumber, turnData, callback)",
                        desc: "submit turn data",
                      },
                      { sig: "isSubmitting()", desc: "in-flight check" },
                      { sig: "getLastSubmittedTurn()", desc: "turn number" },
                      { sig: "cancel()", desc: "abort submission" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    poller.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Incremental turn polling. Asks the server "anything new
                    since turn N?" on a configurable interval. Marks turns as
                    applied so it doesn't re-fetch.
                  </p>
                  <ApiSection
                    id="poller"
                    methods={[
                      {
                        sig: "start(battleId, callback)",
                        desc: "begin polling for opponent turns",
                      },
                      { sig: "stop()", desc: "stop polling" },
                      { sig: "scheduleNext()", desc: "queue next poll" },
                      {
                        sig: "markApplied(turnNumber)",
                        desc: "mark turn processed",
                      },
                      {
                        sig: "getLastAppliedTurn() / isPolling()",
                        desc: "state queries",
                      },
                      {
                        sig: "setPollInterval(ms) / resetTurnTracking()",
                        desc: "configuration",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    connectionStatus.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    WiFi state tracking, connection quality assessment,
                    reconnect detection.
                  </p>
                  <ApiSection
                    id="connectionStatus"
                    methods={[
                      {
                        sig: "reportSuccess() / reportFailure(errorMsg)",
                        desc: "update connection health",
                      },
                      {
                        sig: "getStatus()",
                        desc: "connected / degraded / disconnected",
                      },
                      {
                        sig: "getLastError() / getFailureCount()",
                        desc: "error state",
                      },
                      {
                        sig: "onStatusChanged(callback)",
                        desc: "transition notification",
                      },
                      { sig: "reset()", desc: "clear state" },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    leaderboard.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Score submission and rankings retrieval. Supports
                    time-period filtering.
                  </p>
                  <ApiSection
                    id="leaderboard"
                    methods={[
                      {
                        sig: "getScores(params, callback)",
                        desc: "fetch leaderboard with category/limit/cursor",
                      },
                      {
                        sig: "submitScore(scoreData, callback)",
                        desc: "submit {score, category, metadata}",
                      },
                      {
                        sig: "getScoreById(scoreId, callback)",
                        desc: "fetch single score with metadata",
                      },
                    ]}
                  />
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    dataStore.lua
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Key-value storage via coordinate.games data API. Private and
                    public scopes.
                  </p>
                  <ApiSection
                    id="dataStore"
                    methods={[
                      { sig: "get(key, callback)", desc: "read value" },
                      {
                        sig: "list(params, callback)",
                        desc: "list keys with scope/prefix/limit",
                      },
                      {
                        sig: "set(key, value, scope, callback)",
                        desc: "write value, scope: private/public",
                      },
                      { sig: "delete(key, callback)", desc: "remove key" },
                    ]}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Config Surface */}
          <AccordionItem
            value="config-surface"
            className="border rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Config Surface</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Everything a game controls through{" "}
                <code className="bg-muted px-1 rounded">config.lua</code>. The
                config table is a shared mutable reference passed to every
                engine module. Modules merge their defaults under game values —
                game values always win.
              </p>
              <div className="space-y-3">
                {/* Grid Geometry */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-2">
                    Grid Geometry
                  </p>
                  <div className="space-y-0">
                    <ConfigKey
                      name="gridWidth"
                      defaultVal="8"
                      modules="grid, projection, render"
                      effect="Grid column count"
                    />
                    <ConfigKey
                      name="gridLength"
                      defaultVal="8"
                      modules="grid, projection, render"
                      effect="Grid row count"
                    />
                    <ConfigKey
                      name="tileWidth"
                      defaultVal="24"
                      modules="projection"
                      effect="Pixel width of a tile at rotation 0. Controls overall grid scale"
                    />
                    <ConfigKey
                      name="tileThickness"
                      defaultVal="0"
                      modules="projection, renderTile"
                      effect="Pixels per height unit for side face extrusion. 0 = no sides"
                    />
                    <ConfigKey
                      name="centerX"
                      defaultVal="200"
                      modules="projection"
                      effect="Screen X origin for grid center"
                    />
                    <ConfigKey
                      name="centerY"
                      defaultVal="120"
                      modules="projection"
                      effect="Screen Y origin for grid center"
                    />
                  </div>
                </div>

                {/* Camera and Rotation */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-2">
                    Camera & Rotation
                  </p>
                  <div className="space-y-0">
                    <ConfigKey
                      name="initialRotation"
                      defaultVal="45"
                      modules="projection"
                      effect="Starting rotation angle in degrees"
                    />
                    <ConfigKey
                      name="viewAngle"
                      defaultVal="30"
                      modules="projection"
                      effect="Vertical tilt angle in degrees"
                    />
                    <ConfigKey
                      name="rotationSpeed"
                      defaultVal="5"
                      modules="grid"
                      effect="Degrees per frame during animated rotation"
                    />
                    <ConfigKey
                      name="enablePerspective"
                      defaultVal="false"
                      modules="projection"
                      effect="True = 3D perspective, false = orthographic isometric"
                    />
                    <ConfigKey
                      name="projectionScale"
                      defaultVal="1.0"
                      modules="projection"
                      effect="Output scale multiplier"
                    />
                    <ConfigKey
                      name="focalLength"
                      defaultVal="1500"
                      modules="projection"
                      effect="Perspective focal length. Higher = less foreshortening"
                    />
                    <ConfigKey
                      name="vanishingPointYOffset"
                      defaultVal="0"
                      modules="projection"
                      effect="Shifts horizon line up (negative) or down (positive)"
                    />
                    <ConfigKey
                      name="nearClipDistance"
                      defaultVal="10"
                      modules="projection"
                      effect="Prevents divide-by-zero in perspective"
                    />
                  </div>
                </div>

                {/* Height System */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-2">
                    Height System
                  </p>
                  <div className="space-y-0">
                    <ConfigKey
                      name="hasElevation"
                      defaultVal="false"
                      modules="grid, render, renderTile"
                      effect="Enables height map, per-tile sprites, side faces. render.lua swaps tile factory at runtime"
                    />
                    <ConfigKey
                      name="minHeight"
                      defaultVal="0"
                      modules="grid"
                      effect="Floor height value for tiles with no heightMap entry"
                    />
                    <ConfigKey
                      name="enableOcclusion"
                      defaultVal="false"
                      modules="grid"
                      effect="Quadrant-based tile occlusion for elevated grids"
                    />
                    <ConfigKey
                      name="occlusionThreshold"
                      defaultVal="2"
                      modules="grid"
                      effect="Taller neighbors required to mark a tile occluded"
                    />
                    <ConfigKey
                      name="occlusionHeightDelta"
                      defaultVal="2"
                      modules="grid"
                      effect="Height delta required for neighbor to count as occluding"
                    />
                  </div>
                </div>

                {/* Terrain */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-2">
                    Terrain & Tile Rendering
                  </p>
                  <div className="space-y-0">
                    <ConfigKey
                      name="terrainPatterns"
                      defaultVal="{}"
                      modules="renderFlat, renderTile"
                      effect="Map of terrain key → 8-byte dither pattern for tile top faces"
                    />
                    <ConfigKey
                      name="sideDitherNS"
                      defaultVal="{0xAA,0x55,...}"
                      modules="renderTile"
                      effect="Dither pattern for north/south side faces on elevated tiles"
                    />
                    <ConfigKey
                      name="sideDitherEW"
                      defaultVal="{0x88,0x22,...}"
                      modules="renderTile"
                      effect="Dither for east/west side faces. Must differ from NS for depth cue"
                    />
                  </div>
                </div>

                {/* Entity System */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-2">
                    Entity System
                  </p>
                  <div className="space-y-0">
                    <ConfigKey
                      name="enableFacing"
                      defaultVal="nil"
                      modules="entityManager, battleState"
                      effect="Entities spawn with facing. CHOOSING_FACING phase after moves. Camera-rotation sync"
                    />
                    <ConfigKey
                      name="unitBaseYOffset"
                      defaultVal="0"
                      modules="renderUnits"
                      effect="Global Y pixel offset for unit sprites. Negative = up"
                    />
                    <ConfigKey
                      name="teamCount"
                      defaultVal="2"
                      modules="turnManager"
                      effect="Number of teams. Win condition checks all teams 1 through N"
                    />
                  </div>
                </div>

                {/* Input + Camera Pan */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-2">
                    Input & Camera
                  </p>
                  <div className="space-y-0">
                    <ConfigKey
                      name="crankThreshold"
                      defaultVal="10"
                      modules="input"
                      effect="Minimum crank degrees to register as CRANK_CW/CCW event"
                    />
                    <ConfigKey
                      name="panEdgeMargin"
                      defaultVal="60"
                      modules="cameraPan"
                      effect="Pixels from screen edge before camera pans to keep cursor visible"
                    />
                    <ConfigKey
                      name="screenWidth"
                      defaultVal="400"
                      modules="cameraPan"
                      effect="Screen width for edge detection"
                    />
                    <ConfigKey
                      name="screenHeight"
                      defaultVal="240"
                      modules="cameraPan"
                      effect="Screen height for edge detection"
                    />
                  </div>
                </div>

                {/* Save */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-2">
                    Save System
                  </p>
                  <div className="space-y-0">
                    <ConfigKey
                      name="slotCount"
                      defaultVal="3"
                      modules="save"
                      effect="Number of save slots"
                    />
                    <ConfigKey
                      name="savePath"
                      defaultVal="saves/"
                      modules="save"
                      effect="Playdate datastore path prefix"
                    />
                    <ConfigKey
                      name="defaultAvatar"
                      defaultVal="BIRD1"
                      modules="save"
                      effect="Fallback avatar key for new players"
                    />
                    <ConfigKey
                      name="adjectives"
                      defaultVal="[5 words]"
                      modules="save"
                      effect="Word list for random name generation (first word)"
                    />
                    <ConfigKey
                      name="nouns"
                      defaultVal="[5 words]"
                      modules="save"
                      effect="Word list for random name generation (second word)"
                    />
                    <ConfigKey
                      name="highScoreKeys"
                      defaultVal="[]"
                      modules="save"
                      effect="Mode key strings for high-score replay slots"
                    />
                  </div>
                </div>

                {/* Audio + Synth + Analog */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-2">
                    Audio & Recording
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    audio.lua has no config keys — all setup through
                    registerSounds callback.
                  </p>
                  <div className="space-y-0">
                    <ConfigKey
                      name="masterVolume"
                      defaultVal="0.7"
                      modules="synth"
                      effect="Volume multiplier for all voice definitions"
                    />
                    <ConfigKey
                      name="defaultBPM"
                      defaultVal="120"
                      modules="synth"
                      effect="Starting beats per minute for beat clock"
                    />
                    <ConfigKey
                      name="tickRate"
                      defaultVal="50"
                      modules="analogRecording"
                      effect="Samples per second for crank/input recording"
                    />
                  </div>
                </div>

                {/* First Person */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-2">
                    First Person Renderers
                  </p>
                  <div className="space-y-0">
                    <ConfigKey
                      name="maxDepth"
                      defaultVal="4"
                      modules="firstPerson"
                      effect="Maximum tile depth in simple first-person view"
                    />
                    <ConfigKey
                      name="focalDepth"
                      defaultVal="1.5"
                      modules="firstPerson"
                      effect="Perspective tuning. Higher = less narrowing"
                    />
                    <ConfigKey
                      name="maxRayDist"
                      defaultVal="8"
                      modules="firstPersonRaycast"
                      effect="Maximum ray travel distance in tiles"
                    />
                    <ConfigKey
                      name="fov"
                      defaultVal="66"
                      modules="firstPersonRaycast"
                      effect="Field of view in degrees"
                    />
                    <ConfigKey
                      name="wallHeight"
                      defaultVal="1.0"
                      modules="firstPersonRaycast"
                      effect="Wall height multiplier"
                    />
                    <ConfigKey
                      name="stripWidth"
                      defaultVal="4"
                      modules="firstPersonRaycast"
                      effect="Pixels per ray column. 4=100 rays, 2=200, 1=400"
                    />
                  </div>
                </div>

                {/* Network */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-2">
                    Network
                  </p>
                  <div className="space-y-0">
                    <ConfigKey
                      name="serverUrl"
                      defaultVal="localhost"
                      modules="manager"
                      effect="Server hostname (no protocol prefix)"
                    />
                    <ConfigKey
                      name="serverPort"
                      defaultVal="443"
                      modules="manager"
                      effect="Port number"
                    />
                    <ConfigKey
                      name="useSSL"
                      defaultVal="true"
                      modules="manager"
                      effect="Enable TLS"
                    />
                    <ConfigKey
                      name="connectTimeout"
                      defaultVal="10"
                      modules="manager"
                      effect="Seconds before connection attempt fails"
                    />
                    <ConfigKey
                      name="requestTimeout"
                      defaultVal="15000"
                      modules="manager"
                      effect="Milliseconds before safety timer kills request"
                    />
                    <ConfigKey
                      name="maxRetries"
                      defaultVal="2"
                      modules="manager"
                      effect="Retry count on truncated responses"
                    />
                    <ConfigKey
                      name="pingPath"
                      defaultVal="/api/ping"
                      modules="ping"
                      effect="Server ping endpoint"
                    />
                    <ConfigKey
                      name="registerPath"
                      defaultVal="/api/.../register"
                      modules="registration"
                      effect="Device registration endpoint"
                    />
                    <ConfigKey
                      name="battlesPath"
                      defaultVal="/api/.../battles"
                      modules="lobby, submitter, poller"
                      effect="Battle CRUD endpoint base path"
                    />
                    <ConfigKey
                      name="scoresPath"
                      defaultVal="/api/.../scores"
                      modules="leaderboard"
                      effect="Leaderboard endpoint"
                    />
                    <ConfigKey
                      name="dataPath"
                      defaultVal="/api/.../data"
                      modules="dataStore"
                      effect="Key-value data endpoint"
                    />
                    <ConfigKey
                      name="codec"
                      defaultVal="nil"
                      modules="compression"
                      effect='Active codec ID. "json" or nil = no encoding'
                    />
                    <ConfigKey
                      name="credentialKey"
                      defaultVal="parrot_credentials"
                      modules="registration"
                      effect="Playdate datastore key for device credentials"
                    />
                    <ConfigKey
                      name="pollInterval"
                      defaultVal="5000"
                      modules="poller"
                      effect="Milliseconds between opponent turn polls"
                    />
                    <ConfigKey
                      name="failureThreshold"
                      defaultVal="2"
                      modules="connectionStatus"
                      effect='Consecutive failures before "disconnected"'
                    />
                  </div>
                </div>

                {/* Messaging */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-2">
                    Messaging
                  </p>
                  <div className="space-y-0">
                    <ConfigKey
                      name="zIndex.overlay/banner/modal/toast"
                      defaultVal="25-28K"
                      modules="messaging"
                      effect="Z-index layers for message sprites"
                    />
                    <ConfigKey
                      name="banner.font"
                      defaultVal="nil (system)"
                      modules="messaging"
                      effect="Font for banner text"
                    />
                    <ConfigKey
                      name="banner.defaultDuration"
                      defaultVal="1000"
                      modules="messaging"
                      effect="Milliseconds before auto-dismiss. 0 = stays"
                    />
                    <ConfigKey
                      name="banner.animationDuration"
                      defaultVal="300"
                      modules="messaging"
                      effect="Slide in/out animation ms"
                    />
                    <ConfigKey
                      name="banner.height"
                      defaultVal="50"
                      modules="messaging"
                      effect="Banner image height in pixels"
                    />
                    <ConfigKey
                      name="bannerPresets"
                      defaultVal="{}"
                      modules="messaging"
                      effect="Named preset table for canned banner styles"
                    />
                    <ConfigKey
                      name="modal.width/padding/cornerRadius"
                      defaultVal="280/15/8"
                      modules="messaging"
                      effect="Modal dialog dimensions"
                    />
                    <ConfigKey
                      name="modal.buttonHeight"
                      defaultVal="24"
                      modules="messaging"
                      effect="Height per button row"
                    />
                    <ConfigKey
                      name="confirm.buttonWidth/height/gap"
                      defaultVal="50/28/12"
                      modules="messaging"
                      effect="Confirm dialog dimensions"
                    />
                    <ConfigKey
                      name="toast.maxWidth/defaultDuration/height"
                      defaultVal="200/1200/36"
                      modules="messaging"
                      effect="Toast dimensions and timing"
                    />
                    <ConfigKey
                      name="builders"
                      defaultVal="{}"
                      modules="messaging"
                      effect="Custom image builder functions (see below)"
                    />
                  </div>
                </div>

                {/* Messaging Builders */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    Messaging Custom Builders
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Game provides functions that produce gfx.image objects.
                    Module handles all sprite lifecycle, positioning, animation,
                    and input. Builders only produce images.
                  </p>
                  <div className="border-l-2 border-border pl-3 space-y-0">
                    <ShapeField
                      name="builders.banner"
                      effect="fn(text, cfg) → gfx.image (400 × banner.height)"
                    />
                    <ShapeField
                      name="builders.modal"
                      effect="fn(title, body, buttons, selectedIndex, cfg) → gfx.image"
                    />
                    <ShapeField
                      name="builders.confirm"
                      effect="fn(text, buttons, selectedIndex, cfg) → gfx.image"
                    />
                    <ShapeField
                      name="builders.toast"
                      effect="fn(text, cfg) → gfx.image"
                    />
                    <ShapeField
                      name="builders.status"
                      effect="fn(text, cfg) → gfx.image"
                    />
                    <ShapeField
                      name="builders.overlay"
                      effect="fn(cfg) → gfx.image (400×240)"
                    />
                  </div>
                </div>

                {/* Registration Callbacks */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    Registration Callbacks
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Functions on the config table that main.lua calls during
                    init. All optional — omitting a callback means that system
                    initializes empty.
                  </p>
                  <div className="border-l-2 border-border pl-3 space-y-0">
                    <ShapeField
                      name="registerEntities(entityRegistry)"
                      effect="Register entity type definitions"
                    />
                    <ShapeField
                      name="registerActions(actionRegistry)"
                      effect="Register action handlers"
                    />
                    <ShapeField
                      name="registerConditions(conditions)"
                      effect="Register condition definitions"
                    />
                    <ShapeField
                      name="registerSounds(audio)"
                      effect="Sample-based sound definitions. loadAll() called after"
                    />
                    <ShapeField
                      name="registerSynth(synth)"
                      effect="Slots, styles, SFX events, beat callbacks"
                    />
                    <ShapeField
                      name="registerCodec(compression)"
                      effect="Wire codec for network encoding"
                    />
                    <ShapeField
                      name="registerScreens(sceneManager)"
                      effect="Game screen registry"
                    />
                    <ShapeField
                      name="generateGrid(config, gameState)"
                      effect="Return {grid, heightMap, validTiles, focusX, focusY}"
                    />
                    <ShapeField
                      name="onTurnStart(turnNumber, team)"
                      effect="Called by turnManager at start of each turn"
                    />
                    <ShapeField
                      name="onTurnEnd(turnNumber, team)"
                      effect="Called by turnManager at end of each turn"
                    />
                  </div>
                </div>

                {/* Entity Type Definition Shape */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    Entity Type Definition Shape
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Passed to entityRegistry.register(typeId, definition). All
                    fields optional. All definition fields are copied onto the
                    spawned entity — games can add arbitrary fields and read
                    them in handlers, hooks, and conditions.
                  </p>
                  <div className="border-l-2 border-border pl-3 space-y-0">
                    <ShapeField
                      name="name"
                      defaultVal="typeId"
                      effect="Display name"
                    />
                    <ShapeField
                      name="health"
                      defaultVal="100"
                      effect="Starting HP"
                    />
                    <ShapeField
                      name="maxHealth"
                      defaultVal="health"
                      effect="Maximum HP"
                    />
                    <ShapeField
                      name="attack"
                      defaultVal="10"
                      effect="Attack stat"
                    />
                    <ShapeField
                      name="defense"
                      defaultVal="0"
                      effect="Defense stat"
                    />
                    <ShapeField
                      name="speed"
                      defaultVal="3"
                      effect="Movement range"
                    />
                    <ShapeField
                      name="actions"
                      defaultVal='{"WAIT"}'
                      effect="Action ID strings available to this entity"
                    />
                    <ShapeField
                      name="selectable"
                      defaultVal="false"
                      effect="Whether player can select this entity"
                    />
                    <ShapeField
                      name="slot"
                      defaultVal="UNIT"
                      effect="Tile slot. Multiple entities coexist in different slots"
                    />
                    <ShapeField
                      name="tileSize"
                      defaultVal="{1,1}"
                      effect="Multi-tile entity dimensions from anchor"
                    />
                    <ShapeField
                      name="teamOnly"
                      defaultVal="nil"
                      effect="Restrict type to one team"
                    />
                    <ShapeField
                      name="visuals"
                      defaultVal="nil"
                      effect="Image paths and offsets for render system"
                    />
                  </div>
                </div>

                {/* Entity Visuals Shape */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    Entity Visuals Shape
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Nested table on entity type definition. Three-tier image
                    selection with facing and idle animation. Falls back to
                    generated team-colored circles.
                  </p>
                  <div className="border-l-2 border-border pl-3 space-y-0">
                    <ShapeField
                      name="visuals.static"
                      effect="Image path for front-facing sprite"
                    />
                    <ShapeField
                      name="visuals.staticBack"
                      effect="Image path for back-facing sprite"
                    />
                    <ShapeField
                      name="visuals.idle"
                      effect="Image table path for idle animation loop"
                    />
                    <ShapeField
                      name="visuals.offset"
                      effect="{x, y} pixel offset for sprite positioning"
                    />
                  </div>
                </div>

                {/* Action Handler Shape */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    Action Handler Shape
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Passed to actionRegistry.register(actionType, handler).
                    Engine calls these during action evaluation and execution.
                  </p>
                  <div className="border-l-2 border-border pl-3 space-y-0">
                    <ShapeField
                      name="label"
                      defaultVal="actionType"
                      effect="Display name in action menus"
                    />
                    <ShapeField
                      name="isAvailable"
                      effect="fn(entity, entityManager, grid) → bool. Show in menu?"
                    />
                    <ShapeField
                      name="validate"
                      effect="fn(entity, target, params, entityManager, grid) → bool, reason"
                    />
                    <ShapeField
                      name="execute"
                      effect="fn(entity, target, params, entityManager, grid) → effects[]"
                    />
                    <ShapeField
                      name="getTargets"
                      effect="fn(entity, entityManager, grid) → targets[]. Custom targeting"
                    />
                    <ShapeField
                      name="cost"
                      effect="fn(entity, target, params) → number. Game-defined meaning"
                    />
                  </div>
                </div>

                {/* Condition Definition Shape */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    Condition Definition Shape
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Passed to conditions.registerDefinition(id, def). Stat
                    modifiers are read-time overlays — base stats are never
                    mutated.
                  </p>
                  <div className="border-l-2 border-border pl-3 space-y-0">
                    <ShapeField
                      name="duration"
                      effect="Ticks before expiration. Nil = permanent"
                    />
                    <ShapeField
                      name="stackable"
                      effect="Multiple instances on one entity. False = refresh duration"
                    />
                    <ShapeField
                      name="statMod"
                      effect="{statName = delta}. Aggregates when stackable"
                    />
                    <ShapeField
                      name="skipsAction"
                      effect="Entity cannot act while active"
                    />
                    <ShapeField
                      name="onApply(instance, params)"
                      effect="→ effects[]. Fired on application"
                    />
                    <ShapeField
                      name="onRemove(instance)"
                      effect="→ effects[]. Fired on removal or expiry"
                    />
                    <ShapeField
                      name="onTurnStart(instance)"
                      effect="→ effects[]. Fired at entity's turn start"
                    />
                    <ShapeField
                      name="onTurnEnd(instance)"
                      effect="→ effects[]. Fired at entity's turn end"
                    />
                  </div>
                </div>

                {/* Screen Contract */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-semibold text-sm text-foreground mb-1">
                    Screen Contract
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Registered via registerScreens. Screens access engine
                    systems via the global Engine table.
                  </p>
                  <div className="border-l-2 border-border pl-3 space-y-0">
                    <ShapeField
                      name="new(params)"
                      effect="Construction. Required"
                    />
                    <ShapeField
                      name="enter(params)"
                      effect="After construction, before first update. Required"
                    />
                    <ShapeField
                      name="update()"
                      effect="Every frame. Return screen name to transition. Required"
                    />
                    <ShapeField
                      name="exit()"
                      effect="Cleanup sprites, timers, state. Required"
                    />
                    <ShapeField
                      name="drawOverlays()"
                      effect="After gfx.sprite.update(). Optional"
                    />
                    <ShapeField
                      name="draw()"
                      effect="Must be empty — sprites only. Required"
                    />
                  </div>
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
