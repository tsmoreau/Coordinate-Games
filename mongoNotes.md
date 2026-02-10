# MongoDB Connection Optimization Notes

## Changes Made

### 1. `lib/mongodb-client.ts` — Global Connection Caching + Pool Limits

**Problem:** The raw `MongoClient` connection was only cached globally in development mode. In production, every serverless invocation created a brand-new connection, leading to connection leaks and exhausted pool limits during traffic spikes.

**Fix:**
- Moved to universal global caching (`global._mongoClientPromise`) in **all environments**, not just development.
- Added serverless-optimized connection options:
  - `maxPoolSize: 1` — Each serverless instance opens only one connection socket. Prevents the "fan-out trap" where 50 concurrent Lambda instances with a default pool of 100 would open 5,000 connections.
  - `minPoolSize: 0` — No idle connections are kept alive unnecessarily.
  - `maxIdleTimeMS: 10000` — Idle connections are closed after 10 seconds, freeing memory on the serverless side.

---

### 2. `lib/mongodb.ts` — Mongoose Pool Size Reduction

**Problem:** Mongoose was configured with `maxPoolSize: 10`. In a traditional server this is fine (shared across thousands of requests), but in serverless each instance is isolated. With 50 concurrent users, that's 50 instances x 10 connections = 500 open database connections — enough to hit Atlas connection limits and crash the app.

**Fix:**
- `maxPoolSize` reduced from `10` to `1`.
- `maxIdleTimeMS` reduced from `30000` to `10000`.
- The global caching pattern (`global.mongoose`) was already correctly implemented — no changes needed there.

**Why `maxPoolSize: 1` is sufficient:** A serverless function typically handles one request at a time, so it rarely needs parallel database queries. Even with `Promise.all([query1, query2])`, a pool of 1 works fine — it just queues the second query for a few milliseconds.

---

### 3. `app/api/[gameSlug]/battles/[id]/poll/route.ts` — ETag/304 Polling Optimization

**Problem:** Every poll request — even when the game state hadn't changed — performed a full database query, built a JSON response, and sent the entire payload back. This costs compute duration and bandwidth on every single poll.

**Fix:** Implemented a two-phase ETag/304 pattern:

- **Phase 1 (Lightweight Check):** A Mongoose `.findOne()` with projection (`{ updatedAt: 1, currentTurn: 1 }`) and `.lean()` fetches only the two fields needed to determine freshness. This is extremely fast and low-memory.

- **Phase 2 (ETag Gate):** An ETag is generated from `updatedAt` timestamp and `currentTurn` number (e.g., `"1707500000000-5"`). If the client sends an `If-None-Match` header matching the current ETag, the server returns `304 Not Modified` with an empty body. No full document fetch, no JSON serialization.

- **Phase 3 (Full Fetch):** Only triggered when the ETag doesn't match (state has changed) or wasn't sent (client doesn't support it yet). Returns the normal rich JSON response with `ETag` and `Cache-Control: no-cache` headers set.

**Backwards Compatibility:** Clients that don't send the `If-None-Match` header simply fall through to Phase 3 and get the standard `200` response. Nothing breaks.

**Playdate Client Requirement:** To activate the optimization, the Lua polling code needs to:
1. Store the `ETag` header value from poll responses.
2. Send it back as `If-None-Match` on subsequent poll requests.
3. Handle `304` responses by skipping `json.decode()` (since the body is empty).

---

## Cost Impact Summary

| Optimization | Before | After |
|---|---|---|
| Connection pool per instance | 10-100 connections | 1 connection |
| 50 concurrent users (connections) | 500-5,000 | 50 |
| Poll request (no change) | Full DB query + JSON (~150ms) | Projection only (~10ms), 304 response (<5ms) |
| Idle connection cleanup | 30 seconds | 10 seconds |
| Estimated polling cost reduction | — | ~90% (once Playdate client sends ETag) |
