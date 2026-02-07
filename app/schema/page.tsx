'use client';

import Link from 'next/link';
import { Lock, Globe, Gamepad2, Swords, Trophy, Users, Database, ChevronDown, ChevronRight, Download, Activity } from 'lucide-react';
import Nav from '@/components/Nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState, useCallback } from 'react';

function generateMarkdownSpec(
  globalEndpoints: EndpointSection[],
  perGameEndpoints: EndpointSection[],
  asyncEndpoints: EndpointSection[],
  leaderboardEndpoints: EndpointSection[],
  dataStorageEndpoints: EndpointSection[]
): string {
  const lines: string[] = [];
  
  lines.push('# coordinate.games API Reference');
  lines.push('');
  lines.push('Complete documentation for the coordinate.games multi-game hub API.');
  lines.push('Supports async turn-based games (like Bird Wars) and leaderboard games (like Power Pentagon).');
  lines.push('');
  lines.push('## Authentication');
  lines.push('');
  lines.push('For endpoints marked with **Auth Required**, include your secret token:');
  lines.push('');
  lines.push('```');
  lines.push('Authorization: Bearer <your-secret-token>');
  lines.push('```');
  lines.push('');
  lines.push('## Per-Game Identity');
  lines.push('');
  lines.push('Register per game via `/api/[gameSlug]/register`. Each game gives you a unique deviceId and token. Identities are independent per game.');
  lines.push('');
  lines.push('## Game Capabilities');
  lines.push('');
  lines.push('Games have capabilities that determine which endpoints are available:');
  lines.push('- **async** — Turn-based multiplayer battles (`/battles` endpoints)');
  lines.push('- **leaderboard** — Score submission and rankings (`/scores` endpoints)');
  lines.push('- **data** — Key-value storage (`/data` endpoints)');
  lines.push('');
  lines.push('---');
  lines.push('');
  
  const formatEndpoint = (endpoint: EndpointSection) => {
    const authBadge = endpoint.auth ? '**Auth Required**' : 'Public';
    lines.push(`### ${endpoint.method} \`${endpoint.path}\``);
    lines.push('');
    lines.push(`${endpoint.description}`);
    lines.push('');
    lines.push(`**Authentication:** ${authBadge}`);
    lines.push('');
    
    if (endpoint.requestBody) {
      const paramType = endpoint.method === 'GET' ? 'Query Parameters' : 'Request Body';
      lines.push(`**${paramType}:**`);
      lines.push('');
      lines.push('| Field | Type | Required | Description |');
      lines.push('|-------|------|----------|-------------|');
      for (const field of endpoint.requestBody.fields) {
        lines.push(`| \`${field.name}\` | ${field.type} | ${field.required ? 'Yes' : 'No'} | ${field.description} |`);
      }
      lines.push('');
      lines.push('**Example:**');
      if (endpoint.method === 'GET') {
        const queryParams = Object.entries(endpoint.requestBody.example)
          .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
          .join('&');
        lines.push('```');
        lines.push(`${endpoint.path}?${queryParams}`);
        lines.push('```');
      } else {
        lines.push('```json');
        lines.push(JSON.stringify(endpoint.requestBody.example, null, 2));
        lines.push('```');
      }
      lines.push('');
    }
    
    lines.push('**Response:**');
    lines.push('');
    lines.push('| Field | Type | Description |');
    lines.push('|-------|------|-------------|');
    for (const field of endpoint.responseBody.fields) {
      lines.push(`| \`${field.name}\` | ${field.type} | ${field.description} |`);
    }
    lines.push('');
    lines.push('**Example (200 OK):**');
    lines.push('```json');
    lines.push(JSON.stringify(endpoint.responseBody.example, null, 2));
    lines.push('```');
    lines.push('');
    
    if (endpoint.errors && endpoint.errors.length > 0) {
      lines.push('**Error Responses:**');
      lines.push('');
      for (const error of endpoint.errors) {
        lines.push(`- \`${error.status}\` — ${error.description}`);
      }
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  };
  
  lines.push('## Global Endpoints');
  lines.push('');
  lines.push('General platform-level endpoints for listing and managing games.');
  lines.push('');
  globalEndpoints.forEach(formatEndpoint);
  
  lines.push('## Registration & Identity Endpoints');
  lines.push('');
  lines.push('Per-game registration and authentication flow.');
  lines.push('');
  perGameEndpoints.forEach(formatEndpoint);
  
  lines.push('## Async Game Endpoints');
  lines.push('');
  lines.push('Endpoints for turn-based multiplayer games (requires `async` capability).');
  lines.push('');
  asyncEndpoints.forEach(formatEndpoint);
  
  lines.push('## Leaderboard Endpoints');
  lines.push('');
  lines.push('Endpoints for score-based games (requires `leaderboard` capability).');
  lines.push('');
  leaderboardEndpoints.forEach(formatEndpoint);
  
  lines.push('## Data Storage Endpoints');
  lines.push('');
  lines.push('Generic key-value storage (requires `data` capability). Supports global, player, and public scoping.');
  lines.push('');
  dataStorageEndpoints.forEach(formatEndpoint);
  
  lines.push('## Data Types & Models');
  lines.push('');
  
  lines.push('### Game');
  lines.push('');
  lines.push('| Field | Description |');
  lines.push('|-------|-------------|');
  lines.push('| `slug` | Unique identifier (e.g., "birdwars") |');
  lines.push('| `name` | Human-readable name |');
  lines.push('| `capabilities` | Array of features: "async", "leaderboard", "data" |');
  lines.push('| `active` | Whether game is available |');
  lines.push('| `versioning` | Version info (minVersion, currentVersion, updateUrl) |');
  lines.push('| `maintenance` | Whether game is in maintenance mode |');
  lines.push('| `motd` | Message of the day (optional) |');
  lines.push('');
  
  lines.push('### GameIdentity (per-game)');
  lines.push('');
  lines.push('| Field | Description |');
  lines.push('|-------|-------------|');
  lines.push('| `deviceId` | Game-scoped player identifier (unique per game) |');
  lines.push('| `gameSlug` | Game this identity belongs to |');
  lines.push('| `displayName` | Player\'s display name for this game |');
  lines.push('| `avatar` | Bird avatar (BIRD1-BIRD12) |');
  lines.push('| `createdAt` | Registration timestamp |');
  lines.push('| `lastSeen` | Last activity timestamp |');
  lines.push('');
  
  lines.push('### Battle (async games)');
  lines.push('');
  lines.push('| Field | Description |');
  lines.push('|-------|-------------|');
  lines.push('| `battleId` | Unique battle identifier |');
  lines.push('| `displayName` | Human-readable name (e.g., "Swift-Assault-17") |');
  lines.push('| `gameSlug` | Game this battle belongs to |');
  lines.push('| `player1DeviceId` | Player 1 (creator) |');
  lines.push('| `player2DeviceId` | Player 2 (null if pending) |');
  lines.push('| `status` | "pending", "active", "completed", "abandoned" |');
  lines.push('| `currentTurn` | Current turn number |');
  lines.push('| `currentPlayerIndex` | 0 = player1\'s turn, 1 = player2\'s turn |');
  lines.push('| `mapData` | Game-specific map configuration |');
  lines.push('| `currentState` | Current game state (units, tiles, etc.) |');
  lines.push('| `winnerId` | Winner\'s deviceId (null if ongoing) |');
  lines.push('| `endReason` | "victory", "forfeit", "draw", "cancelled" |');
  lines.push('| `isPrivate` | Hidden from public listings |');
  lines.push('');
  
  lines.push('### Turn (async games)');
  lines.push('');
  lines.push('| Field | Description |');
  lines.push('|-------|-------------|');
  lines.push('| `turnId` | Unique turn identifier |');
  lines.push('| `deviceId` | Player who submitted |');
  lines.push('| `turnNumber` | Sequential number |');
  lines.push('| `actions` | Array of actions in this turn |');
  lines.push('| `gameState` | State snapshot after turn |');
  lines.push('| `timestamp` | When turn was submitted |');
  lines.push('| `isValid` | Whether turn passed validation |');
  lines.push('');
  
  lines.push('### Action (async games)');
  lines.push('');
  lines.push('| Field | Description |');
  lines.push('|-------|-------------|');
  lines.push('| `type` | "move", "attack", "build", "capture", "wait", "end_turn", etc. |');
  lines.push('| `unitId` | Unit performing action |');
  lines.push('| `from` | Starting position { x, y } |');
  lines.push('| `to` | Target position { x, y } |');
  lines.push('| `targetId` | Target unit ID (for attacks) |');
  lines.push('| `data` | Additional action data |');
  lines.push('');
  
  lines.push('### Score (leaderboard games)');
  lines.push('');
  lines.push('| Field | Description |');
  lines.push('|-------|-------------|');
  lines.push('| `gameSlug` | Game this score belongs to |');
  lines.push('| `deviceId` | Player who submitted |');
  lines.push('| `displayName` | Player\'s display name |');
  lines.push('| `score` | Numeric score value |');
  lines.push('| `metadata` | Additional data (level, combo, etc.) |');
  lines.push('| `createdAt` | When score was submitted |');
  lines.push('');
  
  lines.push('### Data (all games)');
  lines.push('');
  lines.push('| Field | Description |');
  lines.push('|-------|-------------|');
  lines.push('| `gameSlug` | Game this data belongs to |');
  lines.push('| `key` | Unique key within the game |');
  lines.push('| `value` | JSON object (max 100KB) |');
  lines.push('| `scope` | "global", "player", "public" |');
  lines.push('| `ownerId` | Owner\'s deviceId (null for global scope) |');
  lines.push('| `ownerDisplayName` | Owner\'s display name |');
  lines.push('| `createdAt` | When data was created |');
  lines.push('| `updatedAt` | When data was last updated |');
  lines.push('');
  
  lines.push('---');
  lines.push('');
  lines.push('*Generated from coordinate.games API Reference*');
  
  return lines.join('\n');
}

interface EndpointSection {
  id: string;
  method: string;
  path: string;
  description: string;
  auth: boolean;
  requestBody?: {
    fields: { name: string; type: string; required: boolean; description: string }[];
    example: Record<string, unknown>;
  };
  responseBody: {
    fields: { name: string; type: string; description: string }[];
    example: Record<string, unknown>;
  };
  errors?: { status: number; description: string }[];
}

const globalEndpoints: EndpointSection[] = [
  {
    id: 'get-games',
    method: 'GET',
    path: '/api/games',
    description: 'List all active games available on the platform.',
    auth: false,
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the request was successful' },
        { name: 'games', type: 'Game[]', description: 'Array of active games' },
      ],
      example: {
        success: true,
        games: [
          { slug: 'birdwars', name: 'Bird Wars', capabilities: ['data', 'async'] },
          { slug: 'powerpentagon', name: 'Power Pentagon', capabilities: ['data', 'leaderboard'] },
        ],
      },
    },
  },
  {
    id: 'get-ping',
    method: 'GET',
    path: '/api/ping',
    description: 'Platform health check. Returns server status, uptime, and version. No authentication required.',
    auth: false,
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the request was successful' },
        { name: 'status', type: 'string', description: 'Server status ("ok")' },
        { name: 'serverTime', type: 'string', description: 'Current server time (ISO 8601)' },
        { name: 'uptime', type: 'number', description: 'Server uptime in seconds' },
        { name: 'version', type: 'string', description: 'Platform version' },
      ],
      example: {
        success: true,
        status: 'ok',
        serverTime: '2026-02-02T12:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
      },
    },
  },
];

const perGameEndpoints: EndpointSection[] = [
  {
    id: 'post-register',
    method: 'POST',
    path: '/api/[gameSlug]/register',
    description: 'Register for a specific game. Creates a game-scoped identity with unique deviceId and secretToken.',
    auth: false,
    requestBody: {
      fields: [
        { name: 'displayName', type: 'string', required: false, description: 'Player display name (max 50 chars)' },
        { name: 'avatar', type: 'string', required: false, description: 'Bird avatar: BIRD1-BIRD12 (default: BIRD1)' },
      ],
      example: { displayName: 'BirdMaster', avatar: 'BIRD4' },
    },
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the registration was successful' },
        { name: 'registered', type: 'boolean', description: 'True if already registered for this game, false if newly registered' },
        { name: 'deviceId', type: 'string', description: 'Game-scoped player ID (unique per game)' },
        { name: 'secretToken', type: 'string', description: 'Game-scoped auth token (only on NEW registration!)' },
        { name: 'displayName', type: 'string', description: 'Player display name for this game' },
        { name: 'avatar', type: 'string', description: 'Selected bird avatar for this game' },
      ],
      example: {
        success: true,
        registered: false,
        deviceId: 'a0dcb007051f88c0aef99bf01ffe224b',
        secretToken: 'bvUKW9vBPZS8GHtCXe3k8jSm56BQDP...',
        displayName: 'BirdMaster',
        avatar: 'BIRD4',
      },
    },
    errors: [
      { status: 400, description: 'Invalid request body' },
      { status: 404, description: 'Game not found or missing data capability' },
    ],
  },
  {
    id: 'get-ping',
    method: 'GET',
    path: '/api/[gameSlug]/ping',
    description: 'Check server status and version compatibility for a game. Returns version info, maintenance status, and message of the day.',
    auth: false,
    requestBody: {
      fields: [
        { name: 'clientVersion', type: 'string', required: false, description: 'Client version for compatibility check (e.g., "1.0.0")' },
      ],
      example: { clientVersion: '1.0.0' },
    },
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the request was successful' },
        { name: 'status', type: 'string', description: '"ok" | "update_available" | "update_required" | "maintenance"' },
        { name: 'serverTime', type: 'string', description: 'Current server time (ISO 8601)' },
        { name: 'minVersion', type: 'string|null', description: 'Minimum required client version' },
        { name: 'currentVersion', type: 'string|null', description: 'Latest available client version' },
        { name: 'updateUrl', type: 'string|null', description: 'URL to download update (if available)' },
        { name: 'maintenance', type: 'boolean', description: 'Whether server is in maintenance mode' },
        { name: 'motd', type: 'string|null', description: 'Message of the day' },
        { name: 'message', type: 'string|null', description: 'Human-readable status message' },
      ],
      example: {
        success: true,
        status: 'ok',
        serverTime: '2026-02-02T12:00:00.000Z',
        minVersion: '1.0.0',
        currentVersion: '1.0.0',
        updateUrl: null,
        maintenance: false,
        motd: null,
        message: null,
      },
    },
    errors: [
      { status: 404, description: 'Game not found' },
    ],
  },
  {
    id: 'post-game-ping',
    method: 'POST',
    path: '/api/[gameSlug]/ping',
    description: 'Record an authenticated player ping for a specific game. Used for presence tracking. The token must belong to a GameIdentity registered for this game — cross-game tokens are rejected.',
    auth: true,
    requestBody: {
      fields: [
        { name: 'message', type: 'string', required: false, description: 'Optional message (max 500 chars)' },
      ],
      example: { message: 'Hello from Playdate!' },
    },
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the ping was recorded' },
        { name: 'timestamp', type: 'string', description: 'When the ping was recorded (ISO 8601)' },
        { name: 'minVersion', type: 'string|null', description: 'Minimum required client version' },
        { name: 'currentVersion', type: 'string|null', description: 'Latest available client version' },
        { name: 'updateUrl', type: 'string|null', description: 'URL to download update (if available)' },
      ],
      example: {
        success: true,
        timestamp: '2026-02-02T12:00:00.000Z',
        minVersion: '1.0.0',
        currentVersion: '1.0.0',
        updateUrl: null,
      },
    },
    errors: [
      { status: 400, description: 'Invalid request body' },
      { status: 401, description: 'Unauthorized - invalid or missing token, or token does not belong to this game' },
      { status: 404, description: 'Game not found' },
    ],
  },
  {
    id: 'get-stats',
    method: 'GET',
    path: '/api/[gameSlug]/stats',
    description: 'Get the authenticated player\'s profile and battle statistics for a game. Returns identity info, battle counts by status, win/loss/draw record, win rate, and total turns submitted.',
    auth: true,
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the request was successful' },
        { name: 'stats', type: 'object', description: 'Player stats object' },
        { name: 'stats.deviceId', type: 'string', description: 'Player device ID' },
        { name: 'stats.displayName', type: 'string', description: 'Player display name' },
        { name: 'stats.avatar', type: 'string', description: 'Player avatar (e.g., BIRD1)' },
        { name: 'stats.memberSince', type: 'string|null', description: 'Registration date (ISO 8601) or null' },
        { name: 'stats.totalBattles', type: 'number', description: 'Total battles across all statuses' },
        { name: 'stats.completedBattles', type: 'number', description: 'Battles that reached completion' },
        { name: 'stats.activeBattles', type: 'number', description: 'Currently active battles' },
        { name: 'stats.pendingBattles', type: 'number', description: 'Battles waiting for an opponent' },
        { name: 'stats.wins', type: 'number', description: 'Completed battles won' },
        { name: 'stats.losses', type: 'number', description: 'Completed battles lost' },
        { name: 'stats.draws', type: 'number', description: 'Completed battles drawn' },
        { name: 'stats.winRate', type: 'string', description: 'Win percentage (e.g., "62.5%")' },
        { name: 'stats.totalTurnsSubmitted', type: 'number', description: 'Total turns submitted across all battles' },
      ],
      example: {
        success: true,
        stats: {
          deviceId: 'a0dcb007051f88c0aef99bf01ffe224b',
          displayName: 'BirdMaster',
          avatar: 'BIRD4',
          memberSince: '2026-01-15T08:30:00.000Z',
          totalBattles: 10,
          completedBattles: 8,
          activeBattles: 1,
          pendingBattles: 1,
          wins: 5,
          losses: 2,
          draws: 1,
          winRate: '62.5%',
          totalTurnsSubmitted: 45,
        },
      },
    },
    errors: [
      { status: 401, description: 'Valid Bearer token required' },
      { status: 404, description: 'Game not found' },
    ],
  },
];

const asyncEndpoints: EndpointSection[] = [
  {
    id: 'get-battles',
    method: 'GET',
    path: '/api/[gameSlug]/battles',
    description: 'List battles for an async game. By default returns public, non-abandoned battles. Use mine=true with auth to get the caller\'s own battles (including private and abandoned). Supports cursor-based pagination.',
    auth: false,
    requestBody: {
      fields: [
        { name: 'mine', type: 'string', required: false, description: 'Set to "true" to filter to the authenticated caller\'s battles only (requires auth). Includes private and abandoned battles.' },
        { name: 'status', type: 'string', required: false, description: 'Filter by status: pending, active, completed, abandoned. Only works with mine=true.' },
        { name: 'limit', type: 'number', required: false, description: 'Max results per page (default: 9, max: 50). Enables cursor-based pagination.' },
        { name: 'cursor', type: 'string', required: false, description: 'Pagination cursor from previous response\'s pagination.nextCursor' },
      ],
      example: { mine: 'true', status: 'active', limit: 9 },
    },
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the request was successful' },
        { name: 'game', type: 'object', description: 'Game info: { slug, name }' },
        { name: 'battles', type: 'Battle[]', description: 'Array of battles with player info' },
        { name: 'pagination', type: 'object', description: 'Pagination info: { hasMore, nextCursor, total, counts, limits, userCounts }' },
      ],
      example: {
        success: true,
        game: { slug: 'birdwars', name: 'Bird Wars' },
        battles: [
          {
            battleId: 'e0a5b571c0ddc493',
            displayName: 'Territorial-Retreat-54',
            player1DeviceId: 'a0dcb007...',
            player2DeviceId: 'f55c9b25...',
            player1DisplayName: 'BirdMaster',
            player1Avatar: 'BIRD3',
            player2DisplayName: 'EagleEye',
            player2Avatar: 'BIRD1',
            status: 'active',
            currentTurn: 4,
            currentPlayerIndex: 0,
            isPrivate: false,
            lastTurnAt: '2026-02-07T15:30:00.000Z',
            mapName: 'forest-clearing',
            winner: null,
          },
        ],
        pagination: {
          hasMore: false,
          nextCursor: null,
          total: 1,
          counts: { active: 1 },
          limits: { maxTotal: 9 },
          userCounts: { total: 1 },
        },
      },
    },
    errors: [
      { status: 401, description: 'mine=true requires valid Bearer token authentication' },
      { status: 400, description: 'Invalid status filter' },
      { status: 404, description: 'Game not found or missing async capability' },
    ],
  },
  {
    id: 'post-battles',
    method: 'POST',
    path: '/api/[gameSlug]/battles',
    description: 'Create a new battle. The authenticated player becomes player 1. Maximum 9 active/pending battles per player.',
    auth: true,
    requestBody: {
      fields: [
        { name: 'mapData', type: 'object', required: false, description: 'Map configuration (e.g., { selection: "ForestMap" })' },
        { name: 'isPrivate', type: 'boolean', required: false, description: 'Hide from public listings (default: false)' },
      ],
      example: { mapData: { selection: 'ForestMap' }, isPrivate: false },
    },
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the battle was created' },
        { name: 'game', type: 'object', description: 'Game info: { slug, name }' },
        { name: 'battle', type: 'Battle', description: 'Created battle object' },
        { name: 'message', type: 'string', description: 'Human-readable message' },
      ],
      example: {
        success: true,
        game: { slug: 'birdwars', name: 'Bird Wars' },
        battle: {
          battleId: 'a99958640027f6bc',
          displayName: 'Swift-Assault-17',
          status: 'pending',
          currentTurn: 0,
          isPrivate: false,
        },
        message: 'Battle created. Waiting for opponent to join.',
      },
    },
    errors: [
      { status: 401, description: 'Authentication required' },
      { status: 403, description: 'Maximum 9 active games allowed (limit_reached)' },
      { status: 404, description: 'Game not found or missing async capability' },
    ],
  },
  {
    id: 'get-battle',
    method: 'GET',
    path: '/api/[gameSlug]/battles/[id]',
    description: 'Get detailed information about a specific battle.',
    auth: false,
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the request was successful' },
        { name: 'battle', type: 'Battle', description: 'Full battle object with current state' },
      ],
      example: {
        success: true,
        battle: {
          battleId: 'e0a5b571c0ddc493',
          displayName: 'Territorial-Retreat-54',
          gameSlug: 'birdwars',
          player1DeviceId: 'a0dcb007...',
          player2DeviceId: 'f55c9b25...',
          status: 'active',
          currentTurn: 5,
          currentPlayerIndex: 1,
          mapData: { selection: 'ForestMap' },
          currentState: { units: [], blockedTiles: [] },
          isPrivate: false,
          createdAt: '2026-02-01T12:00:00.000Z',
          updatedAt: '2026-02-02T15:30:00.000Z',
        },
      },
    },
    errors: [
      { status: 404, description: 'Battle or game not found' },
    ],
  },
  {
    id: 'post-join',
    method: 'POST',
    path: '/api/[gameSlug]/battles/[id]/join',
    description: 'Join a pending battle as player 2. Changes status from "pending" to "active".',
    auth: true,
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether joining was successful' },
        { name: 'battle', type: 'Battle', description: 'Updated battle object' },
        { name: 'message', type: 'string', description: 'Human-readable message' },
      ],
      example: {
        success: true,
        battle: {
          battleId: 'e0a5b571c0ddc493',
          status: 'active',
          currentTurn: 0,
          currentPlayerIndex: 0,
        },
        message: 'Successfully joined battle as player 2',
      },
    },
    errors: [
      { status: 400, description: 'Battle not pending, already full, or cannot join own battle' },
      { status: 401, description: 'Authentication required' },
      { status: 404, description: 'Battle or game not found' },
    ],
  },
  {
    id: 'get-turns',
    method: 'GET',
    path: '/api/[gameSlug]/battles/[id]/turns',
    description: 'Get all turns for a battle, ordered by turn number.',
    auth: false,
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the request was successful' },
        { name: 'turns', type: 'Turn[]', description: 'Array of turns in order' },
      ],
      example: {
        success: true,
        turns: [
          {
            turnId: 'abc123...',
            turnNumber: 1,
            deviceId: 'a0dcb007...',
            actions: [
              { type: 'move', unitId: 'u1', from: { x: 1, y: 2 }, to: { x: 3, y: 2 } },
              { type: 'end_turn' },
            ],
            timestamp: '2026-02-01T12:05:00.000Z',
            isValid: true,
          },
        ],
      },
    },
    errors: [
      { status: 404, description: 'Battle or game not found' },
    ],
  },
  {
    id: 'post-turns',
    method: 'POST',
    path: '/api/[gameSlug]/battles/[id]/turns',
    description: 'Submit a turn with actions. Only the current active player can submit. Must include end_turn action. Max 100 actions per turn.',
    auth: true,
    requestBody: {
      fields: [
        { name: 'actions', type: 'Action[]', required: true, description: 'Array of actions (1-100, must include end_turn). Action types: move, attack, build, capture, wait, end_turn, take_off, land, supply, load, unload, combine' },
        { name: 'gameState', type: 'object', required: false, description: 'Game state snapshot after turn (max 50KB). If gameState.winner is set, battle completes.' },
      ],
      example: {
        actions: [
          { type: 'move', unitId: 'u1', from: { x: 1, y: 2 }, to: { x: 3, y: 2 } },
          { type: 'attack', unitId: 'u1', targetId: 'enemy1' },
          { type: 'end_turn' },
        ],
        gameState: {
          units: [{ unitId: 'u1', type: 'BIRD1', x: 3, y: 2, hp: 10, owner: 'a0dcb007...' }],
        },
      },
    },
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the turn was submitted' },
        { name: 'game', type: 'object', description: 'Game info: { slug, name }' },
        { name: 'turn', type: 'Turn', description: 'Submitted turn: { turnId, turnNumber, isValid, validationErrors }' },
        { name: 'battle', type: 'Battle', description: 'Updated battle state: { battleId, currentTurn, currentPlayerIndex, status, currentState }' },
        { name: 'message', type: 'string', description: 'Human-readable message' },
      ],
      example: {
        success: true,
        game: { slug: 'birdwars', name: 'Bird Wars' },
        turn: { turnId: 'xyz789...', turnNumber: 6, isValid: true, validationErrors: [] },
        battle: { battleId: 'e0a5b571c0ddc493', currentTurn: 6, currentPlayerIndex: 0, status: 'active', currentState: { units: [] } },
        message: 'Turn submitted successfully',
      },
    },
    errors: [
      { status: 400, description: 'Invalid actions or battle not active' },
      { status: 401, description: 'Authentication required' },
      { status: 403, description: 'Not your turn or not a participant' },
      { status: 404, description: 'Battle or game not found' },
      { status: 409, description: 'Turn already submitted (duplicate)' },
      { status: 413, description: 'Request payload too large (max 100KB)' },
    ],
  },
  {
    id: 'get-poll',
    method: 'GET',
    path: '/api/[gameSlug]/battles/[id]/poll',
    description: 'Long-poll for new turns since a given turn number. Use for real-time updates.',
    auth: false,
    requestBody: {
      fields: [
        { name: 'lastKnownTurn', type: 'number', required: false, description: 'Last turn number client has (query param)' },
      ],
      example: { lastKnownTurn: 5 },
    },
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the request was successful' },
        { name: 'hasNewTurns', type: 'boolean', description: 'Whether new turns are available' },
        { name: 'battle', type: 'Battle', description: 'Current battle state' },
        { name: 'newTurns', type: 'Turn[]', description: 'New turns since lastKnownTurn' },
      ],
      example: {
        success: true,
        hasNewTurns: true,
        battle: { currentTurn: 7, currentPlayerIndex: 1, status: 'active' },
        newTurns: [{ turnNumber: 6, deviceId: 'f55c9b25...', actions: [] }],
      },
    },
    errors: [
      { status: 404, description: 'Battle or game not found' },
    ],
  },
  {
    id: 'post-forfeit',
    method: 'POST',
    path: '/api/[gameSlug]/battles/[id]/forfeit',
    description: 'Forfeit an active battle or cancel a pending battle you created.',
    auth: true,
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the forfeit was successful' },
        { name: 'battle', type: 'Battle', description: 'Updated battle with winnerId and endReason' },
        { name: 'message', type: 'string', description: 'Human-readable message' },
      ],
      example: {
        success: true,
        battle: {
          battleId: 'e0a5b571c0ddc493',
          status: 'completed',
          winnerId: 'f55c9b25...',
          endReason: 'forfeit',
        },
        message: 'Battle forfeited. Opponent wins.',
      },
    },
    errors: [
      { status: 400, description: 'Battle already completed or cannot forfeit' },
      { status: 401, description: 'Authentication required' },
      { status: 403, description: 'Not a participant in this battle' },
      { status: 404, description: 'Battle or game not found' },
    ],
  },
];

const leaderboardEndpoints: EndpointSection[] = [
  {
    id: 'get-scores',
    method: 'GET',
    path: '/api/[gameSlug]/scores',
    description: 'Get leaderboard scores for a game. Only available for games with the "leaderboard" capability.',
    auth: false,
    requestBody: {
      fields: [
        { name: 'limit', type: 'number', required: false, description: 'Max results (default: 100)' },
        { name: 'offset', type: 'number', required: false, description: 'Results offset for pagination' },
        { name: 'period', type: 'string', required: false, description: 'Filter: day, week, month (default: all time)' },
      ],
      example: { limit: 10, period: 'week' },
    },
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the request was successful' },
        { name: 'scores', type: 'Score[]', description: 'Array of scores, sorted highest first' },
        { name: 'total', type: 'number', description: 'Total number of scores' },
      ],
      example: {
        success: true,
        scores: [
          { deviceId: 'a0dcb007...', displayName: 'BirdMaster', score: 25000, metadata: { level: 8 }, createdAt: '2026-02-01T10:00:00.000Z' },
          { deviceId: 'f55c9b25...', displayName: 'PentagonPro', score: 18500, metadata: { level: 6 }, createdAt: '2026-02-01T11:00:00.000Z' },
        ],
        total: 42,
      },
    },
    errors: [
      { status: 404, description: 'Game not found or missing leaderboard capability' },
    ],
  },
  {
    id: 'post-scores',
    method: 'POST',
    path: '/api/[gameSlug]/scores',
    description: 'Submit a score to the leaderboard. Players can submit multiple scores.',
    auth: true,
    requestBody: {
      fields: [
        { name: 'score', type: 'number', required: true, description: 'The score value (must be positive)' },
        { name: 'metadata', type: 'object', required: false, description: 'Additional data (level, combo, etc.)' },
      ],
      example: { score: 15000, metadata: { level: 5, combo: 12 } },
    },
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the score was submitted' },
        { name: 'score', type: 'Score', description: 'Created score object' },
        { name: 'rank', type: 'number', description: 'Current rank on leaderboard' },
        { name: 'message', type: 'string', description: 'Human-readable message' },
      ],
      example: {
        success: true,
        score: { scoreId: 'score123...', score: 15000, metadata: { level: 5 } },
        rank: 7,
        message: 'Score submitted! You are ranked #7',
      },
    },
    errors: [
      { status: 400, description: 'Invalid score value' },
      { status: 401, description: 'Authentication required' },
      { status: 404, description: 'Game not found or missing leaderboard capability' },
    ],
  },
];

const dataStorageEndpoints: EndpointSection[] = [
  {
    id: 'put-data',
    method: 'POST',
    path: '/api/[gameSlug]/data/[key]',
    description: 'Create or update a key-value pair (upsert). Only available for games with the "data" capability. Max value size: 100KB.',
    auth: true,
    requestBody: {
      fields: [
        { name: 'value', type: 'object', required: true, description: 'The value to store (any JSON object)' },
        { name: 'scope', type: 'string', required: false, description: '"global" (default), "player" (private to owner), or "public" (read-all, write-owner)' },
      ],
      example: { value: { highScore: 1500, lastLevel: 3 }, scope: 'player' },
    },
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
        { name: 'data', type: 'Data', description: 'The stored data object' },
        { name: 'message', type: 'string', description: '"Data created" or "Data updated"' },
      ],
      example: {
        success: true,
        data: {
          key: 'settings',
          value: { highScore: 1500, lastLevel: 3 },
          scope: 'player',
          ownerId: 'a0dcb007...',
          ownerDisplayName: 'BirdMaster',
          updatedAt: '2026-02-02T10:00:00.000Z',
        },
        message: 'Data created',
      },
    },
    errors: [
      { status: 400, description: 'Invalid request body or value exceeds 100KB' },
      { status: 401, description: 'Authentication required' },
      { status: 403, description: 'Cannot overwrite another player\'s data' },
      { status: 404, description: 'Game not found or missing data capability' },
    ],
  },
  {
    id: 'get-data',
    method: 'GET',
    path: '/api/[gameSlug]/data/[key]',
    description: 'Get a value by key. Public for global/public scope. Player scope requires auth and only returns own data.',
    auth: false,
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the request was successful' },
        { name: 'data', type: 'Data', description: 'The stored data object' },
      ],
      example: {
        success: true,
        data: {
          key: 'leaderboard-config',
          value: { maxEntries: 100, refreshRate: 60 },
          scope: 'global',
          ownerId: null,
          ownerDisplayName: null,
          updatedAt: '2026-02-01T12:00:00.000Z',
        },
      },
    },
    errors: [
      { status: 401, description: 'Authentication required for player-scoped data' },
      { status: 403, description: 'Cannot access another player\'s data' },
      { status: 404, description: 'Data not found or game not found' },
    ],
  },
  {
    id: 'delete-data',
    method: 'DELETE',
    path: '/api/[gameSlug]/data/[key]',
    description: 'Delete a key-value pair. Global: any authenticated user can delete. Player/public: only owner can delete.',
    auth: true,
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the deletion was successful' },
        { name: 'message', type: 'string', description: 'Confirmation message' },
        { name: 'deletedKey', type: 'string', description: 'The key that was deleted' },
      ],
      example: {
        success: true,
        message: 'Data deleted',
        deletedKey: 'old-settings',
      },
    },
    errors: [
      { status: 401, description: 'Authentication required' },
      { status: 403, description: 'Only the owner can delete this data' },
      { status: 404, description: 'Data not found or game not found' },
    ],
  },
  {
    id: 'list-data',
    method: 'GET',
    path: '/api/[gameSlug]/data',
    description: 'List all keys for a game. For player scope, only returns caller\'s keys. Supports pagination and filtering.',
    auth: false,
    requestBody: {
      fields: [
        { name: 'prefix', type: 'string', required: false, description: 'Filter keys by prefix' },
        { name: 'scope', type: 'string', required: false, description: 'Filter by scope: global, player, public' },
        { name: 'limit', type: 'number', required: false, description: 'Max results (default: 100, max: 1000)' },
        { name: 'cursor', type: 'string', required: false, description: 'Cursor for pagination' },
      ],
      example: { prefix: 'config-', scope: 'global', limit: 50 },
    },
    responseBody: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the request was successful' },
        { name: 'keys', type: 'DataKey[]', description: 'Array of key metadata (without values)' },
        { name: 'nextCursor', type: 'string|null', description: 'Cursor for next page (null if no more)' },
        { name: 'count', type: 'number', description: 'Number of keys returned' },
      ],
      example: {
        success: true,
        keys: [
          { key: 'config-display', scope: 'global', ownerId: null, ownerDisplayName: null, updatedAt: '2026-02-01T12:00:00.000Z' },
          { key: 'settings', scope: 'player', ownerId: 'a0dcb007...', ownerDisplayName: 'BirdMaster', updatedAt: '2026-02-02T10:00:00.000Z' },
        ],
        nextCursor: null,
        count: 2,
      },
    },
    errors: [
      { status: 401, description: 'Authentication required to list player-scoped data' },
      { status: 404, description: 'Game not found or missing data capability' },
    ],
  },
];

function getMethodColor(method: string) {
  switch (method) {
    case 'GET':
      return 'bg-chart-2/10 text-chart-2';
    case 'POST':
      return 'bg-primary/10 text-primary';
    case 'PUT':
      return 'bg-chart-3/10 text-chart-3';
    case 'PATCH':
      return 'bg-chart-4/10 text-chart-4';
    case 'DELETE':
      return 'bg-destructive/10 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function EndpointCard({ endpoint }: { endpoint: EndpointSection }) {
  return (
    <AccordionItem value={endpoint.id} className="border rounded-lg px-4 bg-muted/30">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase ${getMethodColor(endpoint.method)}`}>
            {endpoint.method}
          </span>
          <code className="text-sm font-mono font-semibold">{endpoint.path}</code>
          {endpoint.auth ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-chart-4/10 text-chart-4">
              <Lock className="w-3 h-3" />
              Auth
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-chart-2/10 text-chart-2">
              <Globe className="w-3 h-3" />
              Public
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-2 pb-4">
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
          </div>

          {endpoint.requestBody && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Request {endpoint.method === 'GET' ? 'Query Params' : 'Body'}</h4>
              <div className="space-y-2 mb-4">
                {endpoint.requestBody.fields.map((field) => (
                  <div key={field.name} className="flex items-start gap-2 text-sm flex-wrap">
                    <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">{field.name}</code>
                    <span className="text-muted-foreground">{field.type}</span>
                    {field.required ? (
                      <span className="text-xs text-destructive">required</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">optional</span>
                    )}
                    <span className="text-muted-foreground">— {field.description}</span>
                  </div>
                ))}
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Example:</p>
                <pre className="text-xs font-mono overflow-x-auto">
                  {JSON.stringify(endpoint.requestBody.example, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold mb-3">Response</h4>
            <div className="space-y-2 mb-4">
              {endpoint.responseBody.fields.map((field) => (
                <div key={field.name} className="flex items-start gap-2 text-sm flex-wrap">
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">{field.name}</code>
                  <span className="text-muted-foreground">{field.type}</span>
                  <span className="text-muted-foreground">— {field.description}</span>
                </div>
              ))}
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Example (200 OK):</p>
              <pre className="text-xs font-mono overflow-x-auto">
                {JSON.stringify(endpoint.responseBody.example, null, 2)}
              </pre>
            </div>
          </div>

          {endpoint.errors && endpoint.errors.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Error Responses</h4>
              <div className="space-y-1">
                {endpoint.errors.map((error) => (
                  <div key={error.status} className="flex items-center gap-2 text-sm">
                    <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-destructive/10 text-destructive">
                      {error.status}
                    </span>
                    <span className="text-muted-foreground">{error.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function SchemaPage() {
  const handleDownloadSpec = useCallback(() => {
    const markdown = generateMarkdownSpec(
      globalEndpoints,
      perGameEndpoints,
      asyncEndpoints,
      leaderboardEndpoints,
      dataStorageEndpoints
    );
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coordinate-games-api-reference.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Gamepad2 className="hidden w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">API Reference</h1>
            </div>
            <Button 
              onClick={handleDownloadSpec}
              variant="outline"
              data-testid="button-download-api-spec"
            >
              <Download className="w-4 h-4 mr-2" />
              Download .md
            </Button>
          </div>
          <p className="hidden text-muted-foreground mb-6">
            Complete documentation for the coordinate.games multi-game hub API. 
            Supports async turn-based games (like Bird Wars) and leaderboard games (like Power Pentagon).
          </p>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="overview" className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Overview & Security</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <p className="text-muted-foreground mb-6">
                  General concepts for authentication, identity, and per-game capabilities.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Authentication
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      For endpoints marked with Auth Required, include your secret token:
                    </p>
                    <code className="text-sm bg-muted px-2 py-1 rounded font-mono block overflow-x-auto">
                      Authorization: Bearer &lt;your-secret-token&gt;
                    </code>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Per-Game Identity
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Register per game via <code className="bg-muted px-1 rounded">/api/[gameSlug]/register</code>. 
                      Each game gives you a unique deviceId and token. Identities are independent per game.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card">
                  <h3 className="font-semibold mb-2">Game Capabilities</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Games have capabilities that determine which endpoints are available. Accessing an endpoint without the required capability returns 404:
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">
                      <Swords className="w-3 h-3 mr-1" />
                      birdwars → ["data", "async"] → /battles, /data
                    </Badge>
                    <Badge variant="outline">
                      <Trophy className="w-3 h-3 mr-1" />
                      powerpentagon → ["data", "leaderboard"] → /scores, /data
                    </Badge>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="global" className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Global Endpoints</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <p className="text-muted-foreground mb-6">
                  General platform-level endpoints for listing and managing games.
                </p>
                <Accordion type="multiple" className="space-y-3">
                  {globalEndpoints.map((endpoint) => (
                    <EndpointCard key={endpoint.id} endpoint={endpoint} />
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="registration" className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Registration & Identity</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <p className="text-muted-foreground mb-6">
                  Per-game registration and authentication flow. These endpoints handle player identity within each game's scope.
                </p>
                <Accordion type="multiple" className="space-y-3">
                  {perGameEndpoints.map((endpoint) => (
                    <EndpointCard key={endpoint.id} endpoint={endpoint} />
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="async" className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Async Game Endpoints</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <p className="text-muted-foreground mb-6">
                  Endpoints for turn-based multiplayer games (type: <Badge variant="outline">async</Badge>).
                  These routes handle battles, matchmaking, and turn submission.
                </p>
                <Accordion type="multiple" className="space-y-3">
                  {asyncEndpoints.map((endpoint) => (
                    <EndpointCard key={endpoint.id} endpoint={endpoint} />
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="leaderboard" className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Leaderboard Endpoints</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <p className="text-muted-foreground mb-6">
                  Endpoints for score-based games (type: <Badge variant="outline">leaderboard</Badge>).
                  These routes handle score submission and retrieval.
                </p>
                <Accordion type="multiple" className="space-y-3">
                  {leaderboardEndpoints.map((endpoint) => (
                    <EndpointCard key={endpoint.id} endpoint={endpoint} />
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="data" className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Data Storage Endpoints</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <p className="text-muted-foreground mb-6">
                  Generic key-value storage available to all games. Supports global, player, and public scoping.
                </p>
                <Accordion type="multiple" className="space-y-3">
                  {dataStorageEndpoints.map((endpoint) => (
                    <EndpointCard key={endpoint.id} endpoint={endpoint} />
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="models" className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Data Types & Models</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-medium mb-2">Game</h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p><code className="bg-muted px-1 rounded">slug</code> — Unique identifier (e.g., "birdwars")</p>
                      <p><code className="bg-muted px-1 rounded">name</code> — Human-readable name</p>
                      <p><code className="bg-muted px-1 rounded">capabilities</code> — Array of features: "async", "leaderboard", "data"</p>
                      <p><code className="bg-muted px-1 rounded">active</code> — Whether game is available</p>
                      <p><code className="bg-muted px-1 rounded">versioning</code> — Version info (minVersion, currentVersion, updateUrl)</p>
                      <p><code className="bg-muted px-1 rounded">maintenance</code> — Whether game is in maintenance mode</p>
                      <p><code className="bg-muted px-1 rounded">motd</code> — Message of the day (optional)</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">GameIdentity <Badge variant="secondary" className="text-xs ml-2">per-game</Badge></h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p><code className="bg-muted px-1 rounded">deviceId</code> — Game-scoped player identifier (unique per game)</p>
                      <p><code className="bg-muted px-1 rounded">gameSlug</code> — Game this identity belongs to</p>
                      <p><code className="bg-muted px-1 rounded">displayName</code> — Player's display name for this game</p>
                      <p><code className="bg-muted px-1 rounded">avatar</code> — Bird avatar (BIRD1-BIRD12)</p>
                      <p><code className="bg-muted px-1 rounded">createdAt</code> — Registration timestamp</p>
                      <p><code className="bg-muted px-1 rounded">lastSeen</code> — Last activity timestamp</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Battle <Badge variant="secondary" className="text-xs ml-2">async games</Badge></h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p><code className="bg-muted px-1 rounded">battleId</code> — Unique battle identifier</p>
                      <p><code className="bg-muted px-1 rounded">displayName</code> — Human-readable name (e.g., "Swift-Assault-17")</p>
                      <p><code className="bg-muted px-1 rounded">gameSlug</code> — Game this battle belongs to</p>
                      <p><code className="bg-muted px-1 rounded">player1DeviceId</code> — Player 1 (creator)</p>
                      <p><code className="bg-muted px-1 rounded">player2DeviceId</code> — Player 2 (null if pending)</p>
                      <p><code className="bg-muted px-1 rounded">status</code> — "pending" | "active" | "completed" | "abandoned"</p>
                      <p><code className="bg-muted px-1 rounded">currentTurn</code> — Current turn number</p>
                      <p><code className="bg-muted px-1 rounded">currentPlayerIndex</code> — 0 = player1's turn, 1 = player2's turn</p>
                      <p><code className="bg-muted px-1 rounded">mapData</code> — Game-specific map configuration</p>
                      <p><code className="bg-muted px-1 rounded">currentState</code> — Current game state (units, tiles, etc.)</p>
                      <p><code className="bg-muted px-1 rounded">winnerId</code> — Winner's deviceId (null if ongoing)</p>
                      <p><code className="bg-muted px-1 rounded">endReason</code> — "victory" | "forfeit" | "draw" | "cancelled"</p>
                      <p><code className="bg-muted px-1 rounded">isPrivate</code> — Hidden from public listings</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Turn <Badge variant="secondary" className="text-xs ml-2">async games</Badge></h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p><code className="bg-muted px-1 rounded">turnId</code> — Unique turn identifier</p>
                      <p><code className="bg-muted px-1 rounded">deviceId</code> — Player who submitted</p>
                      <p><code className="bg-muted px-1 rounded">turnNumber</code> — Sequential number</p>
                      <p><code className="bg-muted px-1 rounded">actions</code> — Array of actions in this turn</p>
                      <p><code className="bg-muted px-1 rounded">gameState</code> — State snapshot after turn</p>
                      <p><code className="bg-muted px-1 rounded">timestamp</code> — When turn was submitted</p>
                      <p><code className="bg-muted px-1 rounded">isValid</code> — Whether turn passed validation</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Action <Badge variant="secondary" className="text-xs ml-2">async games</Badge></h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p><code className="bg-muted px-1 rounded">type</code> — "move" | "attack" | "build" | "capture" | "wait" | "end_turn" | etc.</p>
                      <p><code className="bg-muted px-1 rounded">unitId</code> — Unit performing action</p>
                      <p><code className="bg-muted px-1 rounded">from</code> — Starting position {"{ x, y }"}</p>
                      <p><code className="bg-muted px-1 rounded">to</code> — Target position {"{ x, y }"}</p>
                      <p><code className="bg-muted px-1 rounded">targetId</code> — Target unit ID (for attacks)</p>
                      <p><code className="bg-muted px-1 rounded">data</code> — Additional action data</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Score <Badge variant="outline" className="text-xs ml-2">leaderboard games</Badge></h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p><code className="bg-muted px-1 rounded">gameSlug</code> — Game this score belongs to</p>
                      <p><code className="bg-muted px-1 rounded">deviceId</code> — Player who submitted</p>
                      <p><code className="bg-muted px-1 rounded">displayName</code> — Player's display name</p>
                      <p><code className="bg-muted px-1 rounded">score</code> — Numeric score value</p>
                      <p><code className="bg-muted px-1 rounded">metadata</code> — Additional data (level, combo, etc.)</p>
                      <p><code className="bg-muted px-1 rounded">createdAt</code> — When score was submitted</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Data <Badge variant="secondary" className="text-xs ml-2">all games</Badge></h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p><code className="bg-muted px-1 rounded">gameSlug</code> — Game this data belongs to</p>
                      <p><code className="bg-muted px-1 rounded">key</code> — Unique key within the game (prefixed with ownerId for player scope)</p>
                      <p><code className="bg-muted px-1 rounded">value</code> — JSON object (max 100KB)</p>
                      <p><code className="bg-muted px-1 rounded">scope</code> — "global" | "player" | "public"</p>
                      <p><code className="bg-muted px-1 rounded">ownerId</code> — Owner's deviceId (null for global scope)</p>
                      <p><code className="bg-muted px-1 rounded">ownerDisplayName</code> — Owner's display name</p>
                      <p><code className="bg-muted px-1 rounded">createdAt</code> — When data was created</p>
                      <p><code className="bg-muted px-1 rounded">updatedAt</code> — When data was last updated</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </main>

      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gamepad2 className="w-4 h-4" />
            <span className="font-mono font-medium">coordinate.games</span>
          </div>
          <p>Multi-game hub for async multiplayer and leaderboard games</p>
        </div>
      </footer>
    </div>
  );
}
