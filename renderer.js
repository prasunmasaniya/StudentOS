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
};

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
    loadProjects(),
    loadPomodoroToday(),
    loadLibraryItems(),
    loadPomodoroSettings(),
  ]);

  attachEvents();
  renderAll();
  renderProjects();
  renderPomodoroTimer();
  renderPomodoroToday();
  renderLibraryFilter();
  renderLibraryGrid();
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
  });

  window.addEventListener("resize", () => {
    if (state.page === "habits") renderDynamicsChart(computeStats().monthlyDynamics);
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
