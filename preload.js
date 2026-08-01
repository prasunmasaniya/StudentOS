const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  habits: {
    list: (monthKey) => ipcRenderer.invoke("habits:list", monthKey),
    add: (monthKey, name, goal) => ipcRenderer.invoke("habits:add", monthKey, name, goal),
    remove: (habitId) => ipcRenderer.invoke("habits:remove", habitId),
    updateName: (habitId, name) => ipcRenderer.invoke("habits:updateName", habitId, name),
    updateGoal: (habitId, goal) => ipcRenderer.invoke("habits:updateGoal", habitId, goal),
    toggleCheck: (habitId, day) => ipcRenderer.invoke("habits:toggleCheck", habitId, day),
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
