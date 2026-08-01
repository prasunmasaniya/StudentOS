const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

let db;

function init() {
  const userDataPath = app.getPath("userData");
  if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
  const dbPath = path.join(userDataPath, "project-titan.db");

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month_key TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      goal INTEGER NOT NULL DEFAULT 30,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS habit_checks (
      habit_id INTEGER NOT NULL,
      day INTEGER NOT NULL,
      PRIMARY KEY (habit_id, day),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

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

function close() {
  if (db) db.close();
}

// ---------- habits ----------
function listHabits(monthKey) {
  const habits = db
    .prepare("SELECT * FROM habits WHERE month_key = ? ORDER BY sort_order ASC, id ASC")
    .all(monthKey);

  const checkRows = db
    .prepare(
      `SELECT hc.habit_id, hc.day FROM habit_checks hc
       JOIN habits h ON h.id = hc.habit_id
       WHERE h.month_key = ?`
    )
    .all(monthKey);

  const checksByHabit = {};
  for (const row of checkRows) {
    if (!checksByHabit[row.habit_id]) checksByHabit[row.habit_id] = {};
    checksByHabit[row.habit_id][row.day] = true;
  }

  return habits.map((h) => ({
    id: h.id,
    name: h.name,
    goal: h.goal,
    checks: checksByHabit[h.id] || {},
  }));
}

function addHabit(monthKey, name, goal) {
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM habits WHERE month_key = ?")
    .get(monthKey).m;
  const info = db
    .prepare("INSERT INTO habits (month_key, name, goal, sort_order) VALUES (?, ?, ?, ?)")
    .run(monthKey, name || "", goal || 30, maxOrder + 1);
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

function toggleCheck(habitId, day) {
  const existing = db
    .prepare("SELECT 1 FROM habit_checks WHERE habit_id = ? AND day = ?")
    .get(habitId, day);
  if (existing) {
    db.prepare("DELETE FROM habit_checks WHERE habit_id = ? AND day = ?").run(habitId, day);
    return false;
  }
  db.prepare("INSERT INTO habit_checks (habit_id, day) VALUES (?, ?)").run(habitId, day);
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
  getSetting,
  setSetting,
};
