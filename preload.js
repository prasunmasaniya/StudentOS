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
  settings: {
    get: (key) => ipcRenderer.invoke("settings:get", key),
    set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
  },
});
