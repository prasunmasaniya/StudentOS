const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
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

// ---- IPC: settings ----
ipcMain.handle("settings:get", (_e, key) => db.getSetting(key));
ipcMain.handle("settings:set", (_e, key, value) => db.setSetting(key, value));
