# coordinate.games API Reference

Complete documentation for the coordinate.games multi-game hub API.
Supports async turn-based games (like Bird Wars) and leaderboard games (like Power Pentagon).

## Authentication

For endpoints marked with **Auth Required**, include your secret token:

```
Authorization: Bearer <your-secret-token>
```

## Per-Game Identity

Register per game via `/api/[gameSlug]/register`. Each game gives you a unique deviceId and token. Identities are independent per game.

## Game Capabilities

Games have capabilities that determine which endpoints are available:
- **async** — Turn-based multiplayer battles (`/battles` endpoints)
- **leaderboard** — Score submission and rankings (`/scores` endpoints)
- **data** — Key-value storage (`/data` endpoints)

---

## Global Endpoints

General platform-level endpoints for listing and managing games.

### GET `/api/games`

List all active games available on the platform.

**Authentication:** Public

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `games` | Game[] | Array of active games |

**Example (200 OK):**
```json
{
  "success": true,
  "games": [
    { "slug": "birdwars", "name": "Bird Wars", "capabilities": ["data", "async"] },
    { "slug": "powerpentagon", "name": "Power Pentagon", "capabilities": ["data", "leaderboard"] }
  ]
}
```

---

### GET `/api/ping`

Platform health check. Returns server status, uptime, and version. No authentication required.

**Authentication:** Public

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `status` | string | Server status ("ok") |
| `serverTime` | string | Current server time (ISO 8601) |
| `uptime` | number | Server uptime in seconds |
| `version` | string | Platform version |

**Example (200 OK):**
```json
{
  "success": true,
  "status": "ok",
  "serverTime": "2026-02-02T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

---

## Registration & Identity Endpoints

Per-game registration and authentication flow.

### POST `/api/[gameSlug]/register`

Register for a specific game. Creates a game-scoped identity with unique deviceId and secretToken.

**Authentication:** Public

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `displayName` | string | No | Player display name (max 50 chars) |
| `avatar` | string | No | Bird avatar: BIRD1-BIRD12 (default: BIRD1) |

**Example:**
```json
{ "displayName": "BirdMaster", "avatar": "BIRD4" }
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the registration was successful |
| `registered` | boolean | True if already registered for this game, false if newly registered |
| `deviceId` | string | Game-scoped player ID (unique per game) |
| `secretToken` | string | Game-scoped auth token (only on NEW registration!) |
| `displayName` | string | Player display name for this game |
| `avatar` | string | Selected bird avatar for this game |

**Example (200 OK):**
```json
{
  "success": true,
  "registered": false,
  "deviceId": "a0dcb007051f88c0aef99bf01ffe224b",
  "secretToken": "bvUKW9vBPZS8GHtCXe3k8jSm56BQDP...",
  "displayName": "BirdMaster",
  "avatar": "BIRD4"
}
```

**Error Responses:**

- `400` — Invalid request body
- `404` — Game not found or missing data capability

---

### GET `/api/[gameSlug]/ping`

Check server status and version compatibility for a game. Returns version info, maintenance status, and message of the day. No authentication required.

**Authentication:** Public

**Query Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clientVersion` | string | No | Client version for compatibility check (e.g., "1.0.0") |

**Example:**
```
/api/[gameSlug]/ping?clientVersion=1.0.0
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `status` | string | "ok" \| "update_available" \| "update_required" \| "maintenance" |
| `serverTime` | string | Current server time (ISO 8601) |
| `minVersion` | string\|null | Minimum required client version |
| `currentVersion` | string\|null | Latest available client version |
| `updateUrl` | string\|null | URL to download update (if available) |
| `maintenance` | boolean | Whether server is in maintenance mode |
| `motd` | string\|null | Message of the day |
| `message` | string\|null | Human-readable status message |

**Example (200 OK):**
```json
{
  "success": true,
  "status": "ok",
  "serverTime": "2026-02-02T12:00:00.000Z",
  "minVersion": "1.0.0",
  "currentVersion": "1.0.0",
  "updateUrl": null,
  "maintenance": false,
  "motd": null,
  "message": null
}
```

**Error Responses:**

- `404` — Game not found

---

### POST `/api/[gameSlug]/ping`

Record an authenticated player ping for a specific game. Used for presence tracking. The token must belong to a GameIdentity registered for this game — cross-game tokens are rejected.

**Authentication:** **Auth Required**

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | No | Optional message (max 500 chars) |

**Example:**
```json
{ "message": "Hello from Playdate!" }
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the ping was recorded |
| `message` | string | Confirmation message |
| `pingId` | string | Unique ping record ID |
| `displayName` | string | Player display name |
| `timestamp` | string | When the ping was recorded (ISO 8601) |

**Example (200 OK):**
```json
{
  "success": true,
  "message": "Ping recorded",
  "pingId": "abc123...",
  "displayName": "BirdMaster",
  "timestamp": "2026-02-02T12:00:00.000Z"
}
```

**Error Responses:**

- `400` — Invalid request body
- `401` — Unauthorized - invalid or missing token, or token does not belong to this game
- `404` — Game not found

---

## Async Battle Endpoints

Turn-based multiplayer games with battles. Requires "async" capability.

### GET `/api/[gameSlug]/battles`

List battles for an async game. By default returns public, non-abandoned battles. Use `mine=true` with auth to get the caller's own battles (including private and abandoned). Supports cursor-based pagination.

**Authentication:** Public (or **Auth Required** when `mine=true`)

**Query Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mine` | string | No | Set to "true" to filter to the authenticated caller's battles only (requires auth). Includes private and abandoned battles. |
| `status` | string | No | Filter by status: pending, active, completed, abandoned. Only works with mine=true. |
| `limit` | number | No | Max results per page (default: 9, max: 50). Enables cursor-based pagination. |
| `cursor` | string | No | Pagination cursor from previous response's `pagination.nextCursor` |

**Example:**
```
/api/[gameSlug]/battles?mine=true&status=active&limit=9
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `game` | object | Game info: { slug, name } |
| `battles` | Battle[] | Array of battles with player info |
| `pagination` | object | Pagination info: { hasMore, nextCursor, total, counts, limits, userCounts } |

**Example (200 OK):**
```json
{
  "success": true,
  "game": { "slug": "birdwars", "name": "Bird Wars" },
  "battles": [
    {
      "battleId": "e0a5b571c0ddc493",
      "displayName": "Territorial-Retreat-54",
      "player1DeviceId": "a0dcb007...",
      "player2DeviceId": "f55c9b25...",
      "player1DisplayName": "BirdMaster",
      "player1Avatar": "BIRD3",
      "player2DisplayName": "EagleEye",
      "player2Avatar": "BIRD1",
      "status": "active",
      "currentTurn": 4,
      "currentPlayerIndex": 0,
      "isPrivate": false,
      "lastTurnAt": "2026-02-07T15:30:00.000Z",
      "mapName": "forest-clearing",
      "winner": null
    }
  ],
  "pagination": {
    "hasMore": false,
    "nextCursor": null,
    "total": 1,
    "counts": { "active": 1 },
    "limits": { "maxTotal": 9 },
    "userCounts": { "total": 1 }
  }
}
```

**Error Responses:**

- `401` — mine=true requires valid Bearer token authentication
- `400` — Invalid status filter
- `404` — Game not found or missing async capability

---

### POST `/api/[gameSlug]/battles`

Create a new battle. The authenticated player becomes player 1. Maximum 9 active/pending battles per player.

**Authentication:** **Auth Required**

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mapData` | object | No | Map configuration (e.g., { selection: "ForestMap" }) |
| `isPrivate` | boolean | No | Hide from public listings (default: false) |

**Example:**
```json
{ "mapData": { "selection": "ForestMap" }, "isPrivate": false }
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the battle was created |
| `game` | object | Game info: { slug, name } |
| `battle` | Battle | Created battle object |
| `message` | string | Human-readable message |

**Example (200 OK):**
```json
{
  "success": true,
  "game": { "slug": "birdwars", "name": "Bird Wars" },
  "battle": {
    "battleId": "a99958640027f6bc",
    "displayName": "Swift-Assault-17",
    "status": "pending",
    "currentTurn": 0,
    "isPrivate": false
  },
  "message": "Battle created. Waiting for opponent to join."
}
```

**Error Responses:**

- `401` — Authentication required
- `403` — Maximum 9 active games allowed (limit_reached)
- `404` — Game not found or missing async capability

---

### GET `/api/[gameSlug]/battles/[id]`

Get detailed information about a specific battle.

**Authentication:** Public

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `battle` | Battle | Full battle object with current state |

**Example (200 OK):**
```json
{
  "success": true,
  "battle": {
    "battleId": "e0a5b571c0ddc493",
    "displayName": "Territorial-Retreat-54",
    "gameSlug": "birdwars",
    "player1DeviceId": "a0dcb007...",
    "player2DeviceId": "f55c9b25...",
    "status": "active",
    "currentTurn": 5,
    "currentPlayerIndex": 1,
    "mapData": { "selection": "ForestMap" },
    "currentState": { "units": [], "blockedTiles": [] },
    "isPrivate": false,
    "createdAt": "2026-02-01T12:00:00.000Z",
    "updatedAt": "2026-02-02T15:30:00.000Z"
  }
}
```

**Error Responses:**

- `404` — Battle or game not found

---

### POST `/api/[gameSlug]/battles/[id]/join`

Join a pending battle as player 2. Changes status from "pending" to "active".

**Authentication:** **Auth Required**

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether joining was successful |
| `battle` | Battle | Updated battle object |
| `message` | string | Human-readable message |

**Example (200 OK):**
```json
{
  "success": true,
  "battle": {
    "battleId": "e0a5b571c0ddc493",
    "status": "active",
    "currentTurn": 0,
    "currentPlayerIndex": 0
  },
  "message": "Successfully joined battle as player 2"
}
```

**Error Responses:**

- `400` — Battle not pending, already full, or cannot join own battle
- `401` — Authentication required
- `404` — Battle or game not found

---

### GET `/api/[gameSlug]/battles/[id]/turns`

Get all turns for a battle, ordered by turn number.

**Authentication:** Public

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `turns` | Turn[] | Array of turns in order |

**Example (200 OK):**
```json
{
  "success": true,
  "turns": [
    {
      "turnId": "abc123...",
      "turnNumber": 1,
      "deviceId": "a0dcb007...",
      "actions": [
        { "type": "move", "unitId": "u1", "from": { "x": 1, "y": 2 }, "to": { "x": 3, "y": 2 } },
        { "type": "end_turn" }
      ],
      "timestamp": "2026-02-01T12:05:00.000Z",
      "isValid": true
    }
  ]
}
```

**Error Responses:**

- `404` — Battle or game not found

---

### POST `/api/[gameSlug]/battles/[id]/turns`

Submit a turn with actions. Only the current active player can submit. Must include end_turn action. Max 100 actions per turn.

**Authentication:** **Auth Required**

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `actions` | Action[] | Yes | Array of actions (1-100, must include end_turn). Action types: move, attack, build, capture, wait, end_turn, take_off, land, supply, load, unload, combine |
| `gameState` | object | No | Game state snapshot after turn (max 50KB). If gameState.winner is set, battle completes. |

**Example:**
```json
{
  "actions": [
    { "type": "move", "unitId": "u1", "from": { "x": 1, "y": 2 }, "to": { "x": 3, "y": 2 } },
    { "type": "attack", "unitId": "u1", "targetId": "enemy1" },
    { "type": "end_turn" }
  ],
  "gameState": {
    "units": [{ "unitId": "u1", "type": "BIRD1", "x": 3, "y": 2, "hp": 10, "owner": "a0dcb007..." }]
  }
}
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the turn was submitted |
| `game` | object | Game info: { slug, name } |
| `turn` | Turn | Submitted turn: { turnId, turnNumber, isValid, validationErrors } |
| `battle` | Battle | Updated battle state: { battleId, currentTurn, currentPlayerIndex, status, currentState } |
| `message` | string | Human-readable message |

**Example (201 Created):**
```json
{
  "success": true,
  "game": { "slug": "birdwars", "name": "Bird Wars" },
  "turn": { "turnId": "xyz789...", "turnNumber": 6, "isValid": true, "validationErrors": [] },
  "battle": { "battleId": "e0a5b571c0ddc493", "currentTurn": 6, "currentPlayerIndex": 0, "status": "active", "currentState": { "units": [] } },
  "message": "Turn submitted successfully"
}
```

**Error Responses:**

- `400` — Invalid actions or battle not active
- `401` — Authentication required
- `403` — Not your turn or not a participant
- `404` — Battle or game not found
- `409` — Turn already submitted (duplicate)
- `413` — Request payload too large (max 100KB)

---

### GET `/api/[gameSlug]/battles/[id]/poll`

Long-poll for new turns since a given turn number. Use for real-time updates.

**Authentication:** Public

**Query Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lastKnownTurn` | number | No | Last turn number client has (query param) |

**Example:**
```
/api/[gameSlug]/battles/[id]/poll?lastKnownTurn=5
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `hasNewTurns` | boolean | Whether new turns are available |
| `battle` | Battle | Current battle state |
| `newTurns` | Turn[] | New turns since lastKnownTurn |

**Example (200 OK):**
```json
{
  "success": true,
  "hasNewTurns": true,
  "battle": { "currentTurn": 7, "currentPlayerIndex": 1, "status": "active" },
  "newTurns": [{ "turnNumber": 6, "deviceId": "f55c9b25...", "actions": [] }]
}
```

**Error Responses:**

- `404` — Battle or game not found

---

### POST `/api/[gameSlug]/battles/[id]/forfeit`

Forfeit an active battle or cancel a pending battle you created.

**Authentication:** **Auth Required**

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the forfeit was successful |
| `battle` | Battle | Updated battle with winnerId and endReason |
| `message` | string | Human-readable message |

**Example (200 OK):**
```json
{
  "success": true,
  "battle": {
    "battleId": "e0a5b571c0ddc493",
    "status": "completed",
    "winnerId": "f55c9b25...",
    "endReason": "forfeit"
  },
  "message": "Battle forfeited. Opponent wins."
}
```

**Error Responses:**

- `400` — Battle already completed or cannot forfeit
- `401` — Authentication required
- `403` — Not a participant in this battle
- `404` — Battle or game not found

---

## Leaderboard Endpoints

Score submission and rankings. Requires "leaderboard" capability.

### GET `/api/[gameSlug]/scores`

Get leaderboard scores for a game. Only available for games with the "leaderboard" capability.

**Authentication:** Public

**Query Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | number | No | Max results (default: 100) |
| `offset` | number | No | Results offset for pagination |
| `period` | string | No | Filter: day, week, month (default: all time) |

**Example:**
```
/api/[gameSlug]/scores?limit=10&period=week
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `scores` | Score[] | Array of scores, sorted highest first |
| `total` | number | Total number of scores |

**Example (200 OK):**
```json
{
  "success": true,
  "scores": [
    { "deviceId": "a0dcb007...", "displayName": "BirdMaster", "score": 25000, "metadata": { "level": 8 }, "createdAt": "2026-02-01T10:00:00.000Z" },
    { "deviceId": "f55c9b25...", "displayName": "PentagonPro", "score": 18500, "metadata": { "level": 6 }, "createdAt": "2026-02-01T11:00:00.000Z" }
  ],
  "total": 42
}
```

**Error Responses:**

- `404` — Game not found or missing leaderboard capability

---

### POST `/api/[gameSlug]/scores`

Submit a score to the leaderboard. Players can submit multiple scores.

**Authentication:** **Auth Required**

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `score` | number | Yes | The score value (must be positive) |
| `metadata` | object | No | Additional data (level, combo, etc.) |

**Example:**
```json
{ "score": 15000, "metadata": { "level": 5, "combo": 12 } }
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the score was submitted |
| `score` | Score | Created score object |
| `rank` | number | Current rank on leaderboard |
| `message` | string | Human-readable message |

**Example (200 OK):**
```json
{
  "success": true,
  "score": { "scoreId": "score123...", "score": 15000, "metadata": { "level": 5 } },
  "rank": 7,
  "message": "Score submitted! You are ranked #7"
}
```

**Error Responses:**

- `400` — Invalid score value
- `401` — Authentication required
- `404` — Game not found or missing leaderboard capability

---

## Data Storage Endpoints

Key-value storage. Requires "data" capability.

### POST `/api/[gameSlug]/data/[key]`

Create or update a key-value pair (upsert). Only available for games with the "data" capability. Max value size: 100KB.

**Authentication:** **Auth Required**

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `value` | object | Yes | The value to store (any JSON object) |
| `scope` | string | No | "global" (default), "player" (private to owner), or "public" (read-all, write-owner) |

**Example:**
```json
{ "value": { "highScore": 1500, "lastLevel": 3 }, "scope": "player" }
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the operation was successful |
| `data` | Data | The stored data object |
| `message` | string | "Data created" or "Data updated" |

**Example (200 OK):**
```json
{
  "success": true,
  "data": {
    "key": "settings",
    "value": { "highScore": 1500, "lastLevel": 3 },
    "scope": "player",
    "ownerId": "a0dcb007...",
    "ownerDisplayName": "BirdMaster",
    "updatedAt": "2026-02-02T10:00:00.000Z"
  },
  "message": "Data created"
}
```

**Error Responses:**

- `400` — Invalid request body or value exceeds 100KB
- `401` — Authentication required
- `403` — Cannot overwrite another player's data
- `404` — Game not found or missing data capability

---

### GET `/api/[gameSlug]/data/[key]`

Get a value by key. Public for global/public scope. Player scope requires auth and only returns own data.

**Authentication:** Public

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `data` | Data | The stored data object |

**Example (200 OK):**
```json
{
  "success": true,
  "data": {
    "key": "leaderboard-config",
    "value": { "maxEntries": 100, "refreshRate": 60 },
    "scope": "global",
    "ownerId": null,
    "ownerDisplayName": null,
    "updatedAt": "2026-02-01T12:00:00.000Z"
  }
}
```

**Error Responses:**

- `401` — Authentication required for player-scoped data
- `403` — Cannot access another player's data
- `404` — Data not found or game not found

---

### DELETE `/api/[gameSlug]/data/[key]`

Delete a key-value pair. Global: any authenticated user can delete. Player/public: only owner can delete.

**Authentication:** **Auth Required**

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the deletion was successful |
| `message` | string | Confirmation message |
| `deletedKey` | string | The key that was deleted |

**Example (200 OK):**
```json
{
  "success": true,
  "message": "Data deleted",
  "deletedKey": "old-settings"
}
```

**Error Responses:**

- `401` — Authentication required
- `403` — Only the owner can delete this data
- `404` — Data not found or game not found

---

### GET `/api/[gameSlug]/data`

List all keys for a game. For player scope, only returns caller's keys. Supports pagination and filtering.

**Authentication:** Public

**Query Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prefix` | string | No | Filter keys by prefix |
| `scope` | string | No | Filter by scope: global, player, public |
| `limit` | number | No | Max results (default: 100, max: 1000) |
| `cursor` | string | No | Cursor for pagination |

**Example:**
```
/api/[gameSlug]/data?prefix=config-&scope=global&limit=50
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `keys` | DataKey[] | Array of key metadata (without values) |
| `nextCursor` | string\|null | Cursor for next page (null if no more) |
| `count` | number | Number of keys returned |

**Example (200 OK):**
```json
{
  "success": true,
  "keys": [
    { "key": "config-display", "scope": "global", "ownerId": null, "ownerDisplayName": null, "updatedAt": "2026-02-01T12:00:00.000Z" },
    { "key": "settings", "scope": "player", "ownerId": "a0dcb007...", "ownerDisplayName": "BirdMaster", "updatedAt": "2026-02-02T10:00:00.000Z" }
  ],
  "nextCursor": null,
  "count": 2
}
```

**Error Responses:**

- `401` — Authentication required to list player-scoped data
- `404` — Game not found or missing data capability

---

## Data Models

### Game

| Field | Description |
|-------|-------------|
| `slug` | Unique identifier (e.g., "birdwars") |
| `name` | Human-readable name |
| `capabilities` | Array of features: "async", "leaderboard", "data" |
| `active` | Whether game is available |
| `versioning` | Version info (minVersion, currentVersion, updateUrl) |
| `maintenance` | Whether game is in maintenance mode |
| `motd` | Message of the day (optional) |

### GameIdentity (per-game)

| Field | Description |
|-------|-------------|
| `deviceId` | Game-scoped player identifier (unique per game) |
| `gameSlug` | Game this identity belongs to |
| `displayName` | Player's display name for this game |
| `avatar` | Bird avatar (BIRD1-BIRD12) |
| `createdAt` | Registration timestamp |
| `lastSeen` | Last activity timestamp |

### Battle (async games)

| Field | Description |
|-------|-------------|
| `battleId` | Unique battle identifier |
| `displayName` | Human-readable name (e.g., "Swift-Assault-17") |
| `gameSlug` | Game this battle belongs to |
| `player1DeviceId` | Player 1 (creator) |
| `player2DeviceId` | Player 2 (null if pending) |
| `status` | "pending", "active", "completed", "abandoned" |
| `currentTurn` | Current turn number |
| `currentPlayerIndex` | 0 = player1's turn, 1 = player2's turn |
| `mapData` | Game-specific map configuration |
| `currentState` | Current game state (units, tiles, etc.) |
| `winnerId` | Winner's deviceId (null if ongoing) |
| `endReason` | "victory", "forfeit", "draw", "cancelled" |
| `isPrivate` | Hidden from public listings |

### Turn (async games)

| Field | Description |
|-------|-------------|
| `turnId` | Unique turn identifier |
| `deviceId` | Player who submitted |
| `turnNumber` | Sequential number |
| `actions` | Array of actions in this turn |
| `gameState` | State snapshot after turn |
| `timestamp` | When turn was submitted |
| `isValid` | Whether turn passed validation |

### Action (async games)

| Field | Description |
|-------|-------------|
| `type` | "move", "attack", "build", "capture", "wait", "end_turn", etc. |
| `unitId` | Unit performing action |
| `from` | Starting position { x, y } |
| `to` | Target position { x, y } |
| `targetId` | Target unit ID (for attacks) |
| `data` | Additional action data |

### Score (leaderboard games)

| Field | Description |
|-------|-------------|
| `gameSlug` | Game this score belongs to |
| `deviceId` | Player who submitted |
| `displayName` | Player's display name |
| `score` | Numeric score value |
| `metadata` | Additional data (level, combo, etc.) |
| `createdAt` | When score was submitted |

### Data (all games)

| Field | Description |
|-------|-------------|
| `gameSlug` | Game this data belongs to |
| `key` | Unique key within the game |
| `value` | JSON object (max 100KB) |
| `scope` | "global", "player", "public" |
| `ownerId` | Owner's deviceId (null for global scope) |
| `ownerDisplayName` | Owner's display name |
| `createdAt` | When data was created |
| `updatedAt` | When data was last updated |

---

*Generated from coordinate.games API Reference*
