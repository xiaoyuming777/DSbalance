// IPC 注册：设置页/详情窗通过 preload 桥与主进程通信
import { BrowserWindow, ipcMain, shell } from 'electron';
import { fetchBalance } from './api';
import { getApiKey, getConfig, maskApiKey, saveConfig, setApiKey, AppConfig } from './config';
import { poller } from './poller';

// 允许打开的站外链接白名单
const ALLOWED_HOSTS = new Set(['platform.deepseek.com', 'api-docs.deepseek.com']);

export function registerIpc(): void {
  // 设置页读取配置（不含密钥明文，只含是否已配置及脱敏后的密钥）
  ipcMain.handle('config:get', () => {
    const key = getApiKey();
    return { ...getConfig(), hasApiKey: key !== null, apiKeyMasked: key ? maskApiKey(key) : null };
  });

  ipcMain.handle('config:save', (_e, partial: Partial<AppConfig>) => {
    const next = saveConfig(partial);
    poller.reschedule(); // 轮询间隔可能已变化
    const key = getApiKey();
    return { ...next, hasApiKey: key !== null, apiKeyMasked: key ? maskApiKey(key) : null };
  });

  ipcMain.handle('config:setApiKey', async (_e, key: string) => {
    setApiKey(String(key ?? '').trim());
    await poller.refresh(); // 保存后立即拉一次余额
    return { ok: true };
  });

  // 设置页"测试连接"
  ipcMain.handle('balance:test', async (_e, apiKey: string) => {
    try {
      const data = await fetchBalance(String(apiKey ?? '').trim());
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 详情弹窗：当前状态 + 手动刷新
  ipcMain.handle('balance:get', () => poller.getStatus());
  ipcMain.handle('balance:refresh', async () => {
    await poller.refresh();
    return poller.getStatus();
  });

  // 余额状态变化推送给所有渲染窗口
  poller.onChange((status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('balance:changed', status);
    }
  });

  // 站外链接：仅允许白名单域名
  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    try {
      const u = new URL(String(url));
      if (u.protocol !== 'https:' || !ALLOWED_HOSTS.has(u.hostname)) {
        return { ok: false, error: 'URL 不在允许列表' };
      }
      void shell.openExternal(u.toString());
      return { ok: true };
    } catch {
      return { ok: false, error: 'URL 无效' };
    }
  });
}
