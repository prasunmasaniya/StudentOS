# Project Titan

A desktop habit and productivity tracker — checklist-style daily targets, automatic
percentage/streak calculations, a monthly trend graph, weekly breakdowns, a
statistics dashboard, dark mode, and a daily rotating quote you curate yourself.

**v1.3 note:** the app is now multi-page instead of one long scrolling screen.
A sidebar on the left switches between **Habits** (the original front page,
unchanged), **Milestones** (projects with status-tracked milestones),
**Pomodoro** (a focus timer that logs sessions), and **Library** (notes,
useful websites, research papers, and file/image attachments, organized by
category). See `ADDING_A_PAGE.md` for how this is structured if you want to
add another page yourself later — every feature from here on gets its own
page rather than being added to the front page.

**v1.2 note:** added a Calendar view (switch to it via the tab above the habit
grid) that shows each day's completion as a heat bar and lets you add
deadlines, which show up as tags on their due date. Deadlines also trigger a
native desktop notification once they're due tomorrow or sooner — note that
this only fires **while the app is open**; a plain desktop app like this has
no background service, so if it's closed when a deadline comes due, you'll
get the reminder the next time you open it instead of exactly on time.
Also added **Export PDF** and **Export Excel** buttons above the habit grid,
which export whatever month you're currently viewing.

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

## 6. Publishing to GitHub

From inside the `project-titan` folder:

```
git init
git add .
git commit -m "Initial commit: Project Titan desktop app"
```

Then create an empty repository on github.com (don't initialize it with a README —
you already have one), and it will show you two commands like these:

```
git remote add origin https://github.com/<your-username>/project-titan.git
git branch -M main
git push -u origin main
```

Run those, and your code is live on GitHub. `node_modules` won't be pushed (it's
excluded in `.gitignore`) — anyone who clones the repo just runs `npm install`
themselves.

For future changes, the day-to-day loop is:
```
git add .
git commit -m "describe what changed"
git push
```

## 7. Roadmap — not built yet

The app is now multi-page: **Habits** (front page), **Milestones**, **Pomodoro**,
and **Library** all live in the sidebar. See `ADDING_A_PAGE.md` for the pattern
used to add a page — every future feature below should follow it rather than
getting bolted onto the front page.

Still on the list, in roughly the order it makes sense to tackle:

- Goals & achievements
- Packaging into a real installer (`.exe`/`.dmg`) via `electron-builder`
- Mobile app + syncing with this desktop app (will need a small backend/cloud
  database once you get here, since two separate local SQLite files can't sync
  to each other on their own)

## 8. Project structure

```
project-titan/
├── package.json      Dependencies + npm scripts
├── main.js            Electron main process (window, IPC, exports, notifications)
├── preload.js          Secure bridge exposing window.api to the UI
├── db.js                SQLite schema + all data functions
├── index.html            App layout: sidebar nav + one <section> per page
├── styles.css              Visual styling (incl. dark mode)
├── renderer.js              UI logic: rendering, calculations, events
├── ADDING_A_PAGE.md          Step-by-step pattern for adding a new page
└── .gitignore
```
