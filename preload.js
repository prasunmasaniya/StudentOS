const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  habits: {
    list: (year, month) => ipcRenderer.invoke("habits:list", year, month),
    add: (name, goal) => ipcRenderer.invoke("habits:add", name, goal),
    remove: (habitId) => ipcRenderer.invoke("habits:remove", habitId),
    updateName: (habitId, name) => ipcRenderer.invoke("habits:updateName", habitId, name),
    updateGoal: (habitId, goal) => ipcRenderer.invoke("habits:updateGoal", habitId, goal),
    toggleCheck: (habitId, dateStr) => ipcRenderer.invoke("habits:toggleCheck", habitId, dateStr),
  },
  quotes: {
    list: () => ipcRenderer.invoke("quotes:list"),
    add: (text, author) => ipcRenderer.invoke("quotes:add", text, author),
    remove: (quoteId) => ipcRenderer.invoke("quotes:remove", quoteId),
  },
  deadlines: {
    list: () => ipcRenderer.invoke("deadlines:list"),
    listForMonth: (year, month) => ipcRenderer.invoke("deadlines:listForMonth", year, month),
    add: (title, dueDate, type, notes, priority) =>
      ipcRenderer.invoke("deadlines:add", title, dueDate, type, notes, priority),
    update: (id, title, dueDate, type, notes, priority) =>
      ipcRenderer.invoke("deadlines:update", id, title, dueDate, type, notes, priority),
    toggleDone: (id) => ipcRenderer.invoke("deadlines:toggleDone", id),
    remove: (id) => ipcRenderer.invoke("deadlines:remove", id),
  },
  projects: {
    list: () => ipcRenderer.invoke("projects:list"),
    add: (name, description) => ipcRenderer.invoke("projects:add", name, description),
    remove: (id) => ipcRenderer.invoke("projects:remove", id),
  },
  milestones: {
    add: (projectId, title, dueDate, notes) =>
      ipcRenderer.invoke("milestones:add", projectId, title, dueDate, notes),
    updateStatus: (id, status) => ipcRenderer.invoke("milestones:updateStatus", id, status),
    remove: (id) => ipcRenderer.invoke("milestones:remove", id),
  },
  pomodoro: {
    log: (label, durationMinutes) => ipcRenderer.invoke("pomodoro:log", label, durationMinutes),
    listToday: () => ipcRenderer.invoke("pomodoro:listToday"),
  },
  library: {
    list: () => ipcRenderer.invoke("library:list"),
    add: (category, title, url, filePath, notes) =>
      ipcRenderer.invoke("library:add", category, title, url, filePath, notes),
    remove: (id) => ipcRenderer.invoke("library:remove", id),
    pickFile: () => ipcRenderer.invoke("library:pickFile"),
    openFile: (filePath) => ipcRenderer.invoke("library:openFile", filePath),
    openLink: (url) => ipcRenderer.invoke("library:openLink", url),
  },
  notes: {
    list: () => ipcRenderer.invoke("notes:list"),
    add: (title, content) => ipcRenderer.invoke("notes:add", title, content),
    update: (id, title, content) => ipcRenderer.invoke("notes:update", id, title, content),
    remove: (id) => ipcRenderer.invoke("notes:remove", id),
  },
  goals: {
    list: () => ipcRenderer.invoke("goals:list"),
    add: (title, target, unit, dueDate) =>
      ipcRenderer.invoke("goals:add", title, target, unit, dueDate),
    update: (id, title, target, unit, dueDate) =>
      ipcRenderer.invoke("goals:update", id, title, target, unit, dueDate),
    updateProgress: (id, current) => ipcRenderer.invoke("goals:updateProgress", id, current),
    remove: (id) => ipcRenderer.invoke("goals:remove", id),
  },
  achievements: {
    getStats: () => ipcRenderer.invoke("achievements:getStats"),
    listUnlocked: () => ipcRenderer.invoke("achievements:listUnlocked"),
    unlock: (achievementId) => ipcRenderer.invoke("achievements:unlock", achievementId),
  },
  notify: {
    show: (title, body) => ipcRenderer.invoke("notify:show", title, body),
  },
  export: {
    pdf: (data) => ipcRenderer.invoke("export:pdf", data),
    excel: (data) => ipcRenderer.invoke("export:excel", data),
  },
  settings: {
    get: (key) => ipcRenderer.invoke("settings:get", key),
    set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
  },
});
