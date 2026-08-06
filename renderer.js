const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const state = {
  year: new Date().getFullYear(),
  monthIndex: new Date().getMonth(),
  habits: [],
  quotes: [],
  deadlines: [],
  darkMode: false,
  quotePanelOpen: false,
  view: "grid",
  page: "habits",
  projects: [],
  pomodoroToday: [],
  pomodoro: {
    phase: "focus",
    secondsLeft: 25 * 60,
    running: false,
    timerId: null,
    focusCount: 0,
    durations: { focus: 25, short_break: 5, long_break: 15 },
  },
  libraryItems: [],
  libraryFilter: "All",
  pendingAttachmentPath: null,
  allDeadlines: [],
  dlEditingId: null,
  notes: [],
  activeNoteId: null,
  noteSearchQuery: "",
  noteSaveDebounce: null,
  timer: {
    mode: "countdown",
    countdown: { running: false, remainingSeconds: 300, totalSeconds: 300, intervalId: null },
    stopwatch: { running: false, elapsedMs: 0, startedAt: null, intervalId: null, laps: [] },
  },
  gaTab: "goals",
  goals: [],
  goalEditingId: null,
  achievementStats: null,
  unlockedAchievementIds: [],
};

// Static achievement catalog — 8 categories x 3 tiers, checked against live stats from db.
const ACHIEVEMENT_DEFS = [
  { id: "habits-bronze", category: "Habits Created", statKey: "habitsCreated", threshold: 1, tier: "bronze", icon: "🌱", title: "First Steps", desc: "Create your first habit" },
  { id: "habits-silver", category: "Habits Created", statKey: "habitsCreated", threshold: 5, tier: "silver", icon: "🌿", title: "Habit Builder", desc: "Create 5 habits" },
  { id: "habits-gold", category: "Habits Created", statKey: "habitsCreated", threshold: 15, tier: "gold", icon: "🌳", title: "Habit Architect", desc: "Create 15 habits" },

  { id: "streak-bronze", category: "Longest Streak", statKey: "longestStreakEver", threshold: 7, tier: "bronze", icon: "🔥", title: "On a Roll", desc: "Reach a 7-day streak" },
  { id: "streak-silver", category: "Longest Streak", statKey: "longestStreakEver", threshold: 30, tier: "silver", icon: "🔥", title: "Unstoppable", desc: "Reach a 30-day streak" },
  { id: "streak-gold", category: "Longest Streak", statKey: "longestStreakEver", threshold: 100, tier: "gold", icon: "🔥", title: "Iron Will", desc: "Reach a 100-day streak" },

  { id: "checks-bronze", category: "Check-ins", statKey: "totalCheckIns", threshold: 25, tier: "bronze", icon: "✅", title: "Getting Started", desc: "Log 25 habit check-ins" },
  { id: "checks-silver", category: "Check-ins", statKey: "totalCheckIns", threshold: 100, tier: "silver", icon: "✅", title: "Centurion", desc: "Log 100 habit check-ins" },
  { id: "checks-gold", category: "Check-ins", statKey: "totalCheckIns", threshold: 500, tier: "gold", icon: "✅", title: "Habit Master", desc: "Log 500 habit check-ins" },

  { id: "milestones-bronze", category: "Milestones", statKey: "milestonesDone", threshold: 1, tier: "bronze", icon: "🏁", title: "First Milestone", desc: "Complete a milestone" },
  { id: "milestones-silver", category: "Milestones", statKey: "milestonesDone", threshold: 10, tier: "silver", icon: "🏁", title: "Project Pro", desc: "Complete 10 milestones" },
  { id: "milestones-gold", category: "Milestones", statKey: "milestonesDone", threshold: 25, tier: "gold", icon: "🏁", title: "Milestone Master", desc: "Complete 25 milestones" },

  { id: "deadlines-bronze", category: "Deadlines", statKey: "deadlinesDone", threshold: 1, tier: "bronze", icon: "📅", title: "Beat the Clock", desc: "Complete a deadline" },
  { id: "deadlines-silver", category: "Deadlines", statKey: "deadlinesDone", threshold: 10, tier: "silver", icon: "📅", title: "Deadline Slayer", desc: "Complete 10 deadlines" },
  { id: "deadlines-gold", category: "Deadlines", statKey: "deadlinesDone", threshold: 25, tier: "gold", icon: "📅", title: "Never Late", desc: "Complete 25 deadlines" },

  { id: "pomodoro-bronze", category: "Focus Sessions", statKey: "pomodoroSessionsTotal", threshold: 5, tier: "bronze", icon: "🍅", title: "Focus Novice", desc: "Complete 5 pomodoro sessions" },
  { id: "pomodoro-silver", category: "Focus Sessions", statKey: "pomodoroSessionsTotal", threshold: 25, tier: "silver", icon: "🍅", title: "Deep Work", desc: "Complete 25 pomodoro sessions" },
  { id: "pomodoro-gold", category: "Focus Sessions", statKey: "pomodoroSessionsTotal", threshold: 100, tier: "gold", icon: "🍅", title: "Flow State", desc: "Complete 100 pomodoro sessions" },

  { id: "notes-bronze", category: "Notes", statKey: "notesCreated", threshold: 1, tier: "bronze", icon: "📝", title: "Jotted Down", desc: "Create your first note" },
  { id: "notes-silver", category: "Notes", statKey: "notesCreated", threshold: 10, tier: "silver", icon: "📝", title: "Note Taker", desc: "Create 10 notes" },
  { id: "notes-gold", category: "Notes", statKey: "notesCreated", threshold: 30, tier: "gold", icon: "📝", title: "Archivist", desc: "Create 30 notes" },

  { id: "library-bronze", category: "Library", statKey: "libraryItemsTotal", threshold: 1, tier: "bronze", icon: "📚", title: "Collector", desc: "Add your first library item" },
  { id: "library-silver", category: "Library", statKey: "libraryItemsTotal", threshold: 10, tier: "silver", icon: "📚", title: "Curator", desc: "Add 10 library items" },
  { id: "library-gold", category: "Library", statKey: "libraryItemsTotal", threshold: 30, tier: "gold", icon: "📚", title: "Librarian", desc: "Add 30 library items" },
];

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheEls();
  populateMonthSelect();

  const savedDark = await window.api.settings.get("darkMode");
  state.darkMode = savedDark === "1";
  applyDarkMode();

  await Promise.all([
    loadHabits(),
    loadQuotes(),
    loadDeadlines(),
    loadAllDeadlines(),
    loadProjects(),
    loadPomodoroToday(),
    loadLibraryItems(),
    loadPomodoroSettings(),
    loadNotes(),
    loadGoals(),
    loadAchievementData(),
  ]);

  attachEvents();
  renderAll();
  renderProjects();
  renderPomodoroTimer();
  renderPomodoroToday();
  renderLibraryFilter();
  renderLibraryGrid();
  renderDeadlinesPage();
  renderNotesList();
  renderCountdownDisplay();
  renderStopwatchDisplay();
  startClock();
  renderGoalsList();
  await refreshAchievements();
}

function cacheEls() {
  els.shell = document.getElementById("shell");
  els.quoteBanner = document.getElementById("quoteBanner");
  els.darkToggleBtn = document.getElementById("darkToggleBtn");
  els.quoteToggleBtn = document.getElementById("quoteToggleBtn");
  els.monthSelect = document.getElementById("monthSelect");
  els.quotePanel = document.getElementById("quotePanel");
  els.quoteTextInput = document.getElementById("quoteTextInput");
  els.quoteAuthorInput = document.getElementById("quoteAuthorInput");
  els.addQuoteBtn = document.getElementById("addQuoteBtn");
  els.quoteList = document.getElementById("quoteList");
  els.statsDashboard = document.getElementById("statsDashboard");
  els.topPerformanceList = document.getElementById("topPerformanceList");
  els.dynamicsChart = document.getElementById("dynamicsChart");
  els.tableHeadRow = document.getElementById("tableHeadRow");
  els.tableBody = document.getElementById("tableBody");
  els.tableFootRow = document.getElementById("tableFootRow");
  els.weeklyGrid = document.getElementById("weeklyGrid");
  els.gridViewBtn = document.getElementById("gridViewBtn");
  els.calendarViewBtn = document.getElementById("calendarViewBtn");
  els.gridViewEl = document.getElementById("gridView");
  els.calendarViewEl = document.getElementById("calendarView");
  els.exportPdfBtn = document.getElementById("exportPdfBtn");
  els.exportExcelBtn = document.getElementById("exportExcelBtn");
  els.deadlineTitleInput = document.getElementById("deadlineTitleInput");
  els.deadlineDateInput = document.getElementById("deadlineDateInput");
  els.deadlineTypeInput = document.getElementById("deadlineTypeInput");
  els.addDeadlineBtn = document.getElementById("addDeadlineBtn");
  els.calendarGrid = document.getElementById("calendarGrid");
  els.deadlineList = document.getElementById("deadlineList");

  // Deadlines page
  els.dlTitleInput = document.getElementById("dlTitleInput");
  els.dlDateInput = document.getElementById("dlDateInput");
  els.dlTypeInput = document.getElementById("dlTypeInput");
  els.dlPriorityInput = document.getElementById("dlPriorityInput");
  els.dlNotesInput = document.getElementById("dlNotesInput");
  els.dlSaveBtn = document.getElementById("dlSaveBtn");
  els.dlCancelEditBtn = document.getElementById("dlCancelEditBtn");
  els.dlFormTitle = document.getElementById("dlFormTitle");
  els.dlSummaryRow = document.getElementById("dlSummaryRow");
  els.dlBoard = document.getElementById("dlBoard");

  // Milestones page
  els.projectNameInput = document.getElementById("projectNameInput");
  els.projectDescInput = document.getElementById("projectDescInput");
  els.addProjectBtn = document.getElementById("addProjectBtn");
  els.projectList = document.getElementById("projectList");

  // Pomodoro page
  els.pomodoroPhaseLabel = document.getElementById("pomodoroPhaseLabel");
  els.pomodoroTime = document.getElementById("pomodoroTime");
  els.pomodoroLabelInput = document.getElementById("pomodoroLabelInput");
  els.pomodoroStartBtn = document.getElementById("pomodoroStartBtn");
  els.pomodoroResetBtn = document.getElementById("pomodoroResetBtn");
  els.focusMinInput = document.getElementById("focusMinInput");
  els.shortBreakMinInput = document.getElementById("shortBreakMinInput");
  els.longBreakMinInput = document.getElementById("longBreakMinInput");
  els.pomodoroTodayCount = document.getElementById("pomodoroTodayCount");
  els.pomodoroTodayMinutes = document.getElementById("pomodoroTodayMinutes");
  els.pomodoroHistoryList = document.getElementById("pomodoroHistoryList");

  // Notes page
  els.noteSearchInput = document.getElementById("noteSearchInput");
  els.newNoteBtn = document.getElementById("newNoteBtn");
  els.notesList = document.getElementById("notesList");
  els.noteEditorEmpty = document.getElementById("noteEditorEmpty");
  els.noteEditor = document.getElementById("noteEditor");
  els.noteTitleInput = document.getElementById("noteTitleInput");
  els.noteLastEdited = document.getElementById("noteLastEdited");
  els.deleteNoteBtn = document.getElementById("deleteNoteBtn");
  els.noteContentInput = document.getElementById("noteContentInput");

  // Timer page
  els.clockTime = document.getElementById("clockTime");
  els.clockDate = document.getElementById("clockDate");
  els.countdownTabBtn = document.getElementById("countdownTabBtn");
  els.stopwatchTabBtn = document.getElementById("stopwatchTabBtn");
  els.countdownPanel = document.getElementById("countdownPanel");
  els.stopwatchPanel = document.getElementById("stopwatchPanel");
  els.countdownDisplay = document.getElementById("countdownDisplay");
  els.countdownHoursInput = document.getElementById("countdownHoursInput");
  els.countdownMinutesInput = document.getElementById("countdownMinutesInput");
  els.countdownSecondsInput = document.getElementById("countdownSecondsInput");
  els.countdownStartBtn = document.getElementById("countdownStartBtn");
  els.countdownPauseBtn = document.getElementById("countdownPauseBtn");
  els.countdownResetBtn = document.getElementById("countdownResetBtn");
  els.stopwatchDisplay = document.getElementById("stopwatchDisplay");
  els.stopwatchStartBtn = document.getElementById("stopwatchStartBtn");
  els.stopwatchPauseBtn = document.getElementById("stopwatchPauseBtn");
  els.stopwatchLapBtn = document.getElementById("stopwatchLapBtn");
  els.stopwatchResetBtn = document.getElementById("stopwatchResetBtn");
  els.stopwatchLaps = document.getElementById("stopwatchLaps");

  // Goals & Achievements page
  els.goalsTabBtn = document.getElementById("goalsTabBtn");
  els.achievementsTabBtn = document.getElementById("achievementsTabBtn");
  els.goalsPanel = document.getElementById("goalsPanel");
  els.achievementsPanel = document.getElementById("achievementsPanel");
  els.goalFormTitle = document.getElementById("goalFormTitle");
  els.goalTitleInput = document.getElementById("goalTitleInput");
  els.goalTargetInput = document.getElementById("goalTargetInput");
  els.goalUnitInput = document.getElementById("goalUnitInput");
  els.goalDueDateInput = document.getElementById("goalDueDateInput");
  els.goalSaveBtn = document.getElementById("goalSaveBtn");
  els.goalCancelEditBtn = document.getElementById("goalCancelEditBtn");
  els.goalsList = document.getElementById("goalsList");
  els.achievementsSummary = document.getElementById("achievementsSummary");
  els.achievementsGrid = document.getElementById("achievementsGrid");

  // Library page
  els.libraryCategoryInput = document.getElementById("libraryCategoryInput");
  els.libraryTitleInput = document.getElementById("libraryTitleInput");
  els.libraryUrlInput = document.getElementById("libraryUrlInput");
  els.libraryNotesInput = document.getElementById("libraryNotesInput");
  els.attachFileBtn = document.getElementById("attachFileBtn");
  els.attachedFileChip = document.getElementById("attachedFileChip");
  els.addLibraryItemBtn = document.getElementById("addLibraryItemBtn");
  els.libraryFilter = document.getElementById("libraryFilter");
  els.libraryGrid = document.getElementById("libraryGrid");
}

// ---------- date helpers ----------
function daysInMonth() {
  return new Date(state.year, state.monthIndex + 1, 0).getDate();
}
function dayNumbers() {
  return Array.from({ length: daysInMonth() }, (_, i) => i + 1);
}
function weekChunks() {
  const days = dayNumbers();
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}
function dateStrFor(day) {
  return `${state.year}-${String(state.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function populateMonthSelect() {
  els.monthSelect.innerHTML = "";
  MONTH_NAMES.forEach((name, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${name} ${state.year}`;
    if (i === state.monthIndex) opt.selected = true;
    els.monthSelect.appendChild(opt);
  });
}

// ---------- data loading ----------
async function loadHabits() {
  state.habits = await window.api.habits.list(state.year, state.monthIndex + 1);
}
async function loadQuotes() {
  state.quotes = await window.api.quotes.list();
}
async function loadDeadlines() {
  state.deadlines = await window.api.deadlines.listForMonth(state.year, state.monthIndex + 1);
}

async function loadAllDeadlines() {
  state.allDeadlines = await window.api.deadlines.list();
}
async function loadProjects() {
  state.projects = await window.api.projects.list();
}
async function loadPomodoroToday() {
  state.pomodoroToday = await window.api.pomodoro.listToday();
}
async function loadLibraryItems() {
  state.libraryItems = await window.api.library.list();
}
async function loadPomodoroSettings() {
  const f = await window.api.settings.get("pomodoro_focus");
  const s = await window.api.settings.get("pomodoro_short_break");
  const l = await window.api.settings.get("pomodoro_long_break");
  if (f) state.pomodoro.durations.focus = Number(f);
  if (s) state.pomodoro.durations.short_break = Number(s);
  if (l) state.pomodoro.durations.long_break = Number(l);
  els.focusMinInput.value = state.pomodoro.durations.focus;
  els.shortBreakMinInput.value = state.pomodoro.durations.short_break;
  els.longBreakMinInput.value = state.pomodoro.durations.long_break;
  state.pomodoro.secondsLeft = pomodoroPhaseSeconds(state.pomodoro.phase);
}

function applyDarkMode() {
  els.shell.classList.toggle("dark", state.darkMode);
  els.darkToggleBtn.textContent = state.darkMode ? "☀️" : "🌙";
}

function todaysQuote() {
  if (state.quotes.length === 0) return null;
  const idx = dayOfYear(new Date()) % state.quotes.length;
  return state.quotes[idx];
}

// ---------- computations ----------
function computeStats() {
  const days = dayNumbers();

  const perHabit = state.habits.map((h) => {
    const done = days.reduce((acc, d) => acc + (h.checks[d] ? 1 : 0), 0);
    const left = Math.max(h.goal - done, 0);
    const pct = h.goal > 0 ? Math.min(100, Math.round((done / h.goal) * 100)) : 0;
    return { ...h, done, left, pct };
  });

  const named = perHabit.filter((h) => h.name.trim().length > 0);
  const activeCount = named.length || 1;

  const dailyTotals = days.map((d) =>
    perHabit.reduce((acc, h) => acc + (h.checks[d] ? 1 : 0), 0)
  );

  const monthlyDynamics = days.map((d, i) => ({
    day: d,
    pct: Math.round((dailyTotals[i] / activeCount) * 100),
  }));

  const weeks = weekChunks();
  const weeklyBreakdown = weeks.map((weekDays, wi) => {
    const possible = weekDays.length * activeCount;
    const completed = weekDays.reduce((acc, d) => acc + dailyTotals[days.indexOf(d)], 0);
    return {
      weekNum: wi + 1,
      completed,
      possible,
      left: Math.max(possible - completed, 0),
      rate: possible > 0 ? Math.round((completed / possible) * 100) : 0,
    };
  });

  const topPerformance = [...named].sort((a, b) => b.pct - a.pct).slice(0, 5);

  const totalCheckIns = dailyTotals.reduce((a, b) => a + b, 0);
  const habitsOnTrack = named.filter((h) => h.goal > 0 && h.done >= h.goal).length;
  const totalDone = named.reduce((acc, h) => acc + h.done, 0);
  const totalGoal = named.reduce((acc, h) => acc + h.goal, 0);
  const overallPct = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;

  let longestCurrent = null;
  let longestBest = null;
  named.forEach((h) => {
    if (!longestCurrent || h.currentStreak > longestCurrent.value) {
      longestCurrent = { name: h.name, value: h.currentStreak };
    }
    if (!longestBest || h.bestStreak > longestBest.value) {
      longestBest = { name: h.name, value: h.bestStreak };
    }
  });

  let bestDay = null;
  dailyTotals.forEach((t, i) => {
    if (!bestDay || t > bestDay.total) bestDay = { day: days[i], total: t };
  });

  const dashboard = {
    overallPct,
    habitsOnTrack,
    totalHabits: named.length,
    totalCheckIns,
    longestCurrent,
    longestBest,
    bestDay,
  };

  return { perHabit, dailyTotals, monthlyDynamics, weeklyBreakdown, topPerformance, dashboard };
}

function barClass(pct) {
  if (pct >= 80) return "fill-green";
  if (pct >= 50) return "fill-amber";
  if (pct > 0) return "fill-red";
  return "fill-empty";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

// ---------- render ----------
function renderAll() {
  renderQuoteBanner();
  renderQuoteList();
  const stats = computeStats();
  renderStatsDashboard(stats.dashboard);
  renderTopPerformance(stats.topPerformance);
  renderDynamicsChart(stats.monthlyDynamics);
  renderHabitTable(stats.perHabit, stats.dailyTotals);
  renderWeeklyBreakdown(stats.weeklyBreakdown);
  renderCalendar(stats.monthlyDynamics);
  renderDeadlineList();
}

function renderQuoteBanner() {
  const q = todaysQuote();
  els.quoteBanner.innerHTML = q
    ? `"${escapeHtml(q.text)}" — <span class="author">${escapeHtml(q.author)}</span>`
    : "No quotes yet — add some via the quote icon.";
}

function renderQuoteList() {
  els.quoteList.innerHTML = "";
  const today = todaysQuote();

  if (state.quotes.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No quotes yet — add one above.";
    els.quoteList.appendChild(li);
    return;
  }

  state.quotes.forEach((q) => {
    const li = document.createElement("li");
    if (today && q.id === today.id) li.classList.add("today");

    const span = document.createElement("span");
    span.innerHTML = `"${escapeHtml(q.text)}" — <span class="muted">${escapeHtml(q.author)}</span>`;
    if (today && q.id === today.id) {
      const badge = document.createElement("span");
      badge.className = "today-badge";
      badge.textContent = "Today";
      span.appendChild(badge);
    }
    li.appendChild(span);

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", async () => {
      await window.api.quotes.remove(q.id);
      await loadQuotes();
      renderQuoteBanner();
      renderQuoteList();
    });
    li.appendChild(removeBtn);

    els.quoteList.appendChild(li);
  });
}

function renderStatsDashboard(d) {
  const tiles = [
    { label: "Monthly Completion", value: `${d.overallPct}%` },
    { label: "Habits On Track", value: `${d.habitsOnTrack}/${d.totalHabits}` },
    { label: "Total Check-ins", value: `${d.totalCheckIns}` },
    {
      label: "Longest Active Streak",
      value: d.longestCurrent && d.longestCurrent.value > 0 ? `${d.longestCurrent.value}d` : "—",
      sub: d.longestCurrent && d.longestCurrent.value > 0 ? d.longestCurrent.name : null,
    },
    {
      label: "Longest Streak Ever",
      value: d.longestBest && d.longestBest.value > 0 ? `${d.longestBest.value}d` : "—",
      sub: d.longestBest && d.longestBest.value > 0 ? d.longestBest.name : null,
    },
    {
      label: "Best Day",
      value: d.bestDay ? `Day ${d.bestDay.day}` : "—",
      sub: d.bestDay ? `${d.bestDay.total} done` : null,
    },
  ];

  els.statsDashboard.innerHTML = "";
  tiles.forEach((t) => {
    const div = document.createElement("div");
    div.className = "card stat-tile";
    div.innerHTML = `
      <div class="stat-value">${escapeHtml(t.value)}</div>
      <div class="stat-label">${escapeHtml(t.label)}</div>
      ${t.sub ? `<div class="stat-sub">${escapeHtml(t.sub)}</div>` : ""}
    `;
    els.statsDashboard.appendChild(div);
  });
}

function renderTopPerformance(top) {
  els.topPerformanceList.innerHTML = "";
  if (top.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Add a habit to see rankings.";
    els.topPerformanceList.appendChild(li);
    return;
  }
  top.forEach((h, i) => {
    const li = document.createElement("li");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${i + 1}. ${h.name}`;
    const pctB = document.createElement("b");
    pctB.textContent = `${h.pct}%`;
    li.appendChild(nameSpan);
    li.appendChild(pctB);
    els.topPerformanceList.appendChild(li);
  });
}

function renderDynamicsChart(data) {
  const canvas = els.dynamicsChart;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 600;
  const height = 170;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (data.length === 0) return;

  const padL = 32, padR = 10, padT = 10, padB = 20;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const maxX = data.length - 1;

  const xAt = (i) => padL + (i / Math.max(maxX, 1)) * plotW;
  const yAt = (pct) => padT + (1 - pct / 100) * plotH;

  ctx.strokeStyle = state.darkMode ? "#374151" : "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.fillStyle = state.darkMode ? "#9ca3af" : "#6b7280";
  ctx.font = "10px sans-serif";
  [0, 25, 50, 75, 100].forEach((v) => {
    const y = yAt(v);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(width - padR, y);
    ctx.stroke();
    ctx.fillText(`${v}%`, 2, y + 3);
  });

  ctx.beginPath();
  ctx.moveTo(xAt(0), yAt(data[0].pct));
  data.forEach((d, i) => ctx.lineTo(xAt(i), yAt(d.pct)));
  ctx.lineTo(xAt(maxX), yAt(0));
  ctx.lineTo(xAt(0), yAt(0));
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, "rgba(34,197,94,0.45)");
  grad.addColorStop(1, "rgba(34,197,94,0)");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  data.forEach((d, i) => {
    const x = xAt(i), y = yAt(d.pct);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function renderHabitTable(perHabit, dailyTotals) {
  const days = dayNumbers();
  const totalCols = 10 + days.length; // #, name, goal, days..., done, left, progress, %, streak, best, remove

  els.tableHeadRow.innerHTML = `
    <th>#</th><th class="name-cell">Habit Name</th><th>Goal</th>
    ${days.map((d) => `<th>${d}</th>`).join("")}
    <th>Done</th><th>Left</th><th>Progress</th><th>%</th><th>Streak</th><th>Best</th><th></th>
  `;

  els.tableBody.innerHTML = "";

  if (perHabit.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = totalCols;
    td.className = "muted";
    td.style.textAlign = "left";
    td.style.padding = "16px 8px";
    td.innerHTML = `No habits yet. <button id="loadExampleBtn" class="add-habit-btn">Load example habits</button>`;
    tr.appendChild(td);
    els.tableBody.appendChild(tr);
  } else {
    perHabit.forEach((h, idx) => {
      const tr = document.createElement("tr");

      const idxTd = document.createElement("td");
      idxTd.textContent = idx + 1;
      tr.appendChild(idxTd);

      const nameTd = document.createElement("td");
      nameTd.className = "name-cell";
      const nameInput = document.createElement("input");
      nameInput.className = "name-input";
      nameInput.value = h.name;
      nameInput.placeholder = "Habit name";
      nameInput.addEventListener("change", async (e) => {
        await window.api.habits.updateName(h.id, e.target.value);
        await loadHabits();
        renderAll();
      });
      nameTd.appendChild(nameInput);
      tr.appendChild(nameTd);

      const goalTd = document.createElement("td");
      const goalInput = document.createElement("input");
      goalInput.type = "number";
      goalInput.min = "0";
      goalInput.className = "goal-input";
      goalInput.value = h.goal;
      goalInput.addEventListener("change", async (e) => {
        await window.api.habits.updateGoal(h.id, Math.max(0, Number(e.target.value) || 0));
        await loadHabits();
        renderAll();
      });
      goalTd.appendChild(goalInput);
      tr.appendChild(goalTd);

      days.forEach((d) => {
        const td = document.createElement("td");
        td.className = "check-cell";
        const btn = document.createElement("button");
        const isChecked = !!h.checks[d];
        if (isChecked) {
          btn.classList.add("checked");
          btn.textContent = "✓";
        }
        btn.addEventListener("click", async () => {
          await window.api.habits.toggleCheck(h.id, dateStrFor(d));
          await loadHabits();
          renderAll();
          refreshAchievements();
        });
        td.appendChild(btn);
        tr.appendChild(td);
      });

      const doneTd = document.createElement("td");
      doneTd.textContent = h.done;
      tr.appendChild(doneTd);

      const leftTd = document.createElement("td");
      leftTd.textContent = h.left;
      leftTd.className = "muted";
      tr.appendChild(leftTd);

      const progressTd = document.createElement("td");
      const track = document.createElement("div");
      track.className = "progress-track";
      const fill = document.createElement("div");
      fill.className = `progress-fill ${barClass(h.pct)}`;
      fill.style.width = `${h.pct}%`;
      track.appendChild(fill);
      progressTd.appendChild(track);
      tr.appendChild(progressTd);

      const pctTd = document.createElement("td");
      pctTd.textContent = `${h.pct}%`;
      pctTd.className = "pct-cell";
      tr.appendChild(pctTd);

      const streakTd = document.createElement("td");
      streakTd.className = "streak-cell";
      streakTd.innerHTML =
        h.currentStreak > 0 ? `🔥 ${h.currentStreak}` : `<span class="muted">0</span>`;
      tr.appendChild(streakTd);

      const bestStreakTd = document.createElement("td");
      bestStreakTd.className = "muted";
      bestStreakTd.textContent = h.bestStreak;
      tr.appendChild(bestStreakTd);

      const removeTd = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "✕";
      removeBtn.className = "remove-btn";
      removeBtn.addEventListener("click", async () => {
        await window.api.habits.remove(h.id);
        await loadHabits();
        renderAll();
      });
      removeTd.appendChild(removeBtn);
      tr.appendChild(removeTd);

      els.tableBody.appendChild(tr);
    });
  }

  const loadExampleBtn = document.getElementById("loadExampleBtn");
  if (loadExampleBtn) loadExampleBtn.addEventListener("click", loadExampleHabits);

  // footer row
  els.tableFootRow.innerHTML = "";

  const addTd = document.createElement("td");
  const addBtn = document.createElement("button");
  addBtn.textContent = "+";
  addBtn.className = "add-habit-btn";
  addBtn.title = "Add habit";
  addBtn.addEventListener("click", async () => {
    await window.api.habits.add("", daysInMonth());
    await loadHabits();
    renderAll();
    refreshAchievements();
  });
  addTd.appendChild(addBtn);
  els.tableFootRow.appendChild(addTd);

  const labelTd = document.createElement("td");
  labelTd.colSpan = 2;
  labelTd.textContent = "Daily Total";
  labelTd.className = "muted";
  els.tableFootRow.appendChild(labelTd);

  dailyTotals.forEach((t) => {
    const td = document.createElement("td");
    td.textContent = t;
    els.tableFootRow.appendChild(td);
  });

  const spacerTd = document.createElement("td");
  spacerTd.colSpan = 4;
  els.tableFootRow.appendChild(spacerTd);
}

function renderWeeklyBreakdown(weeks) {
  els.weeklyGrid.innerHTML = "";
  weeks.forEach((w) => {
    const div = document.createElement("div");
    div.className = "card week-card";
    div.innerHTML = `
      <h3>Week ${w.weekNum}</h3>
      <div class="week-row"><span class="muted">Completed:</span><b>${w.completed}/${w.possible}</b></div>
      <div class="week-row"><span class="muted">Left:</span><b>${w.left}</b></div>
      <div class="week-row"><span class="muted">Success:</span><b>${w.rate}%</b></div>
      <div class="progress-track"><div class="progress-fill ${barClass(w.rate)}" style="width:${w.rate}%"></div></div>
    `;
    els.weeklyGrid.appendChild(div);
  });
}

function renderCalendar(monthlyDynamics) {
  const grid = els.calendarGrid;
  grid.innerHTML = "";

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((w) => {
    const el = document.createElement("div");
    el.className = "cal-weekday";
    el.textContent = w;
    grid.appendChild(el);
  });

  const firstWeekday = new Date(state.year, state.monthIndex, 1).getDay();
  for (let i = 0; i < firstWeekday; i++) {
    const pad = document.createElement("div");
    pad.className = "cal-cell empty";
    grid.appendChild(pad);
  }

  const deadlinesByDay = {};
  state.deadlines.forEach((dl) => {
    const day = Number(dl.due_date.slice(8, 10));
    if (!deadlinesByDay[day]) deadlinesByDay[day] = [];
    deadlinesByDay[day].push(dl);
  });

  const today = new Date();
  const isCurrentMonthView =
    today.getFullYear() === state.year && today.getMonth() === state.monthIndex;

  monthlyDynamics.forEach((dd) => {
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    if (isCurrentMonthView && dd.day === today.getDate()) cell.classList.add("today");

    const dayNum = document.createElement("div");
    dayNum.className = "cal-day-num";
    dayNum.textContent = dd.day;
    cell.appendChild(dayNum);

    const bar = document.createElement("div");
    bar.className = "cal-completion-bar";
    const fill = document.createElement("div");
    fill.className = `cal-fill ${barClass(dd.pct)}`;
    fill.style.width = `${dd.pct}%`;
    bar.appendChild(fill);
    cell.appendChild(bar);

    (deadlinesByDay[dd.day] || []).forEach((dl) => {
      const tag = document.createElement("div");
      tag.className = "cal-deadline-tag";
      tag.textContent = dl.title;
      tag.title = dl.type ? `${dl.type}: ${dl.title}` : dl.title;
      cell.appendChild(tag);
    });

    grid.appendChild(cell);
  });
}

function renderDeadlineList() {
  els.deadlineList.innerHTML = "";
  if (state.deadlines.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No deadlines this month.";
    els.deadlineList.appendChild(li);
    return;
  }
  [...state.deadlines]
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .forEach((dl) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.innerHTML = `<b>${escapeHtml(dl.due_date)}</b> — ${escapeHtml(dl.title)}${
        dl.type ? ` <span class="muted">(${escapeHtml(dl.type)})</span>` : ""
      }`;
      li.appendChild(span);

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", async () => {
        await window.api.deadlines.remove(dl.id);
        await loadDeadlines();
        renderAll();
      });
      li.appendChild(removeBtn);

      els.deadlineList.appendChild(li);
    });
}

// ===== Deadlines page =====

function dlDaysLeft(dueDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  return Math.round((due - today) / 86400000);
}

function renderDeadlinesPage() {
  if (!els.dlBoard) return;

  const all = state.allDeadlines;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Summary chips
  const overdue = all.filter(d => !d.done && dlDaysLeft(d.due_date) < 0);
  const thisWeek = all.filter(d => !d.done && dlDaysLeft(d.due_date) >= 0 && dlDaysLeft(d.due_date) <= 7);
  const upcoming = all.filter(d => !d.done && dlDaysLeft(d.due_date) > 7);
  const done = all.filter(d => d.done);

  els.dlSummaryRow.innerHTML = "";
  if (all.length === 0) {
    const c = document.createElement("span");
    c.className = "dl-chip";
    c.textContent = "No deadlines yet";
    els.dlSummaryRow.appendChild(c);
  } else {
    if (overdue.length) {
      const c = document.createElement("span");
      c.className = "dl-chip overdue";
      c.textContent = `${overdue.length} overdue`;
      els.dlSummaryRow.appendChild(c);
    }
    if (thisWeek.length) {
      const c = document.createElement("span");
      c.className = "dl-chip week";
      c.textContent = `${thisWeek.length} due this week`;
      els.dlSummaryRow.appendChild(c);
    }
    if (upcoming.length) {
      const c = document.createElement("span");
      c.className = "dl-chip ok";
      c.textContent = `${upcoming.length} upcoming`;
      els.dlSummaryRow.appendChild(c);
    }
    if (done.length) {
      const c = document.createElement("span");
      c.className = "dl-chip";
      c.textContent = `${done.length} done`;
      els.dlSummaryRow.appendChild(c);
    }
  }

  // Build groups
  const groups = [
    { key: "overdue", label: "Overdue", items: overdue, titleClass: "overdue" },
    { key: "week",    label: "Due this week", items: thisWeek, titleClass: "week" },
    { key: "later",   label: "Coming up", items: upcoming, titleClass: "" },
    { key: "done",    label: "Done", items: done, titleClass: "done" },
  ];

  els.dlBoard.innerHTML = "";

  groups.forEach(group => {
    if (group.items.length === 0) return;
    const section = document.createElement("div");
    section.className = "dl-group";

    const heading = document.createElement("div");
    heading.className = `dl-group-title ${group.titleClass}`;
    heading.textContent = group.label;
    section.appendChild(heading);

    const ul = document.createElement("ul");
    ul.className = "dl-list";

    // Sort by due_date asc within each group
    [...group.items]
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .forEach(dl => {
        ul.appendChild(buildDlItem(dl));
      });

    section.appendChild(ul);
    els.dlBoard.appendChild(section);
  });

  if (all.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.style.textAlign = "center";
    empty.style.marginTop = "32px";
    empty.textContent = "No deadlines yet — add one above.";
    els.dlBoard.appendChild(empty);
  }
}

function buildDlItem(dl) {
  const days = dlDaysLeft(dl.due_date);

  const li = document.createElement("li");
  li.className = `dl-item ${dl.priority}-priority${dl.done ? " done-item" : ""}`;

  // Checkbox
  const check = document.createElement("button");
  check.className = `dl-check${dl.done ? " checked" : ""}`;
  check.title = dl.done ? "Mark as not done" : "Mark as done";
  check.textContent = dl.done ? "✓" : "";
  check.addEventListener("click", async () => {
    await window.api.deadlines.toggleDone(dl.id);
    await loadAllDeadlines();
    await loadDeadlines();
    renderDeadlinesPage();
    renderAll();
    refreshAchievements();
  });
  li.appendChild(check);

  // Body
  const body = document.createElement("div");
  body.className = "dl-body";

  const titleRow = document.createElement("div");
  titleRow.className = "dl-title-row";

  const titleEl = document.createElement("span");
  titleEl.className = "dl-title";
  titleEl.title = dl.title;
  titleEl.textContent = dl.title;
  titleRow.appendChild(titleEl);

  if (dl.type) {
    const badge = document.createElement("span");
    badge.className = `dl-badge type-${dl.type}`;
    badge.textContent = dl.type;
    titleRow.appendChild(badge);
  }

  const dot = document.createElement("span");
  dot.className = `dl-priority-dot ${dl.priority}`;
  dot.title = `${dl.priority.charAt(0).toUpperCase() + dl.priority.slice(1)} priority`;
  titleRow.appendChild(dot);

  body.appendChild(titleRow);

  const meta = document.createElement("div");
  meta.className = "dl-meta";

  const dateSpan = document.createElement("span");
  dateSpan.textContent = dl.due_date;
  meta.appendChild(dateSpan);

  const countdown = document.createElement("span");
  countdown.className = "dl-countdown";
  if (dl.done) {
    countdown.textContent = "✓ completed";
  } else if (days < 0) {
    countdown.className += " overdue";
    countdown.textContent = `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
  } else if (days === 0) {
    countdown.className += " overdue";
    countdown.textContent = "Due today!";
  } else if (days <= 3) {
    countdown.className += " soon";
    countdown.textContent = `${days} day${days !== 1 ? "s" : ""} left`;
  } else {
    countdown.textContent = `${days} days left`;
  }
  meta.appendChild(countdown);
  body.appendChild(meta);

  if (dl.notes && dl.notes.trim()) {
    const notes = document.createElement("div");
    notes.className = "dl-notes";
    notes.textContent = dl.notes;
    body.appendChild(notes);
  }

  li.appendChild(body);

  // Actions
  const actions = document.createElement("div");
  actions.className = "dl-actions";

  const editBtn = document.createElement("button");
  editBtn.textContent = "✏";
  editBtn.title = "Edit";
  editBtn.addEventListener("click", () => dlStartEdit(dl));
  actions.appendChild(editBtn);

  const delBtn = document.createElement("button");
  delBtn.className = "dl-del-btn";
  delBtn.textContent = "✕";
  delBtn.title = "Delete";
  delBtn.addEventListener("click", async () => {
    if (!confirm(`Delete "${dl.title}"?`)) return;
    await window.api.deadlines.remove(dl.id);
    if (state.dlEditingId === dl.id) dlCancelEdit();
    await loadAllDeadlines();
    await loadDeadlines();
    renderDeadlinesPage();
    renderAll();
  });
  actions.appendChild(delBtn);

  li.appendChild(actions);
  return li;
}

function dlStartEdit(dl) {
  state.dlEditingId = dl.id;
  els.dlTitleInput.value = dl.title;
  els.dlDateInput.value = dl.due_date;
  els.dlTypeInput.value = dl.type || "";
  els.dlPriorityInput.value = dl.priority || "medium";
  els.dlNotesInput.value = dl.notes || "";
  els.dlFormTitle.textContent = "Edit deadline";
  els.dlSaveBtn.textContent = "Save changes";
  els.dlCancelEditBtn.classList.remove("hidden");
  els.dlTitleInput.focus();
  // Scroll form into view
  els.dlFormTitle.scrollIntoView({ behavior: "smooth", block: "start" });
}

function dlCancelEdit() {
  state.dlEditingId = null;
  els.dlTitleInput.value = "";
  els.dlDateInput.value = "";
  els.dlTypeInput.value = "";
  els.dlPriorityInput.value = "medium";
  els.dlNotesInput.value = "";
  els.dlFormTitle.textContent = "Add deadline";
  els.dlSaveBtn.textContent = "+ Add deadline";
  els.dlCancelEditBtn.classList.add("hidden");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ================= Milestones page =================
function nextStatus(s) {
  if (s === "todo") return "in_progress";
  if (s === "in_progress") return "done";
  return "todo";
}
function statusLabel(s) {
  return { todo: "To do", in_progress: "In progress", done: "Done" }[s] || s;
}
function statusClass(s) {
  return { todo: "status-pending", in_progress: "status-active", done: "status-done" }[s] || "";
}

function renderProjects() {
  const container = els.projectList;
  container.innerHTML = "";

  if (state.projects.length === 0) {
    container.innerHTML = `<p class="muted">No projects yet. Add one above to start tracking milestones.</p>`;
    return;
  }

  state.projects.forEach((p) => {
    const done = p.milestones.filter((m) => m.status === "done").length;
    const pct = p.milestones.length ? Math.round((done / p.milestones.length) * 100) : 0;

    const card = document.createElement("div");
    card.className = "card project-card";

    const head = document.createElement("div");
    head.className = "project-card-head";
    head.innerHTML = `
      <div>
        <h3>${escapeHtml(p.name)}</h3>
        ${p.description ? `<p class="muted small">${escapeHtml(p.description)}</p>` : ""}
      </div>
    `;
    const removeProjectBtn = document.createElement("button");
    removeProjectBtn.className = "remove-btn";
    removeProjectBtn.textContent = "✕ Remove project";
    removeProjectBtn.addEventListener("click", async () => {
      if (!confirm(`Delete project "${p.name}" and all its milestones?`)) return;
      await window.api.projects.remove(p.id);
      await loadProjects();
      renderProjects();
    });
    head.appendChild(removeProjectBtn);
    card.appendChild(head);

    const track = document.createElement("div");
    track.className = "progress-track";
    track.innerHTML = `<div class="progress-fill ${barClass(pct)}" style="width:${pct}%"></div>`;
    card.appendChild(track);

    const summary = document.createElement("p");
    summary.className = "muted small";
    summary.style.margin = "6px 0 0";
    summary.textContent = `${done}/${p.milestones.length} milestones complete`;
    card.appendChild(summary);

    const list = document.createElement("ul");
    list.className = "milestone-list";
    [...p.milestones]
      .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
      .forEach((m) => {
        const li = document.createElement("li");
        const left = document.createElement("span");
        left.innerHTML = `${escapeHtml(m.title)}${
          m.due_date ? ` <span class="muted">— due ${escapeHtml(m.due_date)}</span>` : ""
        }`;
        li.appendChild(left);

        const statusBtn = document.createElement("button");
        statusBtn.className = `status-pill ${statusClass(m.status)}`;
        statusBtn.textContent = statusLabel(m.status);
        statusBtn.addEventListener("click", async () => {
          await window.api.milestones.updateStatus(m.id, nextStatus(m.status));
          await loadProjects();
          renderProjects();
          refreshAchievements();
        });
        li.appendChild(statusBtn);

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.textContent = "✕";
        removeBtn.addEventListener("click", async () => {
          await window.api.milestones.remove(m.id);
          await loadProjects();
          renderProjects();
        });
        li.appendChild(removeBtn);

        list.appendChild(li);
      });
    card.appendChild(list);

    const miniForm = document.createElement("div");
    miniForm.className = "milestone-mini-form";
    miniForm.innerHTML = `
      <input type="text" placeholder="New milestone" class="ms-title" />
      <input type="date" class="ms-due" />
      <button class="btn ms-add">+ Add milestone</button>
    `;
    const titleInput = miniForm.querySelector(".ms-title");
    const dueInput = miniForm.querySelector(".ms-due");
    miniForm.querySelector(".ms-add").addEventListener("click", async () => {
      const title = titleInput.value.trim();
      if (!title) return;
      await window.api.milestones.add(p.id, title, dueInput.value, "");
      await loadProjects();
      renderProjects();
    });
    card.appendChild(miniForm);

    container.appendChild(card);
  });
}

// ================= Pomodoro page =================
function pomodoroPhaseSeconds(phase) {
  const d = state.pomodoro.durations;
  if (phase === "focus") return d.focus * 60;
  if (phase === "short_break") return d.short_break * 60;
  return d.long_break * 60;
}
function pomodoroPhaseLabel(phase) {
  return { focus: "Focus", short_break: "Short Break", long_break: "Long Break" }[phase];
}
function renderPomodoroTimer() {
  const mm = String(Math.floor(state.pomodoro.secondsLeft / 60)).padStart(2, "0");
  const ss = String(state.pomodoro.secondsLeft % 60).padStart(2, "0");
  els.pomodoroTime.textContent = `${mm}:${ss}`;
  els.pomodoroPhaseLabel.textContent = pomodoroPhaseLabel(state.pomodoro.phase);
  els.pomodoroStartBtn.textContent = state.pomodoro.running ? "Pause" : "Start";
}
function pomodoroTick() {
  state.pomodoro.secondsLeft -= 1;
  if (state.pomodoro.secondsLeft <= 0) {
    pomodoroPhaseComplete();
  } else {
    renderPomodoroTimer();
  }
}
async function pomodoroPhaseComplete() {
  clearInterval(state.pomodoro.timerId);
  state.pomodoro.running = false;

  if (state.pomodoro.phase === "focus") {
    const minutes = state.pomodoro.durations.focus;
    await window.api.pomodoro.log(els.pomodoroLabelInput.value.trim(), minutes);
    state.pomodoro.focusCount += 1;
    await loadPomodoroToday();
    renderPomodoroToday();
    refreshAchievements();
    window.api.notify.show("Focus session complete — Project Titan", "Nice work. Time for a break.");
    state.pomodoro.phase = state.pomodoro.focusCount % 4 === 0 ? "long_break" : "short_break";
  } else {
    window.api.notify.show("Break's over — Project Titan", "Ready for another focus session?");
    state.pomodoro.phase = "focus";
  }
  state.pomodoro.secondsLeft = pomodoroPhaseSeconds(state.pomodoro.phase);
  renderPomodoroTimer();
}
function renderPomodoroToday() {
  els.pomodoroTodayCount.textContent = state.pomodoroToday.length;
  els.pomodoroTodayMinutes.textContent = state.pomodoroToday.reduce(
    (a, s) => a + s.duration_minutes,
    0
  );

  els.pomodoroHistoryList.innerHTML = "";
  if (state.pomodoroToday.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No sessions logged yet today.";
    els.pomodoroHistoryList.appendChild(li);
    return;
  }
  state.pomodoroToday.forEach((s) => {
    const li = document.createElement("li");
    const time = (s.completed_at || "").slice(11, 16);
    li.innerHTML = `<span>${escapeHtml(time)} — ${s.duration_minutes} min${
      s.label ? ` <span class="muted">(${escapeHtml(s.label)})</span>` : ""
    }</span>`;
    els.pomodoroHistoryList.appendChild(li);
  });
}

// ================= Library page =================
function fileBaseName(p) {
  if (!p) return "";
  return p.split(/[\\/]/).pop();
}
function isImageFile(name) {
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(name || "");
}
function renderLibraryFilter() {
  const categories = ["All", "Lecture Note", "Website", "Research Paper", "Image/Diagram", "Project Idea"];
  els.libraryFilter.innerHTML = "";
  categories.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (state.libraryFilter === c ? " active" : "");
    btn.textContent = c;
    btn.addEventListener("click", () => {
      state.libraryFilter = c;
      renderLibraryFilter();
      renderLibraryGrid();
    });
    els.libraryFilter.appendChild(btn);
  });
}
function renderLibraryGrid() {
  const grid = els.libraryGrid;
  grid.innerHTML = "";
  const filtered =
    state.libraryFilter === "All"
      ? state.libraryItems
      : state.libraryItems.filter((n) => n.category === state.libraryFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="muted">Nothing here yet.</p>`;
    return;
  }

  filtered.forEach((n) => {
    const card = document.createElement("div");
    card.className = "card note-card";

    const badge = document.createElement("span");
    badge.className = "note-badge";
    badge.textContent = n.category;
    card.appendChild(badge);

    const title = document.createElement("h3");
    title.className = "note-title";
    title.textContent = n.title;
    card.appendChild(title);

    if (n.notes) {
      const p = document.createElement("p");
      p.className = "note-content";
      p.textContent = n.notes;
      card.appendChild(p);
    }

    if (n.url) {
      const link = document.createElement("a");
      link.href = "#";
      link.className = "note-link";
      link.textContent = n.url;
      link.addEventListener("click", (e) => {
        e.preventDefault();
        window.api.library.openLink(n.url);
      });
      card.appendChild(link);
    }

    if (n.file_path) {
      const fname = fileBaseName(n.file_path);
      if (isImageFile(fname)) {
        const img = document.createElement("img");
        img.className = "note-thumb";
        img.src = `file://${n.file_path}`;
        img.title = fname;
        img.addEventListener("click", () => window.api.library.openFile(n.file_path));
        card.appendChild(img);
      } else {
        const chip = document.createElement("button");
        chip.className = "attached-chip";
        chip.textContent = `📄 ${fname}`;
        chip.addEventListener("click", () => window.api.library.openFile(n.file_path));
        card.appendChild(chip);
      }
    }

    const removeBtn = document.createElement("button");
    removeBtn.className = "note-remove";
    removeBtn.textContent = "✕ Remove";
    removeBtn.addEventListener("click", async () => {
      await window.api.library.remove(n.id);
      await loadLibraryItems();
      renderLibraryGrid();
    });
    card.appendChild(removeBtn);

    grid.appendChild(card);
  });
}

async function loadExampleHabits() {
  const seed = [
    { name: "Wake up by 7:00 AM", goal: daysInMonth(), mod: 2, offset: 0 },
    { name: "Gym Session", goal: 15, mod: 2, offset: 1 },
    { name: "Read 30 minutes", goal: daysInMonth(), mod: 3, offset: 0 },
    { name: "Meditation 10 min", goal: 25, mod: 2, offset: 1 },
    { name: "Learn Code", goal: 15, mod: 3, offset: 2 },
  ];
  for (const s of seed) {
    const id = await window.api.habits.add(s.name, s.goal);
    for (let d = 1; d <= daysInMonth(); d++) {
      if ((d + s.offset) % s.mod === 0) await window.api.habits.toggleCheck(id, dateStrFor(d));
    }
  }
  await loadHabits();
  renderAll();
}

// ================= Notes page =================

async function loadNotes() {
  state.notes = await window.api.notes.list();
}

function noteSnippet(content) {
  const flat = (content || "").replace(/\s+/g, " ").trim();
  return flat.length > 60 ? flat.slice(0, 60) + "…" : flat;
}

function noteRelativeTime(isoString) {
  const then = new Date(isoString);
  const diffMs = Date.now() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString();
}

function filteredNotes() {
  const q = state.noteSearchQuery.trim().toLowerCase();
  if (!q) return state.notes;
  return state.notes.filter(
    (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  );
}

function renderNotesList() {
  if (!els.notesList) return;
  els.notesList.innerHTML = "";
  const notes = filteredNotes();

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.className = "notes-empty-list";
    empty.textContent = state.notes.length === 0 ? "No notes yet." : "No notes match your search.";
    els.notesList.appendChild(empty);
    return;
  }

  notes.forEach((note) => {
    const li = document.createElement("li");
    li.className = `note-list-item${note.id === state.activeNoteId ? " active" : ""}`;

    const title = document.createElement("div");
    title.className = "note-list-item-title";
    title.textContent = note.title.trim() || "Untitled note";
    li.appendChild(title);

    if (note.content.trim()) {
      const snippet = document.createElement("div");
      snippet.className = "note-list-item-snippet";
      snippet.textContent = noteSnippet(note.content);
      li.appendChild(snippet);
    }

    const time = document.createElement("div");
    time.className = "note-list-item-time";
    time.textContent = noteRelativeTime(note.updated_at);
    li.appendChild(time);

    li.addEventListener("click", () => selectNote(note.id));
    els.notesList.appendChild(li);
  });
}

function selectNote(id) {
  state.activeNoteId = id;
  const note = state.notes.find((n) => n.id === id);
  if (!note) return;

  els.noteEditorEmpty.classList.add("hidden");
  els.noteEditor.classList.remove("hidden");
  els.noteTitleInput.value = note.title;
  els.noteContentInput.value = note.content;
  els.noteLastEdited.textContent = `Edited ${noteRelativeTime(note.updated_at)}`;

  renderNotesList();
}

async function createNewNote() {
  const id = await window.api.notes.add("", "");
  await loadNotes();
  renderNotesList();
  selectNote(id);
  els.noteTitleInput.focus();
  refreshAchievements();
}

function scheduleNoteAutosave() {
  if (state.activeNoteId === null) return;
  clearTimeout(state.noteSaveDebounce);
  state.noteSaveDebounce = setTimeout(async () => {
    const title = els.noteTitleInput.value;
    const content = els.noteContentInput.value;
    await window.api.notes.update(state.activeNoteId, title, content);
    await loadNotes();
    els.noteLastEdited.textContent = "Edited just now";
    renderNotesList();
  }, 500);
}

async function deleteActiveNote() {
  if (state.activeNoteId === null) return;
  const note = state.notes.find((n) => n.id === state.activeNoteId);
  if (note && !confirm(`Delete "${note.title.trim() || "Untitled note"}"?`)) return;

  await window.api.notes.remove(state.activeNoteId);
  state.activeNoteId = null;
  await loadNotes();
  renderNotesList();
  els.noteEditor.classList.add("hidden");
  els.noteEditorEmpty.classList.remove("hidden");
}

// ================= Timer page =================

function pad2(n) {
  return String(n).padStart(2, "0");
}

function startClock() {
  const tick = () => {
    const now = new Date();
    els.clockTime.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
    els.clockDate.textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  tick();
  setInterval(tick, 1000);
}

function formatHMS(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

function setTimerMode(mode) {
  state.timer.mode = mode;
  els.countdownTabBtn.classList.toggle("active", mode === "countdown");
  els.stopwatchTabBtn.classList.toggle("active", mode === "stopwatch");
  els.countdownPanel.classList.toggle("hidden", mode !== "countdown");
  els.stopwatchPanel.classList.toggle("hidden", mode !== "stopwatch");
}

function renderCountdownDisplay() {
  const cd = state.timer.countdown;
  els.countdownDisplay.textContent = formatHMS(cd.remainingSeconds);
  els.countdownDisplay.classList.toggle("timer-done", !cd.running && cd.remainingSeconds === 0);
}

function startCountdown() {
  const cd = state.timer.countdown;
  if (cd.running) return;

  if (cd.remainingSeconds === 0) {
    const h = Number(els.countdownHoursInput.value) || 0;
    const m = Number(els.countdownMinutesInput.value) || 0;
    const s = Number(els.countdownSecondsInput.value) || 0;
    const total = h * 3600 + m * 60 + s;
    if (total <= 0) return;
    cd.totalSeconds = total;
    cd.remainingSeconds = total;
  }

  cd.running = true;
  els.countdownStartBtn.classList.add("hidden");
  els.countdownPauseBtn.classList.remove("hidden");

  cd.intervalId = setInterval(() => {
    cd.remainingSeconds -= 1;
    if (cd.remainingSeconds <= 0) {
      cd.remainingSeconds = 0;
      pauseCountdown();
      renderCountdownDisplay();
      window.api.notify.show("Timer done!", "Your countdown timer has finished.");
      showToast("⏰ Countdown finished!");
      return;
    }
    renderCountdownDisplay();
  }, 1000);
}

function pauseCountdown() {
  const cd = state.timer.countdown;
  cd.running = false;
  clearInterval(cd.intervalId);
  cd.intervalId = null;
  els.countdownStartBtn.classList.remove("hidden");
  els.countdownPauseBtn.classList.add("hidden");
}

function resetCountdown() {
  const cd = state.timer.countdown;
  pauseCountdown();
  cd.remainingSeconds = 0;
  cd.totalSeconds = 0;
  renderCountdownDisplay();
}

function formatStopwatch(ms) {
  const totalCentis = Math.floor(ms / 100);
  const s = Math.floor(totalCentis / 10);
  const tenths = totalCentis % 10;
  return `${formatHMS(s)}.${tenths}`;
}

function renderStopwatchDisplay() {
  const sw = state.timer.stopwatch;
  els.stopwatchDisplay.textContent = formatStopwatch(sw.elapsedMs);
}

function stopwatchCurrentElapsed() {
  const sw = state.timer.stopwatch;
  return sw.elapsedMs + (sw.running ? Date.now() - sw.startedAt : 0);
}

function startStopwatch() {
  const sw = state.timer.stopwatch;
  if (sw.running) return;
  sw.running = true;
  sw.startedAt = Date.now();
  els.stopwatchStartBtn.classList.add("hidden");
  els.stopwatchPauseBtn.classList.remove("hidden");

  sw.intervalId = setInterval(() => {
    els.stopwatchDisplay.textContent = formatStopwatch(stopwatchCurrentElapsed());
  }, 100);
}

function pauseStopwatch() {
  const sw = state.timer.stopwatch;
  if (!sw.running) return;
  sw.elapsedMs = stopwatchCurrentElapsed();
  sw.running = false;
  clearInterval(sw.intervalId);
  sw.intervalId = null;
  els.stopwatchStartBtn.classList.remove("hidden");
  els.stopwatchPauseBtn.classList.add("hidden");
  renderStopwatchDisplay();
}

function resetStopwatch() {
  const sw = state.timer.stopwatch;
  clearInterval(sw.intervalId);
  sw.running = false;
  sw.intervalId = null;
  sw.elapsedMs = 0;
  sw.startedAt = null;
  sw.laps = [];
  els.stopwatchStartBtn.classList.remove("hidden");
  els.stopwatchPauseBtn.classList.add("hidden");
  renderStopwatchDisplay();
  renderLaps();
}

function addLap() {
  const sw = state.timer.stopwatch;
  if (!sw.running) return;
  sw.laps.unshift(stopwatchCurrentElapsed());
  renderLaps();
}

function renderLaps() {
  const sw = state.timer.stopwatch;
  els.stopwatchLaps.innerHTML = "";
  sw.laps.forEach((ms, idx) => {
    const li = document.createElement("li");
    const lapNum = document.createElement("span");
    lapNum.textContent = `Lap ${sw.laps.length - idx}`;
    const lapTime = document.createElement("span");
    lapTime.textContent = formatStopwatch(ms);
    li.appendChild(lapNum);
    li.appendChild(lapTime);
    els.stopwatchLaps.appendChild(li);
  });
}

// ================= Goals & Achievements page =================

function setGaTab(tab) {
  state.gaTab = tab;
  els.goalsTabBtn.classList.toggle("active", tab === "goals");
  els.achievementsTabBtn.classList.toggle("active", tab === "achievements");
  els.goalsPanel.classList.toggle("hidden", tab !== "goals");
  els.achievementsPanel.classList.toggle("hidden", tab !== "achievements");
  if (tab === "achievements") renderAchievementsGrid();
}

// ---- Goals ----

async function loadGoals() {
  state.goals = await window.api.goals.list();
}

function goalFormatDue(dueDate) {
  if (!dueDate) return "";
  const days = Math.round((new Date(dueDate + "T00:00:00") - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

function renderGoalsList() {
  if (!els.goalsList) return;
  els.goalsList.innerHTML = "";

  if (state.goals.length === 0) {
    const empty = document.createElement("p");
    empty.className = "goals-empty";
    empty.textContent = "No goals yet — set one above to start tracking your progress.";
    els.goalsList.appendChild(empty);
    return;
  }

  state.goals.forEach((goal) => {
    els.goalsList.appendChild(buildGoalItem(goal));
  });
}

function buildGoalItem(goal) {
  const isDone = goal.current >= goal.target;
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));

  const item = document.createElement("div");
  item.className = `goal-item${isDone ? " goal-done" : ""}`;

  // Checkbox — only meaningful for simple (target === 1) goals; for numeric goals it
  // just jumps straight to target / back to 0.
  const check = document.createElement("button");
  check.className = `goal-check${isDone ? " checked" : ""}`;
  check.title = isDone ? "Mark as not done" : "Mark as done";
  check.textContent = isDone ? "✓" : "";
  check.addEventListener("click", async () => {
    await window.api.goals.updateProgress(goal.id, isDone ? 0 : goal.target);
    await loadGoals();
    renderGoalsList();
    refreshAchievements();
  });
  item.appendChild(check);

  const body = document.createElement("div");
  body.className = "goal-body";

  const titleRow = document.createElement("div");
  titleRow.className = "goal-title-row";
  const title = document.createElement("span");
  title.className = "goal-title";
  title.textContent = goal.title;
  titleRow.appendChild(title);
  if (goal.due_date) {
    const due = document.createElement("span");
    due.className = "goal-due";
    due.textContent = goalFormatDue(goal.due_date);
    titleRow.appendChild(due);
  }
  body.appendChild(titleRow);

  if (goal.target > 1) {
    const progressRow = document.createElement("div");
    progressRow.className = "goal-progress-row";

    const track = document.createElement("div");
    track.className = "goal-progress-track";
    const fill = document.createElement("div");
    fill.className = "goal-progress-fill";
    fill.style.width = `${pct}%`;
    track.appendChild(fill);
    progressRow.appendChild(track);

    const label = document.createElement("span");
    label.className = "goal-progress-label";
    label.textContent = `${goal.current}/${goal.target}${goal.unit ? " " + goal.unit : ""}`;
    progressRow.appendChild(label);

    body.appendChild(progressRow);
  }

  item.appendChild(body);

  if (goal.target > 1) {
    const stepper = document.createElement("div");
    stepper.className = "goal-stepper";

    const minusBtn = document.createElement("button");
    minusBtn.textContent = "−";
    minusBtn.addEventListener("click", async () => {
      await window.api.goals.updateProgress(goal.id, goal.current - 1);
      await loadGoals();
      renderGoalsList();
      refreshAchievements();
    });
    stepper.appendChild(minusBtn);

    const plusBtn = document.createElement("button");
    plusBtn.textContent = "+";
    plusBtn.addEventListener("click", async () => {
      await window.api.goals.updateProgress(goal.id, goal.current + 1);
      await loadGoals();
      renderGoalsList();
      refreshAchievements();
    });
    stepper.appendChild(plusBtn);

    item.appendChild(stepper);
  }

  const actions = document.createElement("div");
  actions.className = "goal-actions";

  const editBtn = document.createElement("button");
  editBtn.textContent = "✏";
  editBtn.title = "Edit";
  editBtn.addEventListener("click", () => goalStartEdit(goal));
  actions.appendChild(editBtn);

  const delBtn = document.createElement("button");
  delBtn.className = "goal-del-btn";
  delBtn.textContent = "✕";
  delBtn.title = "Delete";
  delBtn.addEventListener("click", async () => {
    if (!confirm(`Delete goal "${goal.title}"?`)) return;
    await window.api.goals.remove(goal.id);
    if (state.goalEditingId === goal.id) goalCancelEdit();
    await loadGoals();
    renderGoalsList();
  });
  actions.appendChild(delBtn);

  item.appendChild(actions);
  return item;
}

function goalStartEdit(goal) {
  state.goalEditingId = goal.id;
  els.goalTitleInput.value = goal.title;
  els.goalTargetInput.value = goal.target;
  els.goalUnitInput.value = goal.unit || "";
  els.goalDueDateInput.value = goal.due_date || "";
  els.goalFormTitle.textContent = "Edit goal";
  els.goalSaveBtn.textContent = "Save changes";
  els.goalCancelEditBtn.classList.remove("hidden");
  els.goalTitleInput.focus();
}

function goalCancelEdit() {
  state.goalEditingId = null;
  els.goalTitleInput.value = "";
  els.goalTargetInput.value = "1";
  els.goalUnitInput.value = "";
  els.goalDueDateInput.value = "";
  els.goalFormTitle.textContent = "New goal";
  els.goalSaveBtn.textContent = "+ Add goal";
  els.goalCancelEditBtn.classList.add("hidden");
}

// ---- Achievements ----

async function loadAchievementData() {
  state.achievementStats = await window.api.achievements.getStats();
  const unlockedRows = await window.api.achievements.listUnlocked();
  state.unlockedAchievementIds = unlockedRows.map((r) => r.achievement_id);
}

// Re-checks live stats against the achievement catalog and auto-unlocks any newly
// earned badges. Call this after any action that could move the underlying numbers
// (habit checks, milestone/deadline completion, pomodoro sessions, notes, library items).
async function refreshAchievements() {
  await loadAchievementData();

  const newlyUnlocked = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (state.unlockedAchievementIds.includes(def.id)) continue;
    const value = state.achievementStats[def.statKey] || 0;
    if (value >= def.threshold) {
      await window.api.achievements.unlock(def.id);
      state.unlockedAchievementIds.push(def.id);
      newlyUnlocked.push(def);
    }
  }

  if (newlyUnlocked.length === 1) {
    showToast(`🏆 Achievement unlocked: ${newlyUnlocked[0].title}`);
  } else if (newlyUnlocked.length > 1) {
    showToast(`🏆 ${newlyUnlocked.length} achievements unlocked!`);
  }

  if (state.page === "goals" && state.gaTab === "achievements") {
    renderAchievementsGrid();
  }
}

function renderAchievementsGrid() {
  if (!els.achievementsGrid || !state.achievementStats) return;

  const unlockedCount = ACHIEVEMENT_DEFS.filter((d) =>
    state.unlockedAchievementIds.includes(d.id)
  ).length;
  els.achievementsSummary.innerHTML = "";
  const countEl = document.createElement("span");
  countEl.className = "count";
  countEl.textContent = `${unlockedCount}/${ACHIEVEMENT_DEFS.length}`;
  const labelEl = document.createElement("span");
  labelEl.className = "label";
  labelEl.textContent = "achievements unlocked";
  els.achievementsSummary.appendChild(countEl);
  els.achievementsSummary.appendChild(labelEl);

  els.achievementsGrid.innerHTML = "";
  ACHIEVEMENT_DEFS.forEach((def) => {
    const unlocked = state.unlockedAchievementIds.includes(def.id);
    const value = state.achievementStats[def.statKey] || 0;
    const pct = Math.min(100, Math.round((value / def.threshold) * 100));

    const card = document.createElement("div");
    card.className = `achievement-card tier-${def.tier}${unlocked ? " unlocked" : " locked"}`;

    const icon = document.createElement("div");
    icon.className = "achievement-icon";
    icon.textContent = unlocked ? def.icon : "🔒";
    card.appendChild(icon);

    const body = document.createElement("div");
    body.className = "achievement-body";

    const titleRow = document.createElement("div");
    titleRow.className = "achievement-title-row";
    const title = document.createElement("span");
    title.className = "achievement-title";
    title.textContent = def.title;
    titleRow.appendChild(title);
    const tierBadge = document.createElement("span");
    tierBadge.className = `achievement-tier-badge ${def.tier}`;
    tierBadge.textContent = def.tier;
    titleRow.appendChild(tierBadge);
    body.appendChild(titleRow);

    const desc = document.createElement("div");
    desc.className = "achievement-desc";
    desc.textContent = def.desc;
    body.appendChild(desc);

    const track = document.createElement("div");
    track.className = "achievement-progress-track";
    const fill = document.createElement("div");
    fill.className = "achievement-progress-fill";
    fill.style.width = `${pct}%`;
    track.appendChild(fill);
    body.appendChild(track);

    const status = document.createElement("div");
    status.className = `achievement-status${unlocked ? " unlocked-text" : ""}`;
    status.textContent = unlocked
      ? "Unlocked"
      : `${Math.min(value, def.threshold)}/${def.threshold}`;
    body.appendChild(status);

    card.appendChild(body);
    els.achievementsGrid.appendChild(card);
  });
}

// ---------- events ----------
function attachEvents() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => setPage(btn.dataset.page));
  });

  els.darkToggleBtn.addEventListener("click", async () => {
    state.darkMode = !state.darkMode;
    applyDarkMode();
    await window.api.settings.set("darkMode", state.darkMode ? "1" : "0");
    renderDynamicsChart(computeStats().monthlyDynamics);
  });

  els.quoteToggleBtn.addEventListener("click", () => {
    state.quotePanelOpen = !state.quotePanelOpen;
    els.quotePanel.classList.toggle("hidden", !state.quotePanelOpen);
  });

  els.monthSelect.addEventListener("change", async (e) => {
    state.monthIndex = Number(e.target.value);
    await Promise.all([loadHabits(), loadDeadlines()]);
    renderAll();
  });

  els.addQuoteBtn.addEventListener("click", async () => {
    const text = els.quoteTextInput.value.trim();
    if (!text) return;
    const author = els.quoteAuthorInput.value.trim() || "Unknown";
    await window.api.quotes.add(text, author);
    els.quoteTextInput.value = "";
    els.quoteAuthorInput.value = "";
    await loadQuotes();
    renderQuoteBanner();
    renderQuoteList();
  });

  els.gridViewBtn.addEventListener("click", () => setView("grid"));
  els.calendarViewBtn.addEventListener("click", () => setView("calendar"));

  els.addDeadlineBtn.addEventListener("click", async () => {
    const title = els.deadlineTitleInput.value.trim();
    const due = els.deadlineDateInput.value;
    if (!title || !due) return;
    await window.api.deadlines.add(title, due, els.deadlineTypeInput.value, "");
    els.deadlineTitleInput.value = "";
    els.deadlineDateInput.value = "";
    els.deadlineTypeInput.value = "";
    await loadDeadlines();
    renderAll();
  });

  els.exportPdfBtn.addEventListener("click", async () => {
    const payload = buildExportPayload(computeStats());
    const result = await window.api.export.pdf(payload);
    if (result.canceled) return;
    showToast(result.error ? `Export failed: ${result.error}` : `Exported PDF to ${result.filePath}`);
  });

  els.exportExcelBtn.addEventListener("click", async () => {
    const payload = buildExportPayload(computeStats());
    const result = await window.api.export.excel(payload);
    if (result.canceled) return;
    showToast(
      result.error ? `Export failed: ${result.error}` : `Exported Excel file to ${result.filePath}`
    );
  });

  els.addProjectBtn.addEventListener("click", async () => {
    const name = els.projectNameInput.value.trim();
    if (!name) return;
    const desc = els.projectDescInput.value.trim();
    await window.api.projects.add(name, desc);
    els.projectNameInput.value = "";
    els.projectDescInput.value = "";
    await loadProjects();
    renderProjects();
  });

  els.pomodoroStartBtn.addEventListener("click", () => {
    if (state.pomodoro.running) {
      clearInterval(state.pomodoro.timerId);
      state.pomodoro.running = false;
    } else {
      state.pomodoro.running = true;
      state.pomodoro.timerId = setInterval(pomodoroTick, 1000);
    }
    renderPomodoroTimer();
  });

  els.pomodoroResetBtn.addEventListener("click", () => {
    clearInterval(state.pomodoro.timerId);
    state.pomodoro.running = false;
    state.pomodoro.phase = "focus";
    state.pomodoro.secondsLeft = pomodoroPhaseSeconds("focus");
    renderPomodoroTimer();
  });

  [
    ["focusMinInput", "focus"],
    ["shortBreakMinInput", "short_break"],
    ["longBreakMinInput", "long_break"],
  ].forEach(([elId, key]) => {
    els[elId].addEventListener("change", async (e) => {
      const val = Math.max(1, Number(e.target.value) || 1);
      state.pomodoro.durations[key] = val;
      await window.api.settings.set(`pomodoro_${key}`, String(val));
      if (!state.pomodoro.running && state.pomodoro.phase === key) {
        state.pomodoro.secondsLeft = val * 60;
        renderPomodoroTimer();
      }
    });
  });

  els.attachFileBtn.addEventListener("click", async () => {
    const filePath = await window.api.library.pickFile();
    if (!filePath) return;
    state.pendingAttachmentPath = filePath;
    els.attachedFileChip.textContent = `📎 ${fileBaseName(filePath)}`;
    els.attachedFileChip.classList.remove("hidden");
  });

  els.addLibraryItemBtn.addEventListener("click", async () => {
    const title = els.libraryTitleInput.value.trim();
    if (!title) return;
    const category = els.libraryCategoryInput.value;
    const url = els.libraryUrlInput.value.trim();
    const notes = els.libraryNotesInput.value.trim();
    const filePath = state.pendingAttachmentPath || "";

    await window.api.library.add(category, title, url, filePath, notes);

    els.libraryTitleInput.value = "";
    els.libraryUrlInput.value = "";
    els.libraryNotesInput.value = "";
    state.pendingAttachmentPath = null;
    els.attachedFileChip.classList.add("hidden");
    els.attachedFileChip.textContent = "";

    await loadLibraryItems();
    renderLibraryGrid();
    refreshAchievements();
  });

  window.addEventListener("resize", () => {
    if (state.page === "habits") renderDynamicsChart(computeStats().monthlyDynamics);
  });

  // ===== Deadlines page events =====
  els.dlSaveBtn.addEventListener("click", async () => {
    const title = els.dlTitleInput.value.trim();
    const due = els.dlDateInput.value;
    if (!title || !due) {
      showToast("Please enter a title and due date.");
      return;
    }
    const type = els.dlTypeInput.value;
    const priority = els.dlPriorityInput.value;
    const notes = els.dlNotesInput.value.trim();

    if (state.dlEditingId !== null) {
      await window.api.deadlines.update(state.dlEditingId, title, due, type, notes, priority);
      dlCancelEdit();
    } else {
      await window.api.deadlines.add(title, due, type, notes, priority);
      els.dlTitleInput.value = "";
      els.dlDateInput.value = "";
      els.dlTypeInput.value = "";
      els.dlPriorityInput.value = "medium";
      els.dlNotesInput.value = "";
    }
    await loadAllDeadlines();
    await loadDeadlines();
    renderDeadlinesPage();
    renderAll();
  });

  els.dlCancelEditBtn.addEventListener("click", () => {
    dlCancelEdit();
  });

  // Allow Enter key to submit form from title input
  els.dlTitleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.dlSaveBtn.click();
  });

  // ===== Notes page events =====
  els.newNoteBtn.addEventListener("click", () => createNewNote());

  els.noteSearchInput.addEventListener("input", () => {
    state.noteSearchQuery = els.noteSearchInput.value;
    renderNotesList();
  });

  els.noteTitleInput.addEventListener("input", scheduleNoteAutosave);
  els.noteContentInput.addEventListener("input", scheduleNoteAutosave);

  els.deleteNoteBtn.addEventListener("click", () => deleteActiveNote());

  // ===== Timer page events =====
  els.countdownTabBtn.addEventListener("click", () => setTimerMode("countdown"));
  els.stopwatchTabBtn.addEventListener("click", () => setTimerMode("stopwatch"));

  els.countdownStartBtn.addEventListener("click", startCountdown);
  els.countdownPauseBtn.addEventListener("click", pauseCountdown);
  els.countdownResetBtn.addEventListener("click", resetCountdown);

  els.stopwatchStartBtn.addEventListener("click", startStopwatch);
  els.stopwatchPauseBtn.addEventListener("click", pauseStopwatch);
  els.stopwatchResetBtn.addEventListener("click", resetStopwatch);
  els.stopwatchLapBtn.addEventListener("click", addLap);

  // ===== Goals & Achievements page events =====
  els.goalsTabBtn.addEventListener("click", () => setGaTab("goals"));
  els.achievementsTabBtn.addEventListener("click", () => setGaTab("achievements"));

  els.goalSaveBtn.addEventListener("click", async () => {
    const title = els.goalTitleInput.value.trim();
    const target = Number(els.goalTargetInput.value) || 1;
    const unit = els.goalUnitInput.value.trim();
    const dueDate = els.goalDueDateInput.value;
    if (!title) {
      showToast("Please enter a goal title.");
      return;
    }

    if (state.goalEditingId !== null) {
      await window.api.goals.update(state.goalEditingId, title, target, unit, dueDate);
      goalCancelEdit();
    } else {
      await window.api.goals.add(title, target, unit, dueDate);
      els.goalTitleInput.value = "";
      els.goalTargetInput.value = "1";
      els.goalUnitInput.value = "";
      els.goalDueDateInput.value = "";
    }
    await loadGoals();
    renderGoalsList();
  });

  els.goalCancelEditBtn.addEventListener("click", () => goalCancelEdit());

  els.goalTitleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.goalSaveBtn.click();
  });
}

function setPage(page) {
  state.page = page;
  document.querySelectorAll(".page").forEach((el) => el.classList.add("hidden"));
  document.getElementById(`page-${page}`).classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });
  if (page === "habits") renderDynamicsChart(computeStats().monthlyDynamics);
  if (page === "goals") {
    renderGoalsList();
    if (state.gaTab === "achievements") renderAchievementsGrid();
  }
}

function setView(view) {
  state.view = view;
  els.gridViewEl.classList.toggle("hidden", view !== "grid");
  els.calendarViewEl.classList.toggle("hidden", view !== "calendar");
  els.gridViewBtn.classList.toggle("active", view === "grid");
  els.calendarViewBtn.classList.toggle("active", view === "calendar");
}

function buildExportPayload(stats) {
  return {
    year: state.year,
    month: state.monthIndex + 1,
    monthName: MONTH_NAMES[state.monthIndex],
    days: dayNumbers(),
    perHabit: stats.perHabit,
    dailyTotals: stats.dailyTotals,
    weeklyBreakdown: stats.weeklyBreakdown,
    dashboard: stats.dashboard,
  };
}
