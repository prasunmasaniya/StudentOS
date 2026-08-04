# Adding a new page

Every feature from v1.3 onward gets its own page in the sidebar instead of
being added to the Habits front page. This doc is the checklist for doing
that consistently. It touches up to 6 files, in this order:

```
db.js        →  storage (only if the feature needs to save data)
main.js      →  IPC handlers (the bridge between the UI and db.js)
preload.js   →  exposes those handlers to the UI as window.api.<thing>
index.html   →  the sidebar button + the <section> for the page
styles.css   →  page-specific styling
renderer.js  →  state, loading data, rendering, and event handlers
```

If the feature doesn't need to save anything (e.g. a pure calculator or
reference page), skip straight to index.html/styles.css/renderer.js.

## The checklist

**1. Storage (`db.js`)** — only if you're saving data
- Add a `CREATE TABLE IF NOT EXISTS ...` to the block inside `init()`
- Write plain functions (`listX`, `addX`, `removeX`, ...) using
  `db.prepare(...).run(...)` / `.get(...)` / `.all(...)`
- Add every new function to the `module.exports` object at the bottom

**2. IPC handlers (`main.js`)**
- One `ipcMain.handle("thing:action", (_e, ...args) => db.thingAction(...args))`
  per function you added to db.js
- Channel names follow `"category:action"`, e.g. `"goals:add"`

**3. Expose it (`preload.js`)**
- Add a new key to the object passed to `contextBridge.exposeInMainWorld("api", {...})`,
  one method per IPC channel, e.g.:
  ```js
  goals: {
    list: () => ipcRenderer.invoke("goals:list"),
    add: (text) => ipcRenderer.invoke("goals:add", text),
  },
  ```

**4. Sidebar + page shell (`index.html`)**
- Add a nav button: `<button class="nav-btn" data-page="goals">Goals</button>`
  inside `<nav class="sidebar">`
- Add a page section inside `<div class="main-content">`:
  ```html
  <section id="page-goals" class="page hidden">
    <h1 class="page-title">Goals</h1>
    <!-- your markup -->
  </section>
  ```
  The `hidden` class is required — `setPage()` in renderer.js toggles it.

**5. Styling (`styles.css`)**
- Reuse what already exists where you can: `.card`, `.card-label`, `.btn`,
  `.btn-primary`, `.muted`, `.progress-track` / `.progress-fill`, `.tab-btn`
- Add anything page-specific at the bottom of the file

**6. Logic (`renderer.js`)**
- Add a state field near the top: `goals: [],`
- Add a loader: `async function loadGoals() { state.goals = await window.api.goals.list(); }`
- Call it inside `init()`'s `Promise.all([...])`
- Add a render function that fills in your page's DOM from `state.goals`
- Call it once after `init()`'s other render calls (near the bottom of `init()`)
- Cache your new elements in `cacheEls()` (`els.goalsList = document.getElementById("goalsList");`)
- Wire up any buttons/inputs inside `attachEvents()`

That's it — `setPage()` and the sidebar click handler (already wired, in
`attachEvents()`) handle showing/hiding pages for you. You don't need to
touch that part.

## Worked example: a minimal "Goals" page

A simple list of text goals with a checkbox — small enough to show every
step end to end.

**db.js** — inside `init()`'s schema block:
```js
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
```
Functions, anywhere below `close()`:
```js
function listGoals() {
  return db.prepare("SELECT * FROM goals ORDER BY id DESC").all();
}
function addGoal(text) {
  const info = db
    .prepare("INSERT INTO goals (text, done, created_at) VALUES (?, 0, ?)")
    .run(text, formatDate(new Date()));
  return info.lastInsertRowid;
}
function toggleGoal(id) {
  db.prepare("UPDATE goals SET done = 1 - done WHERE id = ?").run(id);
}
```
Add `listGoals, addGoal, toggleGoal,` to `module.exports`.

**main.js**:
```js
ipcMain.handle("goals:list", () => db.listGoals());
ipcMain.handle("goals:add", (_e, text) => db.addGoal(text));
ipcMain.handle("goals:toggle", (_e, id) => db.toggleGoal(id));
```

**preload.js**:
```js
goals: {
  list: () => ipcRenderer.invoke("goals:list"),
  add: (text) => ipcRenderer.invoke("goals:add", text),
  toggle: (id) => ipcRenderer.invoke("goals:toggle", id),
},
```

**index.html** — sidebar button:
```html
<button class="nav-btn" data-page="goals">Goals</button>
```
Page section:
```html
<section id="page-goals" class="page hidden">
  <h1 class="page-title">Goals</h1>
  <div class="card">
    <div class="quote-form">
      <input id="goalTextInput" type="text" placeholder="New goal" />
      <button id="addGoalBtn" class="btn btn-primary">+ Add</button>
    </div>
  </div>
  <ul id="goalsList" class="quote-list"></ul>
</section>
```
(Reusing `.quote-form` / `.quote-list` styling here instead of writing new CSS.)

**renderer.js** — state:
```js
goals: [],
```
Loader + render + cache + events:
```js
async function loadGoals() {
  state.goals = await window.api.goals.list();
}

function renderGoals() {
  els.goalsList.innerHTML = "";
  state.goals.forEach((g) => {
    const li = document.createElement("li");
    li.innerHTML = `<span style="${g.done ? "text-decoration:line-through" : ""}">${escapeHtml(g.text)}</span>`;
    const btn = document.createElement("button");
    btn.textContent = g.done ? "↺" : "✓";
    btn.addEventListener("click", async () => {
      await window.api.goals.toggle(g.id);
      await loadGoals();
      renderGoals();
    });
    li.appendChild(btn);
    els.goalsList.appendChild(li);
  });
}
```
In `cacheEls()`:
```js
els.goalTextInput = document.getElementById("goalTextInput");
els.addGoalBtn = document.getElementById("addGoalBtn");
els.goalsList = document.getElementById("goalsList");
```
In `init()`: add `loadGoals()` to the `Promise.all([...])`, and call `renderGoals();` after the other render calls.
In `attachEvents()`:
```js
els.addGoalBtn.addEventListener("click", async () => {
  const text = els.goalTextInput.value.trim();
  if (!text) return;
  await window.api.goals.add(text);
  els.goalTextInput.value = "";
  await loadGoals();
  renderGoals();
});
```

That's a complete new page: sidebar entry, persisted data, add/toggle, all
following the same pattern as Milestones/Pomodoro/Library.
