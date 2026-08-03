// 窗口工厂：设置页（step-2）、余额详情弹窗（step-4）
import { BrowserWindow } from 'electron';
import * as path from 'path';

let settingsWindow: BrowserWindow | null = null;

export function preloadPath(): string {
  return path.join(__dirname, '..', 'preload.js');
}

export function rendererPath(file: string): string {
  return path.join(__dirname, '..', 'renderer', file);
}

// 把渲染进程 console 转发到主进程日志，便于排查页面问题（如 CSP 拦截）
export function forwardConsole(win: BrowserWindow, tag: string): void {
  win.webContents.on('console-message', (details) => {
    if (details.level === 'debug') return;
    console.log(`[renderer:${tag}] ${details.message}`);
  });
}

export function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 460,
    height: 660,
    resizable: false,
    title: 'DSBalance 设置',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  settingsWindow.once('ready-to-show', () => settingsWindow?.show());
  forwardConsole(settingsWindow, 'settings');
  settingsWindow
    .loadFile(rendererPath('settings.html'))
    .then(() => console.log('[dsbalance] settings window loaded'))
    .catch((err) => console.error('[dsbalance] settings load failed:', err));
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}
