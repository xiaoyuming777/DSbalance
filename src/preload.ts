// 预加载脚本：通过 contextBridge 暴露安全的最小 API 给渲染进程
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('dsbalance', {
  // 设置页
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (partial: unknown) => ipcRenderer.invoke('config:save', partial),
  setApiKey: (key: string) => ipcRenderer.invoke('config:setApiKey', key),
  testBalance: (apiKey: string) => ipcRenderer.invoke('balance:test', apiKey),

  // 余额详情弹窗
  getBalance: () => ipcRenderer.invoke('balance:get'),
  refreshBalance: () => ipcRenderer.invoke('balance:refresh'),
  onBalanceChanged: (cb: (status: unknown) => void) => {
    ipcRenderer.on('balance:changed', (_e, status) => cb(status));
  },
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
});
