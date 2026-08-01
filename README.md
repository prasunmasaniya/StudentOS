# Project Titan

A desktop habit and productivity tracker — checklist-style daily targets, automatic
percentage/streak calculations, a monthly trend graph, weekly breakdowns, a
statistics dashboard, dark mode, and a daily rotating quote you curate yourself.

**v1.1 note:** habits used to be re-created separately for each month. They're now
persistent — the same habit carries across months, which is what makes real
current/best streaks possible (a streak has to be able to cross a month boundary).
If you already had habits/checks from v1.0, they're migrated automatically the
first time you launch this version (habits with the same name across different
months get merged into one). Your old data isn't deleted — it's kept as a backup
inside the database under renamed tables, just no longer used by the app.

Built with **Electron** (desktop shell) + **better-sqlite3** (local database), no
frontend build step required — just plain HTML/CSS/JS.

## 1. Requirements

- **Node.js** (LTS version) — download from https://nodejs.org if you don't have it.
  To check if it's installed, open a terminal and run:
  ```
  node -v
  ```

## 2. Setup

1. Unzip this project somewhere on your computer.
2. Open a terminal **inside the `project-titan` folder**.
3. Install dependencies:
   ```
   npm install
   ```
   This installs Electron and the SQLite library, and automatically rebuilds the
   SQLite library so it works inside Electron (via the `postinstall` step) — you
   shouldn't need to do anything extra.

## 3. Run it

```
npm start
```

A window should open with the app. That's it — you're running a real desktop app.

## 4. Where your data lives

Everything (habits, checkmarks, quotes) is saved to a local SQLite file in your
OS's app-data folder, **not inside the project folder** — so it survives updates
to the code. On most systems that's something like:

- Windows: `%APPDATA%\project-titan\project-titan.db`
- macOS: `~/Library/Application Support/project-titan/project-titan.db`
- Linux: `~/.config/project-titan/project-titan.db`

## 5. Troubleshooting

**"better-sqlite3" fails to load / native module error:**
Run this manually, then restart the app:
```
npx electron-rebuild -f -w better-sqlite3
```
This happens if the automatic rebuild step didn't run — usually only an issue on
first install on some Windows setups.


## 6. Roadmap — not built yet

This first version covers the core habit tracker end to end (persistent, matches
the reviewed UI). Everything below is still on the list for later phases, in
roughly the order it makes sense to tackle:

- Calendar integration
- PDF & Excel export
- Notifications / reminders before deadlines
- Goals & achievements
- Deadline setter + course assignments, project milestones, competition
  deadlines, exams
- Pomodoro sessions
- Lecture notes, useful websites, research papers, images/diagrams, project
  ideas (a notes/library section)
- Packaging into a real installer (`.exe`/`.dmg`) via `electron-builder`
- Mobile app + syncing with this desktop app (will need a small backend/cloud
  database once you get here, since two separate local SQLite files can't sync
  to each other on their own)

## 8. Project structure

```
project-titan/
├── package.json      Dependencies + npm scripts
├── main.js            Electron main process (window + IPC handlers)
├── preload.js          Secure bridge exposing window.api to the UI
├── db.js                SQLite schema + all data functions
├── index.html            App layout
├── styles.css              Visual styling (incl. dark mode)
├── renderer.js              UI logic: rendering, calculations, events
└── .gitignore
```
