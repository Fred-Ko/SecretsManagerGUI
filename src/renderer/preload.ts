import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

contextBridge.exposeInMainWorld('electron', {
  getAwsCredentials: () => ipcRenderer.invoke('get-aws-credentials'),
  onNavigateBack: (callback: () => void) => {
    const wrappedCallback = () => callback();
    ipcRenderer.on('navigate-back', wrappedCallback);
    return () => {
      ipcRenderer.removeListener('navigate-back', wrappedCallback);
    };
  },
});