const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const state = {
  year: new Date().getFullYear(),
  monthIndex: new Date().getMonth(),
  habits: [],
  quotes: [],
  darkMode: false,
  quotePanelOpen: false,
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheEls();
  populateMonthSelect();

  const savedDark = await window.api.settings.get("darkMode");
  state.darkMode = savedDark === "1";
  applyDarkMode();

  await Promise.all([loadHabits(), loadQuotes()]);

  attachEvents();
  renderAll();
}

function cacheEls() {
  els.app = document.getElementById("app");
  els.quoteBanner = document.getElementById("quoteBanner");
  els.darkToggleBtn = document.getElementById("darkToggleBtn");
  els.quoteToggleBtn = document.getElementById("quoteToggleBtn");
  els.monthSelect = document.getElementById("monthSelect");
  els.quotePanel = document.getElementById("quotePanel");
  els.quoteTextInput = document.getElementById("quoteTextInput");
  els.quoteAuthorInput = document.getElementById("quoteAuthorInput");
  els.addQuoteBtn = document.getElementById("addQuoteBtn");
  els.quoteList = document.getElementById("quoteList");
  els.topPerformanceList = document.getElementById("topPerformanceList");
  els.dynamicsChart = document.getElementById("dynamicsChart");
  els.tableHeadRow = document.getElementById("tableHeadRow");
  els.tableBody = document.getElementById("tableBody");
  els.tableFootRow = document.getElementById("tableFootRow");
  els.weeklyGrid = document.getElementById("weeklyGrid");
}

// ---------- date helpers ----------
function monthKey() {
  return `${state.year}-${String(state.monthIndex + 1).padStart(2, "0")}`;
}
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
  state.habits = await window.api.habits.list(monthKey());
}
async function loadQuotes() {
  state.quotes = await window.api.quotes.list();
}

function applyDarkMode() {
  els.app.classList.toggle("dark", state.darkMode);
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

  return { perHabit, dailyTotals, monthlyDynamics, weeklyBreakdown, topPerformance };
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
  renderTopPerformance(stats.topPerformance);
  renderDynamicsChart(stats.monthlyDynamics);
  renderHabitTable(stats.perHabit, stats.dailyTotals);
  renderWeeklyBreakdown(stats.weeklyBreakdown);
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
  const totalCols = 8 + days.length; // #, name, goal, days..., done, left, progress, %, remove

  els.tableHeadRow.innerHTML = `
    <th>#</th><th class="name-cell">Habit Name</th><th>Goal</th>
    ${days.map((d) => `<th>${d}</th>`).join("")}
    <th>Done</th><th>Left</th><th>Progress</th><th>%</th><th></th>
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
          await window.api.habits.toggleCheck(h.id, d);
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
    await window.api.habits.add(monthKey(), "", daysInMonth());
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

async function loadExampleHabits() {
  const seed = [
    { name: "Wake up by 7:00 AM", goal: daysInMonth(), mod: 2, offset: 0 },
    { name: "Gym Session", goal: 15, mod: 2, offset: 1 },
    { name: "Read 30 minutes", goal: daysInMonth(), mod: 3, offset: 0 },
    { name: "Meditation 10 min", goal: 25, mod: 2, offset: 1 },
    { name: "Learn Code", goal: 15, mod: 3, offset: 2 },
  ];
  for (const s of seed) {
    const id = await window.api.habits.add(monthKey(), s.name, s.goal);
    for (let d = 1; d <= daysInMonth(); d++) {
      if ((d + s.offset) % s.mod === 0) await window.api.habits.toggleCheck(id, d);
    }
  }
  await loadHabits();
  renderAll();
}

// ---------- events ----------
function attachEvents() {
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
    await loadHabits();
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

  window.addEventListener("resize", () => {
    renderDynamicsChart(computeStats().monthlyDynamics);
  });
}
