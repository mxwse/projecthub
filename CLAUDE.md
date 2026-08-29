# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ProjectHub — a local desktop app (Electron + React + TypeScript + Tailwind v4) for managing personal software projects. UI language is **German**; keep all user-facing strings German.

## Commands

```bash
npm run dev        # Dev mode with hot reload (electron-vite dev)
npm run build      # Typecheck (both tsconfigs) + production build to out/
npm run typecheck  # tsc --noEmit for tsconfig.node.json AND tsconfig.web.json
npm test           # node --test, Pfadgrenze der files:*-Handler
npm start          # Build + launch production preview
npm run dist       # Build Windows installer via electron-builder (release/)
```

`npm run build` is the verification gate — always run it after changes. Tests gibt es bisher nur für `src/main/pfad-grenze.ts` (13 Fälle, dependency-frei über `node --test`); ein Linter ist weiterhin nicht konfiguriert.

## Sicherheitsgrenzen im Main-Prozess

- **`files:listDir` / `readFile` / `writeFile` / `openInVSCode` / `openPath` akzeptieren nur Pfade innerhalb der Projektordner** (`project.localPath`) plus der Ordner, die der Nutzer in dieser Sitzung selbst über den Dialog gewählt hat. Die Regel steht in `src/main/pfad-grenze.ts` und ist dort getestet. Wer einen neuen Datei-Handler ergänzt, muss `istErlaubt()` selbst aufrufen — es gibt keinen automatischen Schutz.
- **Kein `exec` mit interpolierten Pfaden.** `terminal:openExternal` nutzt `spawn` mit der `cwd`-Option, `files:openInVSCode` nutzt `execFile` mit Argument-Array. Ein Pfad wird nie Teil einer Kommandozeile.
- **`sandbox: true`** im BrowserWindow. Das Preload-Skript nutzt nur `contextBridge` und `ipcRenderer` und braucht keine vollen Node-APIs — wer das ändert, hebt die Sandbox auf.
- **`shell.openExternal` nur für `http`/`https`**, geprüft an beiden Aufrufstellen (`main/index.ts`, `main/ipc.ts`).

## Architecture

Three Electron processes wired through one typed contract:

- **`src/shared/types.ts`** is the single source of truth: domain types (Project, Task, Note, Version, Milestone) and the `Api` interface that defines every IPC method. When adding a feature, extend `Api` here first, then implement in main + preload, then consume in the renderer.
- **`src/main/db.ts`** — SQLite via **sql.js (WASM, no native modules)**. The DB lives in memory and is debounce-persisted (400 ms) to `%APPDATA%/projecthub/projecthub.db`; `flush()` runs on quit. Rows are snake_case, mapped to camelCase domain objects via `rowTo*` mappers. Schema changes go into `migrate()` (CREATE TABLE IF NOT EXISTS — for new columns add try/catch ALTER TABLE). Auto-backup on every start, keeps 14.
- **`src/main/ipc.ts`** — registers `ipcMain.handle` per `Api` method, channel names are `entity:action` (e.g. `projects:update`). Also owns native dialogs (export/import/pick folder) and shell access.
- **`src/preload/index.ts`** — mirrors `Api` 1:1 onto `window.api` via contextBridge. `src/preload/index.d.ts` declares the global type for the renderer.
- **`src/renderer/src/store.tsx`** — single React context (`useApp()`): all projects/tasks/settings state, view-based navigation (no router — `View` union + `navigate()`/`openProject()`), toasts, theme. Mutations call `window.api` then re-fetch the affected slice. Notes/versions/milestones are loaded on demand inside the detail-view tabs, not in the store.

## Conventions

- Path aliases: `@/` → `src/renderer/src/`, `@shared/` → `src/shared/` (defined in both electron.vite.config.ts and tsconfig.web.json — keep in sync).
- Design system lives in `src/renderer/src/styles/index.css`: CSS variables for dark (`:root`) and light (`:root.light`) themes, mapped to Tailwind tokens via `@theme inline` (e.g. `bg-panel`, `text-dim`, `border-line`, `text-accent`). Never hardcode colors; use the tokens or `var(--…)`.
- **Since 24.07.2026 the tokens follow the mxw-it design system „Deutsches Ingenieurdokument"** (paper/ink/signal orange): warm ink-dark + `#ff6a35` accent (dark), paper + `#c23a08` (light). The instrument-panel character (grid, mono labels, glow) is intentional and stays. Hardcoded color spots that must be kept in sync with the tokens: `src/renderer/src/monaco.ts` (editor themes), `src/renderer/src/views/TerminalView.tsx` (xterm theme), `src/main/index.ts` (window backgroundColor).
- Typography: IBM Plex Sans (UI, `@fontsource-variable/ibm-plex-sans`), IBM Plex Mono for labels/numbers via `.t-label` / `.t-mono` (`@fontsource/ibm-plex-mono` 400/500).
- Status/priority metadata (labels, colors) is centralized in `src/renderer/src/utils.ts` (`STATUS_META`, `PRIORITY_META`, `TASK_COLUMNS`).
- German domain values are stored in the DB: project status `aktiv|planung|pausiert|fehler|abgeschlossen`, priority `niedrig|mittel|hoch|kritisch`. Task status is English: `todo|in_progress|testing|done`. Archived is a separate boolean flag, not a status.
