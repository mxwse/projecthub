# ProjectHub

Persönliches Software-Projekt-Management-System als lokale Desktop-App (Windows/macOS/Linux).

![Stack](https://img.shields.io/badge/Electron-React%20%2B%20TypeScript%20%2B%20Tailwind-c8f55a)

## Features

- **Projektverwaltung**: Erstellen, Bearbeiten, Duplizieren, Archivieren, Favoriten, Löschen
- **Projektkarten** mit Status (🟢 Aktiv, 🟡 Planung, 🔵 Pausiert, 🔴 Fehler, ✅ Abgeschlossen, ⚪ Archiviert), Technologie-Chips, Fortschrittsbalken, Priorität und relativer Änderungszeit
- **Detailansicht** mit Tabs: Übersicht (inkl. Meilensteine + Fortschritts-Slider), Aufgaben, Notizen, Versionen, Dateien, Dokumentation
- **Kanban-Aufgabenboard** (To Do / In Progress / Testing / Done) mit Drag & Drop, Prioritäten und Deadlines — global und pro Projekt
- **Roadmap**: Meilensteine aller Projekte als Monats-Timeline, überfällige rot markiert
- **Statistiken**: KPIs, Status-Donut, Technologie-Verteilung, Fortschritt pro Projekt, Aufgaben-Balkendiagramm
- **Suche & Filter** (Status, Technologie, Priorität) + Sortierung
- **Dark/Light Theme**, automatische Speicherung, Toast-Benachrichtigungen (inkl. Hinweis auf überfällige Aufgaben)
- **Datenhaltung**: lokale SQLite-Datenbank, Auto-Backup beim Start (letzte 14 werden behalten), manuelles Backup, JSON-Import/-Export

## Entwicklung

```bash
npm install        # Abhängigkeiten installieren
npm run dev        # Entwicklungsmodus mit Hot Reload
npm run build      # Typecheck + Produktions-Build nach out/
npm start          # Produktions-Build bauen und starten
npm run dist       # Windows-Installer bauen (release/)
```

## Architektur

```
src/
├── shared/types.ts      # Gemeinsame Typen + IPC-API-Vertrag (Api-Interface)
├── main/                # Electron-Main-Prozess
│   ├── index.ts         # App-Lifecycle, Fenster
│   ├── db.ts            # SQLite (sql.js/WASM), Schema, CRUD, Backups, Import/Export
│   └── ipc.ts           # IPC-Handler (Dialoge, Dateisystem, Datenbankzugriff)
├── preload/index.ts     # contextBridge: typsichere window.api
└── renderer/src/        # React-UI
    ├── store.tsx        # Globaler Zustand (Context), Navigation, Toasts, Theme
    ├── utils.ts         # Status-/Prioritäts-Metadaten, Zeitformatierung
    ├── components/      # Sidebar, ProjectCard, Kanban, Modals, UI-Basis
    └── views/           # Dashboard, Projekte, Detail, Aufgaben, Roadmap, Statistiken, Einstellungen
```

**Datenfluss:** Renderer → `window.api.*` (Preload) → IPC → Main-Prozess → SQLite-Datei.
Die Datenbank liegt unter `%APPDATA%/projecthub/projecthub.db`, Backups daneben in `backups/`.
Schreibvorgänge werden debounced (400 ms) auf die Platte persistiert; beim Beenden wird geflusht.

## Installation

Ein fertiger, signierter Installer wird nicht angeboten. Wer die App nutzen will, baut sie
selbst mit `npm install` und `npm run dist`; der so erzeugte Installer ist unsigniert,
Windows SmartScreen warnt entsprechend vor einem unbekannten Herausgeber.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
