const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

let db;

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function init() {
  const userDataPath = app.getPath("userData");
  if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
  const dbPath = path.join(userDataPath, "project-titan.db");

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  ensureHabitsSchema();

  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'Unknown',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS deadlines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      type TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      notified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      notes TEXT DEFAULT '',
      notified INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT DEFAULT '',
      duration_minutes INTEGER NOT NULL,
      completed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS library_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT DEFAULT '',
      file_path TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);

  const quoteCount = db.prepare("SELECT COUNT(*) AS c FROM quotes").get().c;
  if (quoteCount === 0) {
    db.prepare("INSERT INTO quotes (text, author, created_at) VALUES (?, ?, ?)").run(
      "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
      "Aristotle",
      Date.now()
    );
  }
}

// Habits used to be re-created per month (month_key column). They're now
// persistent across months so streaks can be computed correctly, with checks
// stored against real calendar dates instead of a bare day number.
function ensureHabitsSchema() {
  const existing = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='habits'")
    .get();

  if (!existing) {
    createFreshHabitsSchema();
    return;
  }

  const cols = db.prepare("PRAGMA table_info(habits)").all();
  const isOldSchema = cols.some((c) => c.name === "month_key");
  if (isOldSchema) migrateFromV1();
}

function createFreshHabitsSchema() {
  db.exec(`
    CREATE TABLE habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      goal INTEGER NOT NULL DEFAULT 30,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE habit_checks (
      habit_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (habit_id, date),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );
  `);
}

// Migrates data from the old month-scoped schema. Habits with the same name
// across different months are merged into a single persistent habit. Old
// tables are kept around renamed as a backup rather than dropped.
function migrateFromV1() {
  db.exec("ALTER TABLE habits RENAME TO habits_v1_backup");
  db.exec("ALTER TABLE habit_checks RENAME TO habit_checks_v1_backup");
  createFreshHabitsSchema();

  const oldHabits = db
    .prepare("SELECT * FROM habits_v1_backup ORDER BY month_key ASC, sort_order ASC, id ASC")
    .all();

  const oldChecksByHabit = new Map();
  db.prepare("SELECT * FROM habit_checks_v1_backup").all().forEach((r) => {
    if (!oldChecksByHabit.has(r.habit_id)) oldChecksByHabit.set(r.habit_id, []);
    oldChecksByHabit.get(r.habit_id).push(r.day);
  });

  const insertHabit = db.prepare(
    "INSERT INTO habits (name, goal, sort_order, created_at) VALUES (?, ?, ?, ?)"
  );
  const insertCheck = db.prepare(
    "INSERT OR IGNORE INTO habit_checks (habit_id, date) VALUES (?, ?)"
  );

  const idByName = new Map();
  let order = 0;
  for (const oh of oldHabits) {
    const key = oh.name && oh.name.trim() ? oh.name.trim() : `(unnamed-${oh.id})`;
    let newId = idByName.get(key);
    if (!newId) {
      const info = insertHabit.run(oh.name, oh.goal, order++, `${oh.month_key}-01`);
      newId = info.lastInsertRowid;
      idByName.set(key, newId);
    }
    const days = oldChecksByHabit.get(oh.id) || [];
    for (const d of days) {
      const dateStr = `${oh.month_key}-${String(d).padStart(2, "0")}`;
      insertCheck.run(newId, dateStr);
    }
  }
}

function close() {
  if (db) db.close();
}

// ---------- streaks ----------
function computeStreaks(habitId) {
  const rows = db
    .prepare("SELECT date FROM habit_checks WHERE habit_id = ? ORDER BY date ASC")
    .all(habitId);
  const dates = rows.map((r) => r.date);
  if (dates.length === 0) return { current: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const diffDays = Math.round((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000);
    run = diffDays === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }

  const todayStr = formatDate(new Date());
  const yesterdayStr = formatDate(new Date(Date.now() - 86400000));
  const lastDate = dates[dates.length - 1];

  let current = 0;
  if (lastDate === todayStr || lastDate === yesterdayStr) {
    current = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const diffDays = Math.round((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000);
      if (diffDays === 1) current += 1;
      else break;
    }
  }

  return { current, best };
}

// ---------- habits ----------
function listHabits(year, month) {
  const monthStr = String(month).padStart(2, "0");
  const startOfMonth = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endOfMonth = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const habits = db
    .prepare("SELECT * FROM habits WHERE created_at <= ? ORDER BY sort_order ASC, id ASC")
    .all(endOfMonth);

  const checkRows = db
    .prepare("SELECT habit_id, date FROM habit_checks WHERE date >= ? AND date <= ?")
    .all(startOfMonth, endOfMonth);

  const checksByHabit = {};
  for (const row of checkRows) {
    const day = Number(row.date.slice(8, 10));
    if (!checksByHabit[row.habit_id]) checksByHabit[row.habit_id] = {};
    checksByHabit[row.habit_id][day] = true;
  }

  return habits.map((h) => {
    const streak = computeStreaks(h.id);
    return {
      id: h.id,
      name: h.name,
      goal: h.goal,
      checks: checksByHabit[h.id] || {},
      currentStreak: streak.current,
      bestStreak: streak.best,
    };
  });
}

function addHabit(name, goal) {
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM habits").get().m;
  const info = db
    .prepare("INSERT INTO habits (name, goal, sort_order, created_at) VALUES (?, ?, ?, ?)")
    .run(name || "", goal || 30, maxOrder + 1, formatDate(new Date()));
  return info.lastInsertRowid;
}

function removeHabit(habitId) {
  db.prepare("DELETE FROM habits WHERE id = ?").run(habitId);
}

function updateHabitName(habitId, name) {
  db.prepare("UPDATE habits SET name = ? WHERE id = ?").run(name, habitId);
}

function updateHabitGoal(habitId, goal) {
  db.prepare("UPDATE habits SET goal = ? WHERE id = ?").run(goal, habitId);
}

function toggleCheck(habitId, dateStr) {
  const existing = db
    .prepare("SELECT 1 FROM habit_checks WHERE habit_id = ? AND date = ?")
    .get(habitId, dateStr);
  if (existing) {
    db.prepare("DELETE FROM habit_checks WHERE habit_id = ? AND date = ?").run(habitId, dateStr);
    return false;
  }
  db.prepare("INSERT INTO habit_checks (habit_id, date) VALUES (?, ?)").run(habitId, dateStr);
  return true;
}

// ---------- quotes ----------
function listQuotes() {
  return db.prepare("SELECT * FROM quotes ORDER BY created_at ASC").all();
}
function addQuote(text, author) {
  const info = db
    .prepare("INSERT INTO quotes (text, author, created_at) VALUES (?, ?, ?)")
    .run(text, author || "Unknown", Date.now());
  return info.lastInsertRowid;
}
function removeQuote(quoteId) {
  db.prepare("DELETE FROM quotes WHERE id = ?").run(quoteId);
}

// ---------- deadlines ----------
function listDeadlines() {
  return db.prepare("SELECT * FROM deadlines ORDER BY due_date ASC").all();
}
function listDeadlinesForMonth(year, month) {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return db
    .prepare("SELECT * FROM deadlines WHERE due_date LIKE ? ORDER BY due_date ASC")
    .all(`${prefix}%`);
}
function addDeadline(title, dueDate, type, notes) {
  const info = db
    .prepare(
      "INSERT INTO deadlines (title, due_date, type, notes, notified, created_at) VALUES (?, ?, ?, ?, 0, ?)"
    )
    .run(title, dueDate, type || "", notes || "", formatDate(new Date()));
  return info.lastInsertRowid;
}
function removeDeadline(id) {
  db.prepare("DELETE FROM deadlines WHERE id = ?").run(id);
}
// Anything due tomorrow or sooner (including overdue, e.g. app was closed when
// it came due) that hasn't triggered a notification yet.
function getDeadlinesDueSoon() {
  const tomorrow = formatDate(new Date(Date.now() + 86400000));
  return db.prepare("SELECT * FROM deadlines WHERE notified = 0 AND due_date <= ?").all(tomorrow);
}
function markDeadlineNotified(id) {
  db.prepare("UPDATE deadlines SET notified = 1 WHERE id = ?").run(id);
}

// ---------- projects & milestones ----------
function listProjects() {
  const projects = db.prepare("SELECT * FROM projects ORDER BY sort_order ASC, id ASC").all();
  const milestoneRows = db
    .prepare("SELECT * FROM milestones ORDER BY sort_order ASC, id ASC")
    .all();
  const byProject = {};
  for (const m of milestoneRows) {
    if (!byProject[m.project_id]) byProject[m.project_id] = [];
    byProject[m.project_id].push(m);
  }
  return projects.map((p) => ({ ...p, milestones: byProject[p.id] || [] }));
}
function addProject(name, description) {
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM projects").get().m;
  const info = db
    .prepare(
      "INSERT INTO projects (name, description, sort_order, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(name, description || "", maxOrder + 1, formatDate(new Date()));
  return info.lastInsertRowid;
}
function removeProject(id) {
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
}
function addMilestone(projectId, title, dueDate, notes) {
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM milestones WHERE project_id = ?")
    .get(projectId).m;
  const info = db
    .prepare(
      `INSERT INTO milestones (project_id, title, due_date, status, notes, notified, sort_order, created_at)
       VALUES (?, ?, ?, 'todo', ?, 0, ?, ?)`
    )
    .run(projectId, title, dueDate || "", notes || "", maxOrder + 1, formatDate(new Date()));
  return info.lastInsertRowid;
}
function updateMilestoneStatus(id, status) {
  db.prepare("UPDATE milestones SET status = ? WHERE id = ?").run(status, id);
}
function removeMilestone(id) {
  db.prepare("DELETE FROM milestones WHERE id = ?").run(id);
}
function getMilestonesDueSoon() {
  const tomorrow = formatDate(new Date(Date.now() + 86400000));
  return db
    .prepare(
      `SELECT * FROM milestones
       WHERE notified = 0 AND status != 'done' AND due_date != '' AND due_date <= ?`
    )
    .all(tomorrow);
}
function markMilestoneNotified(id) {
  db.prepare("UPDATE milestones SET notified = 1 WHERE id = ?").run(id);
}

// ---------- pomodoro ----------
function logPomodoroSession(label, durationMinutes) {
  const info = db
    .prepare(
      "INSERT INTO pomodoro_sessions (label, duration_minutes, completed_at) VALUES (?, ?, ?)"
    )
    .run(label || "", durationMinutes, new Date().toISOString());
  return info.lastInsertRowid;
}
function listTodaysPomodoroSessions() {
  const today = formatDate(new Date());
  return db
    .prepare("SELECT * FROM pomodoro_sessions WHERE completed_at LIKE ? ORDER BY completed_at DESC")
    .all(`${today}%`);
}

// ---------- library ----------
function listLibraryItems() {
  return db.prepare("SELECT * FROM library_items ORDER BY created_at DESC").all();
}
function addLibraryItem(category, title, url, filePath, notes) {
  const info = db
    .prepare(
      `INSERT INTO library_items (category, title, url, file_path, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(category, title, url || "", filePath || "", notes || "", formatDate(new Date()));
  return info.lastInsertRowid;
}
function removeLibraryItem(id) {
  db.prepare("DELETE FROM library_items WHERE id = ?").run(id);
}

// ---------- settings ----------
function getSetting(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : null;
}
function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

module.exports = {
  init,
  close,
  listHabits,
  addHabit,
  removeHabit,
  updateHabitName,
  updateHabitGoal,
  toggleCheck,
  listQuotes,
  addQuote,
  removeQuote,
  listDeadlines,
  listDeadlinesForMonth,
  addDeadline,
  removeDeadline,
  getDeadlinesDueSoon,
  markDeadlineNotified,
  listProjects,
  addProject,
  removeProject,
  addMilestone,
  updateMilestoneStatus,
  removeMilestone,
  getMilestonesDueSoon,
  markMilestoneNotified,
  logPomodoroSession,
  listTodaysPomodoroSessions,
  listLibraryItems,
  addLibraryItem,
  removeLibraryItem,
  getSetting,
  setSetting,
};
