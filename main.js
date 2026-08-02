const { app, BrowserWindow, ipcMain, dialog, Notification } = require("electron");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const db = require("./db");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#f9fafb",
    title: "Project Titan",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  db.init();
  createWindow();

  checkDeadlineReminders();
  setInterval(checkDeadlineReminders, 60 * 60 * 1000); // re-check hourly while the app is open

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  db.close();
});

// ---- IPC: habits ----
ipcMain.handle("habits:list", (_e, year, month) => db.listHabits(year, month));
ipcMain.handle("habits:add", (_e, name, goal) => db.addHabit(name, goal));
ipcMain.handle("habits:remove", (_e, habitId) => db.removeHabit(habitId));
ipcMain.handle("habits:updateName", (_e, habitId, name) => db.updateHabitName(habitId, name));
ipcMain.handle("habits:updateGoal", (_e, habitId, goal) => db.updateHabitGoal(habitId, goal));
ipcMain.handle("habits:toggleCheck", (_e, habitId, dateStr) => db.toggleCheck(habitId, dateStr));

// ---- IPC: quotes ----
ipcMain.handle("quotes:list", () => db.listQuotes());
ipcMain.handle("quotes:add", (_e, text, author) => db.addQuote(text, author));
ipcMain.handle("quotes:remove", (_e, quoteId) => db.removeQuote(quoteId));

// ---- IPC: deadlines ----
ipcMain.handle("deadlines:list", () => db.listDeadlines());
ipcMain.handle("deadlines:listForMonth", (_e, year, month) => db.listDeadlinesForMonth(year, month));
ipcMain.handle("deadlines:add", (_e, title, dueDate, type, notes) =>
  db.addDeadline(title, dueDate, type, notes)
);
ipcMain.handle("deadlines:remove", (_e, id) => db.removeDeadline(id));

// ---- IPC: settings ----
ipcMain.handle("settings:get", (_e, key) => db.getSetting(key));
ipcMain.handle("settings:set", (_e, key, value) => db.setSetting(key, value));

// ---- IPC: export ----
ipcMain.handle("export:pdf", (_e, data) => exportPdf(data));
ipcMain.handle("export:excel", (_e, data) => exportExcel(data));

// ---------- deadline reminders ----------
// Notifications only fire while the app is open (a plain desktop app has no
// background service) - this covers anything due tomorrow or sooner,
// including deadlines that already passed while the app was closed.
function checkDeadlineReminders() {
  const dueSoon = db.getDeadlinesDueSoon();
  dueSoon.forEach((dl) => {
    if (Notification.isSupported()) {
      new Notification({
        title: "Upcoming deadline — Project Titan",
        body: `${dl.title} is due ${dl.due_date}${dl.type ? ` (${dl.type})` : ""}`,
      }).show();
    }
    db.markDeadlineNotified(dl.id);
  });
}

// ---------- export ----------
function escapeHtmlMain(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReportHtml(data) {
  const dayHeaders = data.days.map((d) => `<th>${d}</th>`).join("");
  const habitRows = data.perHabit
    .map((h, i) => {
      const dayCells = data.days
        .map((d) => `<td class="c">${h.checks[d] ? "✓" : ""}</td>`)
        .join("");
      return `<tr>
        <td>${i + 1}</td>
        <td class="name">${escapeHtmlMain(h.name)}</td>
        <td class="c">${h.goal}</td>
        ${dayCells}
        <td class="c">${h.done}</td>
        <td class="c">${h.left}</td>
        <td class="c">${h.pct}%</td>
        <td class="c">${h.currentStreak}</td>
        <td class="c">${h.bestStreak}</td>
      </tr>`;
    })
    .join("");
  const totalCells = data.dailyTotals.map((t) => `<td class="c">${t}</td>`).join("");
  const weekRows = data.weeklyBreakdown
    .map(
      (w) =>
        `<tr><td>Week ${w.weekNum}</td><td class="c">${w.completed}/${w.possible}</td><td class="c">${w.left}</td><td class="c">${w.rate}%</td></tr>`
    )
    .join("");
  const d = data.dashboard;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; margin: 20px 0 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 10px; }
  th, td { border: 1px solid #e5e7eb; padding: 3px 4px; text-align: left; }
  td.c, th.c { text-align: center; }
  .name { min-width: 110px; }
  .stats-grid { display: flex; flex-wrap: wrap; gap: 16px; }
  .stat { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; min-width: 120px; }
  .stat b { display: block; font-size: 16px; }
</style></head>
<body>
  <h1>Project Titan — ${escapeHtmlMain(data.monthName)} ${data.year}</h1>

  <h2>Summary</h2>
  <div class="stats-grid">
    <div class="stat"><b>${d.overallPct}%</b>Monthly Completion</div>
    <div class="stat"><b>${d.habitsOnTrack}/${d.totalHabits}</b>Habits On Track</div>
    <div class="stat"><b>${d.totalCheckIns}</b>Total Check-ins</div>
    <div class="stat"><b>${d.longestCurrent ? d.longestCurrent.value + "d" : "—"}</b>Longest Active Streak</div>
    <div class="stat"><b>${d.longestBest ? d.longestBest.value + "d" : "—"}</b>Longest Streak Ever</div>
    <div class="stat"><b>${d.bestDay ? "Day " + d.bestDay.day : "—"}</b>Best Day</div>
  </div>

  <h2>Habit Grid</h2>
  <table>
    <thead><tr><th>#</th><th>Habit</th><th class="c">Goal</th>${dayHeaders}<th class="c">Done</th><th class="c">Left</th><th class="c">%</th><th class="c">Streak</th><th class="c">Best</th></tr></thead>
    <tbody>
      ${habitRows}
      <tr><td colspan="2"><b>Daily Total</b></td><td></td>${totalCells}<td colspan="5"></td></tr>
    </tbody>
  </table>

  <h2>Weekly Breakdown</h2>
  <table>
    <thead><tr><th>Week</th><th class="c">Completed</th><th class="c">Left</th><th class="c">Success</th></tr></thead>
    <tbody>${weekRows}</tbody>
  </table>
</body></html>`;
}

async function exportPdf(data) {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: "Export as PDF",
    defaultPath: `project-titan-${data.monthName}-${data.year}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (canceled || !filePath) return { canceled: true };

  let reportWin;
  try {
    const html = buildReportHtml(data);
    reportWin = new BrowserWindow({ show: false });
    await reportWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    const pdfBuffer = await reportWin.webContents.printToPDF({
      landscape: true,
      printBackground: true,
      pageSize: "A4",
    });
    fs.writeFileSync(filePath, pdfBuffer);
    return { canceled: false, filePath };
  } catch (err) {
    return { canceled: false, error: err.message };
  } finally {
    if (reportWin) reportWin.close();
  }
}

async function exportExcel(data) {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: "Export as Excel",
    defaultPath: `project-titan-${data.monthName}-${data.year}.xlsx`,
    filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
  });
  if (canceled || !filePath) return { canceled: true };

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Project Titan";

    const sheet = workbook.addWorksheet(`${data.monthName} ${data.year}`.slice(0, 31));
    sheet.getColumn(2).width = 24;
    const headerRow = [
      "#",
      "Habit",
      "Goal",
      ...data.days,
      "Done",
      "Left",
      "Progress %",
      "Streak",
      "Best",
    ];
    sheet.addRow(headerRow);
    sheet.getRow(1).font = { bold: true };

    data.perHabit.forEach((h, idx) => {
      const row = [idx + 1, h.name, h.goal];
      data.days.forEach((d) => row.push(h.checks[d] ? "✓" : ""));
      row.push(h.done, h.left, h.pct, h.currentStreak, h.bestStreak);
      sheet.addRow(row);
    });
    sheet.addRow([]);
    sheet.addRow(["", "Daily Total", "", ...data.dailyTotals]);

    const statsSheet = workbook.addWorksheet("Summary");
    statsSheet.getColumn(1).width = 24;
    statsSheet.addRow(["Metric", "Value"]);
    statsSheet.getRow(1).font = { bold: true };
    const d = data.dashboard;
    statsSheet.addRow(["Monthly Completion", `${d.overallPct}%`]);
    statsSheet.addRow(["Habits On Track", `${d.habitsOnTrack}/${d.totalHabits}`]);
    statsSheet.addRow(["Total Check-ins", d.totalCheckIns]);
    statsSheet.addRow([
      "Longest Active Streak",
      d.longestCurrent ? `${d.longestCurrent.value}d (${d.longestCurrent.name})` : "-",
    ]);
    statsSheet.addRow([
      "Longest Streak Ever",
      d.longestBest ? `${d.longestBest.value}d (${d.longestBest.name})` : "-",
    ]);
    statsSheet.addRow([
      "Best Day",
      d.bestDay ? `Day ${d.bestDay.day} (${d.bestDay.total} done)` : "-",
    ]);

    const weekSheet = workbook.addWorksheet("Weekly Breakdown");
    weekSheet.addRow(["Week", "Completed", "Possible", "Left", "Success Rate %"]);
    weekSheet.getRow(1).font = { bold: true };
    data.weeklyBreakdown.forEach((w) => {
      weekSheet.addRow([`Week ${w.weekNum}`, w.completed, w.possible, w.left, w.rate]);
    });

    await workbook.xlsx.writeFile(filePath);
    return { canceled: false, filePath };
  } catch (err) {
    return { canceled: false, error: err.message };
  }
}
