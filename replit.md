# coordinate.games - Multi-Game Hub

## Overview
A Next.js application with MongoDB backend for the coordinate.games multi-game platform. Uses a flexible **capabilities system** where games can mix and match features: data storage, async turn-based battles, and leaderboards. Features cross-game player identity, game-specific routing, and capability-enforced endpoints.

## Tech Stack
- **Framework**: Next.js 16 with App Router
- **Database**: MongoDB (via Mongoose)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Client**: Playdate (Lua) and other platforms

## Project Structure
```
/app                    # Next.js App Router pages and API routes
  /api
    /games             # List all games
    /games/seed        # Seed games collection (birdwars, powerpentagon)
    /[gameSlug]        # Game-specific routes
      /register        # Per-game player registration
      /battles         # List/create battles (async games only)
      /battles/[id]    # Get single battle
      /battles/[id]/join    # Join a battle
      /battles/[id]/turns   # Get/submit turns
      /battles/[id]/poll    # Poll for updates
      /battles/[id]/forfeit # Forfeit/cancel battle
      /scores          # Leaderboard (leaderboard games only)
      /data            # List data keys (all games)
      /data/[key]      # Get/put/delete key-value data (all games)
    /auth              # NextAuth authentication (admin dashboard)
    /ping              # Device ping endpoint
  /dashboard           # Dashboard page
  /battles             # Battles list page
  /battles/[id]        # Battle detail page
  /devices             # Device management page
  /schema              # API schema documentation page
/components            # React components
  /Nav.tsx             # Shared navigation
  /ui                  # Reusable UI components
/lib                   # Utilities and middleware
  /mongodb.ts          # MongoDB connection singleton
  /auth.ts             # Token generation and HMAC utilities
  /authMiddleware.ts   # Player authentication middleware
  /gameMiddleware.ts   # Game validation middleware (capabilities: data, async, leaderboard)
  /battleNames.ts      # Name generation with per-game haikunator config
  /utils.ts            # Helper functions
/models                # Mongoose models
  /Game.ts             # Game schema (slug, name, capabilities[], haikunator?, active)
  /Player.ts           # Player schema (internal cross-game identity)
  /GameIdentity.ts     # Per-game identity (deviceId, token per game)
  /Battle.ts           # Battle schema with embedded turns
  /Score.ts            # Score schema (leaderboard games)
  /Data.ts             # Data schema (key-value storage, all games)
  /Ping.ts             # Ping schema
/scripts
  /seedGames.ts        # CLI script to seed games
/public
  /birb001.png         # App icon

battleConfig.lua       # Bird Wars game configuration
API_SCHEMA.md          # Complete API documentation
```

## Multi-Game Architecture

### Game Capabilities
Games can have any combination of capabilities:

| Capability | Description | Endpoints |
|------------|-------------|-----------|
| `data` | Key-value storage | `/api/[gameSlug]/data/*` |
| `async` | Turn-based battles | `/api/[gameSlug]/battles/*` |
| `leaderboard` | Score submission | `/api/[gameSlug]/scores` |

### Seeded Games
| Slug | Name | Capabilities | Haikunator Theme |
|------|------|--------------|------------------|
| `birdwars` | Bird Wars | `["data", "async"]` | Bird moods + bird species |
| `powerpentagon` | Power Pentagon | `["data", "leaderboard"]` | Geometric terms + shapes |

### Per-Game Name Generation (Haikunator)
Games can configure custom word lists for generating player and battle names:
```typescript
haikunator: {
  adjectives: string[],  // e.g., ["Molting", "Soaring", "Pecking"]
  nouns: string[]        // e.g., ["Sparrow", "Eagle", "Penguin"]
}
```

**Name format:** `Adjective-Noun-Number` (e.g., "Molting-Sparrow-42")

**Usage:**
- `generatePlayerName(seed, config)` - Auto-generate displayName on registration (if not provided)
- `generateBattleName(battleId, config)` - Generate battle displayName on creation

**Fallback:** If game has no haikunator config, uses generic defaults.

### Mix and Match
Games can combine capabilities freely:
- `["data"]` - Storage only
- `["leaderboard"]` - Scores only  
- `["data", "async"]` - Battles with storage
- `["data", "leaderboard"]` - Leaderboard with storage
- `["async", "leaderboard"]` - Battles and scores
- `["data", "async", "leaderboard"]` - All features

### Per-Game Identity with Cross-Game Linking
Players register per game via `/api/[gameSlug]/register`. Each game gives a unique `deviceId` and `secretToken`. The `serialNumber` links identities across games internally.

**Player (Internal Cross-Game Identity)**
- `globalId`: Internal cross-game identifier
- `serialNumber`: Device serial for account recovery and linking
- `createdAt`, `lastSeen`: Timestamps

**GameIdentity (Per-Game Identity)**
- `globalId`: Links to Player
- `gameSlug`: Which game this identity belongs to
- `deviceId`: Game-scoped unique player identifier
- `tokenHash`: Hashed game-scoped auth token
- `displayName`: Player's name for this game
- `avatar`: BIRD1-BIRD12
- `createdAt`, `lastSeen`: Timestamps

### Capability Enforcement
- Accessing `/api/birdwars/scores` returns 404 (birdwars missing "leaderboard" capability)
- Accessing `/api/powerpentagon/battles` returns 404 (powerpentagon missing "async" capability)
- Accessing `/api/invalidgame/...` returns 404 (game not found)
- Data endpoints require the "data" capability

---

## API Endpoints

### Global Endpoints

#### GET /api/games
List all active games.
```json
{
  "success": true,
  "games": [
    { "slug": "birdwars", "name": "Bird Wars", "capabilities": ["data", "async"] },
    { "slug": "powerpentagon", "name": "Power Pentagon", "capabilities": ["data", "leaderboard"] }
  ]
}
```

#### POST /api/games/seed
Seed/update games collection (creates birdwars and powerpentagon).

### Per-Game Registration

#### POST /api/[gameSlug]/register
Register for a specific game. Creates game-scoped identity.
```json
// Request
{ "serialNumber": "...", "displayName": "PlayerName", "avatar": "BIRD4" }

// Response (new registration for this game)
{ "success": true, "registered": false, "deviceId": "...", "secretToken": "...", "displayName": "...", "avatar": "..." }

// Response (existing player with token)
{ "success": true, "registered": true, "deviceId": "...", "displayName": "..." }
```

### Async Game Endpoints (/api/[gameSlug]/...)

#### GET /api/[gameSlug]/battles
List public battles for the game. Supports cursor-based pagination.

#### POST /api/[gameSlug]/battles
Create a new battle (requires auth).
```json
{ "mapData": { "selection": "MapName" }, "isPrivate": false }
```

#### GET /api/[gameSlug]/battles/[id]
Get battle details.

#### POST /api/[gameSlug]/battles/[id]/join
Join a pending battle (requires auth).

#### GET /api/[gameSlug]/battles/[id]/turns
Get all turns for a battle.

#### POST /api/[gameSlug]/battles/[id]/turns
Submit a turn (requires auth).
```json
{
  "actions": [
    { "type": "move", "unitId": "u1", "from": {"x":1,"y":2}, "to": {"x":3,"y":2} },
    { "type": "end_turn" }
  ],
  "gameState": {
    "units": [{ "unitId": "u1", "type": "BIRD1", "x": 3, "y": 2, "hp": 10, "owner": "..." }]
  }
}
```

#### GET /api/[gameSlug]/battles/[id]/poll?lastKnownTurn=N
Poll for new turns since turn N.

#### POST /api/[gameSlug]/battles/[id]/forfeit
Forfeit/cancel a battle (requires auth).

### Leaderboard Game Endpoints (/api/[gameSlug]/...)

#### GET /api/[gameSlug]/scores
Get leaderboard. Supports pagination and time filters.
```
?limit=100&offset=0&period=day|week|month
```

#### POST /api/[gameSlug]/scores
Submit a score (requires auth).
```json
{ "score": 15000, "metadata": { "level": 5, "combo": 12 } }
```

---

## Data Models

### Game
```typescript
{
  slug: string;        // e.g., "birdwars"
  name: string;        // e.g., "Bird Wars"
  capabilities: ("data" | "async" | "leaderboard")[];
  active: boolean;
  createdAt: Date;
}
```

### Player
```typescript
{
  deviceId: string;    // Unique identifier
  serialNumber: string; // For account recovery
  tokenHash: string;   // Hashed auth token
  displayName: string;
  avatar: "BIRD1" | ... | "BIRD12";
  isSimulator: boolean;
  createdAt: Date;
  lastSeen: Date;
  isActive: boolean;
}
```

### Battle (async games)
```typescript
{
  gameSlug: string;    // e.g., "birdwars"
  battleId: string;
  displayName: string; // e.g., "Territorial-Retreat-54"
  player1DeviceId: string;
  player2DeviceId: string | null;
  status: "pending" | "active" | "completed" | "abandoned";
  currentTurn: number;
  currentPlayerIndex: number;
  mapData: Record<string, unknown>;
  currentState: { units: IUnit[]; blockedTiles: IBlockedTile[] };
  turns: ITurn[];      // Embedded turns
  winnerId: string | null;
  endReason: "victory" | "forfeit" | "draw" | "cancelled" | null;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTurnAt: Date | null;
}
```

### Score (leaderboard games)
```typescript
{
  gameSlug: string;    // e.g., "powerpentagon"
  deviceId: string;
  displayName: string;
  score: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
```

---

## Authentication

All mutating endpoints (except new registration) require:
```
Authorization: Bearer <secret-token>
```

### Deterministic Token System
- Tokens generated from device serial number using HMAC-SHA256
- Same serial always produces same token (enables account recovery)
- Token hashed before storage for security

---

## Environment Variables
- `MONGODB_URI` - MongoDB connection string (required)
- `SESSION_SECRET` - For token hashing, min 32 chars (required)
- `MIN_CLIENT_VERSION` - Minimum client version (default: "0.0.1")

---

## Development

### Seed Games
```bash
curl -X POST http://localhost:5000/api/games/seed
```

### Run Application
```bash
npm run dev  # Starts Next.js on port 5000
```

### Test Endpoints
```bash
# Register player
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"serialNumber":"test-001","displayName":"TestPlayer"}'

# Create battle (async game)
curl -X POST http://localhost:5000/api/birdwars/battles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"mapData":{"selection":"TestMap"}}'

# Submit score (leaderboard game)
curl -X POST http://localhost:5000/api/powerpentagon/scores \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"score":15000}'
```

---

## Bird Wars Specific Configuration

See `battleConfig.lua` for:
- 12 bird unit types with stats
- Terrain system
- Movement and combat rules
- Map items and capture points

---

## Recent Changes

### February 2, 2026 - Capabilities System
- Changed Game model from single `type` field to `capabilities: string[]` array
- Games can now mix and match capabilities: "data", "async", "leaderboard"
- Updated gameMiddleware with `validateGameWithCapability()` pattern
- Added `validateDataGame()`, `validateAsyncGame()`, `validateLeaderboardGame()` helpers
- Data endpoints now require "data" capability instead of being available to all games
- Updated schema page and documentation for new capabilities system
- Seeded games: birdwars `["data", "async"]`, powerpentagon `["data", "leaderboard"]`

### February 2, 2026 - Data Storage Feature
- Added Data model for generic key-value storage (gameSlug, key, value, scope, ownerId)
- Created PUT/GET/DELETE /api/[gameSlug]/data/[key] endpoints with scope-based access control
- Created GET /api/[gameSlug]/data endpoint for listing keys with filters (prefix, scope, cursor)
- Scopes: "global" (shared), "player" (private with ownerId prefix), "public" (read-all, write-owner)
- Max value size: 100KB
- Requires "data" capability
- Updated schema page with Data Storage Endpoints section

### February 2, 2026 - Schema Page Update
- Rewrote /schema page to document multi-game hub API
- Added Global Endpoints section: /api/register, /api/games, /api/games/seed
- Added Async Game Endpoints section: all /api/[gameSlug]/battles/* routes
- Added Leaderboard Game Endpoints section: /api/[gameSlug]/scores routes
- Updated Data Types section with Game, Player, Battle, Turn, Action, Score models
- Added authentication and cross-game identity documentation
- Added game type routing explanation (async vs leaderboard enforcement)

### February 2, 2026 - Front Page Redesign
- Redesigned front page as multi-game hub showcase
- Added hero section with platform stats (games, players, battles)
- Created games grid showing Bird Wars (async) and Power Pentagon (leaderboard)
- Added top scores display for leaderboard games
- Updated Nav component with coordinate.games branding and gamepad icon
- Added "For Developers" section explaining cross-game identity and API
- Created getHubStats server action for aggregated platform statistics
- Updated footer with coordinate.games branding

### February 2, 2026 - Multi-Game Hub Phase 1
- Created Game model for game registration
- Renamed Device to Player model for cross-game identity
- Added gameSlug to Battle model
- Created Score model for leaderboard games
- Added game validation middleware (async vs leaderboard type enforcement)
- Restructured API routes under /api/[gameSlug]/...
- Embedded turns in Battle document (removed separate Turn collection)
- Added /api/games and /api/games/seed endpoints
- Removed legacy routes (/api/battles, /api/turns, etc.)
