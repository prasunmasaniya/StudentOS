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
    add: (title, dueDate, type, notes) =>
      ipcRenderer.invoke("deadlines:add", title, dueDate, type, notes),
    remove: (id) => ipcRenderer.invoke("deadlines:remove", id),
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
