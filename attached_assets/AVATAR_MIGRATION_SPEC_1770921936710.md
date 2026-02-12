# Per-Game Avatar System — GCS Migration

## Overview

Replace the hardcoded BIRD1–BIRD12 avatar system with per-game avatars stored in Google Cloud Storage. Each game defines its own set of avatar IDs. Images live in GCS at a conventional path. Players without a valid avatar get a circle SVG fallback instead of a bird image.

Bird Wars becomes a regular game with its own uploaded avatars — no special casing.

---

## Architecture

**Avatar ID**: A string like `KNIGHT1`, `WIZARD2`, `BIRD4`. Defined per game in the Game document's `avatars` array.

**GCS path convention**: `{BUCKET}/{gameSlug}/{avatarId}.png`

**URL pattern**: `https://storage.googleapis.com/{BUCKET}/{gameSlug}/{avatarId}.png`

**Fallback**: When a player has no avatar (null) or the avatar ID doesn't resolve, render a circle SVG with the first letter of their displayName. Style reference: the bouncing ball in `app/schema/page.tsx` (lines 13-14 for radius/stroke config, lines 1151-1181 for drawing). Simple colored circle with a centered letter, not the animation.

---

## Environment Variables

Add to `.env` / Vercel env:
```
GCS_BUCKET=coordinate-games-avatars
GCS_PROJECT_ID=<project-id>
GCS_CLIENT_EMAIL=<service-account-email>
GCS_PRIVATE_KEY=<service-account-private-key>
```

Use individual env vars (not a keyfile path) since this deploys on Vercel.

---

## New Files

### `lib/gcs.ts`
GCS client singleton and helper functions.

```
- Initialize Storage client from env vars (GCS_PROJECT_ID, GCS_CLIENT_EMAIL, GCS_PRIVATE_KEY)
- getBucket(): returns bucket reference from GCS_BUCKET env var
- uploadAvatar(gameSlug: string, avatarId: string, buffer: Buffer, contentType: string): Promise<string>
  - Uploads to path `{gameSlug}/{avatarId}.png`
  - Sets file as publicly readable
  - Returns the public URL
- deleteAvatar(gameSlug: string, avatarId: string): Promise<void>
  - Deletes the file from GCS
- getAvatarUrl(gameSlug: string, avatarId: string): string
  - Pure URL builder: `https://storage.googleapis.com/${BUCKET}/${gameSlug}/${avatarId}.png`
  - No network call, just string construction
```

### `components/AvatarImage.tsx`
Shared component used everywhere an avatar is rendered. Replaces all inline `birb${...}` patterns.

```tsx
interface AvatarImageProps {
  gameSlug: string;
  avatarId: string | null;
  displayName: string;
  size?: number; // pixel size, default 40
  className?: string;
}
```

Behavior:
- If `avatarId` is non-null: render `<img>` with src from `getAvatarUrl(gameSlug, avatarId)`
- If `avatarId` is null: render an inline SVG circle with the first character of `displayName` centered in it
- The SVG fallback: a filled circle (muted color) with a white uppercase letter. Keep it simple.

This is a **client component** (`'use client'`) since it may need an `onError` handler to fall back to the SVG if the GCS image 404s.

### `components/AvatarUpload.tsx`
Admin component for managing a game's avatar set. Used in the game dashboard.

```tsx
interface AvatarUploadProps {
  gameSlug: string;
  avatars: string[]; // current avatar IDs for this game
}
```

Behavior:
- Display current avatars as a grid (image + ID label + delete button each)
- File input to upload a new avatar: user provides an ID string + selects a PNG file
- Calls a server action to upload to GCS and add the ID to the game's avatars array
- Calls a server action to delete from GCS and remove from the game's avatars array
- Uses the same Card/Button/Dialog patterns as the rest of the admin UI (see `GameAdminPanel.tsx` for style reference)

### `app/api/avatars/upload/route.ts`
API route that handles the actual file upload since server actions can't easily handle multipart form data with large files.

```
- POST: receives FormData with fields: gameSlug, avatarId, file (PNG)
- Validates admin auth (check session, validate ADMIN_EMAILS — same pattern as server actions in admin.ts)
- Validates avatarId is a reasonable string (alphanumeric + numbers, no spaces, max 20 chars)
- Validates file is a PNG, reasonable size limit (e.g. 500KB)
- Calls uploadAvatar() from lib/gcs.ts
- Adds avatarId to the Game document's avatars array (use $addToSet to avoid duplicates)
- Returns { success: true, url }
```

---

## Modified Files

### `models/Game.ts`

Add `avatars` field to `IGame` interface and `GameSchema`:

```ts
// In IGame interface, add:
avatars: string[];

// In GameSchema, add:
avatars: {
  type: [String],
  default: []
}
```

No other changes to this file.

### `models/GameIdentity.ts`

**Remove** the `VALID_AVATARS` const and `PlayerAvatar` type export entirely.

Change the `avatar` field:
```ts
// Before:
avatar: {
  type: String,
  enum: VALID_AVATARS,
  default: 'BIRD1'
}

// After:
avatar: {
  type: String,
  default: null
}
```

Update `IGameIdentity` interface: `avatar` becomes `string | null`.

**Important**: Other files import `VALID_AVATARS` and `PlayerAvatar` from this module. All those imports must be removed (see register route and admin actions below).

### `app/api/[gameSlug]/register/route.ts`

Current behavior (line 3): imports `VALID_AVATARS, PlayerAvatar` from GameIdentity.
Current behavior (lines 36-37, 75-78): validates avatar against `VALID_AVATARS`.

New behavior:
- Remove `VALID_AVATARS` and `PlayerAvatar` imports
- Import `Game` model
- After `validateGame()`, fetch the game's `avatars` array: the game document is already available via `gameContext.game`— add `avatars` to what `validateGame` returns, OR do a separate `Game.findOne` for the avatars list
- Validate the submitted avatar against `gameContext.game.avatars` (or however you access it) instead of `VALID_AVATARS`
- Default avatar when none provided: `null` (not `'BIRD1'`)

**Check `gameMiddleware.ts`** — `validateGame()` returns a `GameContext` that includes the game document. Confirm that `avatars` will be present on it after the model change. It should be, since it queries the full Game document. If the `GameContext` type is explicitly typed, update it to include `avatars: string[]`.

### `app/actions/admin.ts`

**Line 7**: Remove `VALID_AVATARS, PlayerAvatar` from the GameIdentity import.

**`changeAvatar` function (line 644)**: Replace `VALID_AVATARS.includes()` check with a lookup of the game's avatars array:
```ts
const game = await Game.findOne({ slug: gameSlug });
if (!game || !game.avatars.includes(newAvatar)) {
  return { success: false, error: 'Invalid avatar' };
}
```

Add new server actions:

```ts
// Delete an avatar from a game (GCS + DB)
export async function deleteGameAvatar(gameSlug: string, avatarId: string): Promise<{ success: boolean; error?: string }>
  - requireAdminAuth()
  - Delete from GCS via deleteAvatar(gameSlug, avatarId)
  - Pull avatarId from Game.avatars array ($pull)
  - Optionally: set any GameIdentity with this avatar to null
  - revalidatePath(`/dashboard/${gameSlug}`)
```

The upload action is handled by the API route above, not a server action, because of file handling.

### `app/actions/games.ts`

**`PublicGameInfo` interface**: Add `avatars: string[]`.

**`getActiveGames` and `getPublicGameBySlug`**: Include `avatars: game.avatars || []` in the returned object.

This makes the avatar list available to public pages for rendering.

### `app/actions/battles.ts`

**`getPlayerInfo` helper (line 33)** already returns `avatar` as a string. No type change needed since we're removing the enum — it's already stored and returned as a string.

The `BattleWithPlayers` type has `player1Avatar` and `player2Avatar` as strings. The fallback `|| 'BIRD1'` on lines 93, 170, etc. should change to `|| null`. Grep for `|| 'BIRD1'` in this file and replace all with `|| null`.

### `app/actions/devices.ts`

Line 29: Change `avatar: obj.avatar || 'BIRD1'` to `avatar: obj.avatar || null`. Update the return type if it's explicitly typed.

### `app/actions/players.ts`

Line 135: Change `avatar: obj.avatar || 'BIRD1'` to `avatar: obj.avatar || null`. Update the return type if it's explicitly typed.

### `components/PlayerManagement.tsx`

**Remove** the hardcoded `AVATARS` array (lines 62-65).

**Props**: Add `avatars: string[]` to `PlayerManagementProps` (the game's avatar list, passed down from the dashboard page).

**Avatar picker dialog** (line 411-440): Instead of mapping over the hardcoded `AVATARS` array, map over the `avatars` prop. Replace the `<img src={/birb${...}}` with the `<AvatarImage>` component.

**All other avatar `<img>` tags in this file**: Replace with `<AvatarImage>`. The component needs `gameSlug` (already in props) and the player's avatar string.

### `components/PlayerDetailDialog.tsx`

Replace avatar `<img>` tags (lines 88, 193) with `<AvatarImage>`. This component will need `gameSlug` passed as a prop if it doesn't already have it — check its interface.

### `components/BattleManagement.tsx`

Replace avatar `<img>` tags (lines 195, 203) with `<AvatarImage>`. Needs `gameSlug` in scope — check if it's available or needs to be added as a prop.

### `components/BattlesList.tsx`

Replace avatar `<img>` tags (lines 118, 126) with `<AvatarImage>`. Needs `gameSlug` — check if battles already carry gameSlug or if it needs to be added as a prop.

### `app/[gameSlug]/page.tsx`

Replace the avatar `<img>` tag (line 174) with `<AvatarImage>`. `gameSlug` is already in scope.

### `app/player/[text]/page.tsx`

Lines 49-50 build the bird image path. Replace with `<AvatarImage>`. This page needs to know the `gameSlug` — check how it currently resolves the player. The player data should include `gameSlug` since `GameIdentity` is scoped per game.

### `app/dashboard/[gameSlug]/page.tsx`

**Data fetching**: Pass the game's `avatars` array down to `PlayerManagement` as a prop:
```tsx
<PlayerManagement players={players} gameSlug={gameSlug} avatars={game.avatars || []} />
```

**Avatars tab or section**: Add `AvatarUpload` component. Either:
- Add a new tab trigger + tab content for "AVATARS" (following the existing pattern for LEADERBOARDS/DATA tabs), OR
- Add it as a section within the existing ADMIN tab

Recommendation: new tab, same pattern as lines 121-126 (leaderboard tab). No capability gate needed — all games can have avatars.

```tsx
<TabsTrigger value="avatars">
  <ImageIcon className="w-4 h-4 mr-2" />
  AVATARS
</TabsTrigger>

<TabsContent value="avatars">
  <AvatarUpload gameSlug={gameSlug} avatars={game.avatars || []} />
</TabsContent>
```

### `components/GameAdminPanel.tsx`

No changes needed if avatars get their own tab. If you put the upload widget here instead, add it as a new Card section.

### `app/schema/page.tsx`

Update avatar documentation references:
- Line 182: Change from `BIRD1-BIRD12` to describe per-game avatars
- Line 337: Update the register endpoint field description
- Line 339: Update the example
- Line 1414: Update the avatar description
- All other `BIRD` references in documentation strings

### `next.config.mjs`

Add GCS domain to image remote patterns:
```js
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['mongoose'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
}
```

Note: This is only needed if using Next.js `<Image>` component. If using plain `<img>` tags (which the codebase currently does everywhere), this config change is not strictly required but is good to have for future use.

### `package.json`

Add dependency:
```
"@google-cloud/storage": "^7.0.0"
```

---

## File Deletions

Remove all static bird avatar images:
```
public/birb001.png
public/birb002.png
public/birb003.png
public/birb004.png
public/birb005.png
public/birb006.png
public/birb007.png
public/birb008.png
public/birb009.png
public/birb010.png
public/birb011.png
public/birb012.png
```

These will be re-uploaded to GCS under `bird-wars/BIRD1.png` through `bird-wars/BIRD12.png` via the new admin upload UI.

---

## Migration Steps (Manual)

After deploying the code changes:

1. Set GCS env vars in Vercel
2. Create the GCS bucket with public read access
3. Via the admin dashboard, go to Bird Wars → Avatars tab
4. Upload the 12 bird PNGs as BIRD1–BIRD12
5. Existing GameIdentity records with BIRD1–BIRD12 values will continue to work since the avatar field is now a free string and Bird Wars will have those IDs in its avatars array

No database migration script needed — existing `avatar: 'BIRD4'` values remain valid strings. The only change is that validation moves from a hardcoded enum to the game's avatars array.

---

## Patterns to Follow

- **Server actions** follow the pattern in `app/actions/admin.ts`: `requireAdminAuth()` check, `connectToDatabase()`, try/catch, `revalidatePath()`.
- **API routes** follow the pattern in `app/api/[gameSlug]/register/route.ts`: try/catch, `NextResponse.json({ success, ... })`.
- **Components** use shadcn/ui (`Card`, `Button`, `Dialog`, `Badge`, etc.) — see any existing component for imports.
- **Admin components** are `'use client'` with `useTransition` for async actions and `toast` for feedback — see `ScoreManagement.tsx` or `PlayerManagement.tsx` as templates.
- **Model hot-reload pattern**: Every model file ends with `if (mongoose.models.X) { delete mongoose.models.X; }` before the export.
- **Mongoose `$addToSet`** for adding avatar IDs (avoids duplicates). **`$pull`** for removing.

---

## What NOT to Change

- Battle model/schema (avatar strings are stored on GameIdentity, not Battle)
- Score model
- Data model
- Auth middleware (`lib/authMiddleware.ts`)
- Game middleware (`lib/gameMiddleware.ts`) — unless the GameContext type needs `avatars` added explicitly
- Any API route other than `/register` and the new upload route
- The `getPlayerInfo` helper signature — it already returns avatar as a string
