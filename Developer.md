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
 │   ├─ sound/                 # Sound helpers
 │   └─ jquery-global.ts       # Global jQuery binding layer for Fomantic-UI
 │
 ├─ public/                    # Static assets copied 1:1 to output root via ncp
 │   ├─ resources/             # Skins, puzzles, images, audio
 │   ├─ manifest.webmanifest   # PWA web manifest (relative paths)
 │   └─ service-worker.js      # PWA service worker (relative paths)
 ├─ dist/                      # Parcel dev output
 ├─ release/                   # Production build output
 ├─ package.json
 └─ README.md / developer.md
```

---

## Important Source Modules

### `src/jquery-global.ts`
Guarantees deterministic initialization order. It intercepts the bundler's ES Module (ESM) hoisting by exposing jQuery to the global `window` scope *before* Fomantic UI's vendor scripts load and look for `window.jQuery`.

### `src/app/SokobanApp.ts`
Main controller coordinating UI, board state, move history, solutions, and LetsLogic integration.

### `src/gui/GUI.ts`
Responsible for DOM event handling, canvas rendering (via `BoardRenderer`), the snapshot sidebar, and dialog orchestrations. To comply with strict bundler tree-shaking and scope-hoisting configurations, it decodes `$` directly from the global window scope (`const $ = (window as any).$`).

### `src/Sokoban/domainObjects/*`
Core Sokoban concepts (`Board`, `Puzzle`, `Solution`, `Snapshot`, `Collection`).

### `src/services/letslogic/LetsLogicClient.ts`
Direct browser client for:
```
POST [https://letslogic.com/api/v1/level/](https://letslogic.com/api/v1/level/)<id>
```
Handles automatic retries on "API Locked", debug logging, and form-encoded request payloads.

### `src/services/letslogic/LetsLogicService.ts`
Encapsulates all LetsLogic logic: validating keys, filtering local best solutions, and performing delta-submissions.

---

## Development Setup

### Requirements
- Node.js (LTS)
- Parcel bundler
- Any browser

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run start
```
This deploys the static files and launches Parcel on `http://localhost:1234` with hot-reloading enabled.

### Strict Type Checking
To check the entire codebase for type mismatches or incorrect type-only imports (`verbatimModuleSyntax` compliance) without triggering a build, run:
```bash
npm run typecheck
```

---

## Production Build

```bash
npm run build
```

### Compilation Workflow
1. **Type Compliance:** Runs `tsc --noEmit` via the `typecheck` script. Any structural or syntax error halts the build instantly.
2. **Bundling:** Parcel bundles and minifies assets into the `release/` folder using strictly relative asset paths (`--public-url ./`).

Upload the contents of `release/` to any static web host.

---

## LetsLogic Integration

### Direct Browser Calls
The client sends standard form payloads directly to the official endpoints without server proxies.

### Best Solution Selection
Solutions are only submitted if they strictly improve either the total move count or total push count compared to the synchronization records stored inside IndexedDB.

---

## Storage
IndexedDB via localForage stores:
- Snapshots and solutions
- Best submitted LetsLogic results per `(apiKey, letslogicId)` to prevent redundant API load.

---

## Hosting Notes & Subdirectory Support

Because all asset paths are relative and omit leading slashes (`resources/...` instead of `/resources/...`), the app can be hosted deep within nested subdirectory paths (e.g., SourceForge project subfolders or GitHub Pages project subpaths) without breaking PWA service worker scopes or canvas skin asset mapping.