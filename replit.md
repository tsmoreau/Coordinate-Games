# coordinate.games - Multi-Game Hub

## Overview
coordinate.games is a Next.js application with a MongoDB backend that serves as a multi-game platform. Its core purpose is to provide a flexible hub where various games can integrate and share common features like player identity, data storage, turn-based battles, and leaderboards. The platform aims to offer a unified experience for players across different games while providing developers with a robust and modular API. The business vision is to become a leading platform for indie game developers to host and monetize their unique turn-based and casual games, fostering a community around shared experiences and competitive play.

## User Preferences
I prefer detailed explanations and thorough documentation. I want iterative development with clear communication before major changes. Do not make changes to files within the `/lib` folder without explicit discussion.

## System Architecture
The application is built using Next.js 16 with the App Router, a MongoDB database accessed via Mongoose, and styled with Tailwind CSS. TypeScript is used throughout the project for type safety. The architecture is centered around a **capabilities system** where each game can declare which features it utilizes: `data` (key-value storage), `async` (turn-based battles), and `leaderboard` (score submission).

**Key Architectural Decisions:**
- **Modular Game Capabilities:** Games define their functionalities via a `capabilities` array, enforcing endpoint access and enabling a mix-and-match approach to features.
- **Per-Game Player Identity:** Each game has independent player registration via `GameIdentity`. There is no global player identity — each game manages its own players independently.
- **Dynamic Routing:** API routes are structured under `/api/[gameSlug]/...` to facilitate game-specific interactions.
- **Haikunator Name Generation:** Games can configure custom word lists for generating unique player and battle display names.
- **Embedded Battle Turns:** Turn data for async games is embedded directly within the `Battle` document for performance and data locality.
- **Random Token System:** Authentication tokens are randomly generated at registration time, hashed with HMAC-SHA256, and stored per GameIdentity. There is no serial number or cross-game identity — each game registration produces an independent deviceId and token.
- **UI/UX:** The front end includes a multi-game hub showcase with a hero section displaying platform statistics, a games grid, and top scores. An interactive isometric hero animation on the homepage demonstrates responsive design and DPI-aware canvas rendering.
- **Admin Dashboard Architecture:** Two-level admin structure:
  - `/dashboard` — Platform-level with tabs: Overview (cross-game stats), Admin (platform settings), Games (manage registered games — API routes, capabilities, maintenance, MOTD)
  - `/dashboard/[gameSlug]` — Game-level with tabs: Overview (game-specific stats + API routes), Players (player management via GameIdentity), Battles (battle management scoped to game)
  - Admin actions in `app/actions/admin.ts` are game-scoped, using `GameIdentity` for players (not global `Player` model)

**Feature Specifications:**
- **Data Storage:** Generic key-value storage for games with the `data` capability, supporting global, player-scoped, and public scopes.
- **Async Turn-Based Battles:** Comprehensive API for creating, joining, playing, and managing turn-based battles for games with the `async` capability. Includes polling for turn updates.
- **Leaderboards:** Score submission and retrieval with pagination and time filters for games with the `leaderboard` capability.

## Tools Section
- **`/tools`** — OAuth-protected page showing a card grid of available developer tools. Auth enforced via NextAuth middleware.
- **`/tools/pdfontconv`** — Ported from [ttencate/pdfontconv](https://github.com/ttencate/pdfontconv). Client-side React tool that converts TTF/OTF/WOFF/WOFF2 fonts into Playdate `.fnt` format using Canvas API. All processing happens in-browser.
- To add a new tool: add an entry to the `tools` array in `app/tools/page.tsx` and create a new directory under `app/tools/[slug]/`.

## External Dependencies
- **MongoDB:** Primary database for all application data, accessed via Mongoose.
- **Next.js:** The web framework used for the application.
- **Tailwind CSS:** Utility-first CSS framework for styling.
- **NextAuth:** Used for authentication within the admin dashboard.
- **Playdate (Lua):** Client platform for some games (e.g., Bird Wars), interacting with the backend API.