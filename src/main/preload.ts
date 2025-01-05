import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

contextBridge.exposeInMainWorld('electron', {
  getAwsCredentials: () => ipcRenderer.invoke('get-aws-credentials'),
  saveAwsCredentials: (credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    endpoint?: string;
  }) => ipcRenderer.invoke('save-aws-credentials', credentials),
});
