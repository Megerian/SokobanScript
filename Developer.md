# SokobanScript – Developer Documentation

## Overview

SokobanScript is a TypeScript-based Sokoban engine with a browser UI, local storage, solution management, and optional LetsLogic API submission.

Originally the app required a PHP proxy because letslogic.com did not provide proper CORS headers.
This is no longer necessary — the LetsLogic API now supports direct browser calls.

Therefore:

- The PHP proxy has been removed.
- `LetsLogicClient` now calls the LetsLogic API directly from the browser.
- The project is now a completely static web application (HTML/CSS/JS; no server-side components needed).

The project runs:

- In development via Parcel (`http://localhost:1234`)
- In production as a static site (SourceForge, GitHub Pages, Netlify, any static host)

---

## Project Structure

```
(project root)
 ├─ src/
 │   ├─ app/                   # Application controller and settings
 │   ├─ gui/                   # UI, dialogs, menus, rendering glue
 │   ├─ Sokoban/               # Domain objects
 │   ├─ board/                 # Board logic
 │   ├─ services/
 │   │   ├─ letslogic/         # LetsLogicClient + LetsLogicService
 │   │   └─ pathFinding/       # Pathfinding logic
 │   ├─ storage/               # IndexedDB abstraction via localForage
 │   └─ sound/                 # Sound helpers
 │
 ├─ resources/                 # Skins, puzzles, images, audio
 ├─ dist/                      # Parcel dev output
 ├─ release/                   # Production build output
 ├─ package.json
 └─ README.md / developer.md
```

---

## Important Source Modules

### `src/app/SokobanApp.ts`
Main controller coordinating UI, board state, move history, solutions, and LetsLogic integration.

### `src/gui/GUI.ts`
Responsible for:

- DOM event handling
- Canvas rendering (via `BoardRenderer`)
- Snapshot/solution sidebar
- LetsLogic modal dialogs (API key + submission progress)

### `src/Sokoban/domainObjects/*`
Core Sokoban concepts (`Board`, `Puzzle`, `Solution`, `Snapshot`, `Collection`).

### `src/services/letslogic/LetsLogicClient.ts`
Direct browser client for:

```
POST https://letslogic.com/api/v1/level/<id>
```

Handles:

- Automatic retries on "API Locked"
- Debug logging
- Form-encoded request payloads

### `src/services/letslogic/LetsLogicService.ts`
Encapsulates all LetsLogic logic:

- Reading and validating API key
- Selecting best local solutions
- Comparing with already-submitted results
- Submitting only improving results
- Providing detailed progress logs to GUI

### `src/storage/DataStorage.ts`
Handles persistence:

- Saved snapshots/solutions
- LetsLogic submission records (per API key and puzzle ID)

---

## Development Setup

### Requirements

- Node.js (LTS)
- Parcel bundler
- Any browser

### Install Dependencies

```bash
npm install
npm install -g parcel
```

### Start Development Server

```bash
npm run start
```

This launches Parcel on:

```
http://localhost:1234
```

Parcel automatically rebuilds TypeScript and reloads on file changes.

---

## Production Build

```bash
npm run build
```

This creates an optimized static build in:

```
release/
```

Upload the contents of `release/` to any static web host.

---

## LetsLogic Integration

### Direct Browser Calls

The client now sends:

```
POST https://letslogic.com/api/v1/level/<puzzleId>
```

Body:

- `key` — API Key
- `solution` — LURD moves

No proxy server, no PHP.

### Best Solution Selection

For each puzzle:

1. Determine `bestByMove` and `bestByPush`.
2. Load previously submitted results from IndexedDB.
3. Submit solutions only if they improve either:
    - move count, or
    - push count.

### Debug Logging

Enable one of:

**API key prefix:**
```
debug: REAL_KEY
```

**Browser console:**
```js
window.LETSLOGIC_DEBUG = true
```

**Code:**
```ts
LetsLogicClient.DEBUG = true;
```

---

## Storage

IndexedDB via localForage stores:

- Snapshots and solutions
- Best submitted LetsLogic results per `(apiKey, letslogicId)`

This allows delta submission and prevents unnecessary API calls.

---

## Hosting Notes

Because the PHP proxy is removed:

- The app is now 100% static.
- Hosting works on any static platform:
    - SourceForge
    - GitHub Pages
    - Netlify
    - Cloudflare Pages
    - Local file system (file://) with some restrictions

Ensure that:

- `resources/` is uploaded intact
- `index.html` is served at the root

---

## Additional Notes

- No backend is required.
- No server configuration is required.
- LetsLogic submission is asynchronous and visible in a dedicated modal with progress log.
- Local data persists per browser origin.

