const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) =>
      ipcRenderer.on(channel, (event, ...args) => func(...args)),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  },
  captureScreen: () => {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('capture-screen');
      ipcRenderer.once('capture-screen-response', (event, response) => {
        if (response.success) {
          resolve(response.screenshot);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  },
});
