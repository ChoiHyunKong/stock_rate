import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  aiEvaluate: async (payload) => ipcRenderer.invoke('ai-evaluate', payload)
});
