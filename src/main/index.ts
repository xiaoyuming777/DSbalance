import { app } from 'electron';
import { registerIpc } from './ipc';
import { poller } from './poller';
import { openPopupWindow } from './popup';
import { disposeTray, initTray } from './tray';
import { openSettingsWindow } from './windows';
import { runSelfTest } from './selftest';

if (process.argv.includes('--selftest')) {
  runSelfTest();
} else {
  boot();
}

registerIpc();

function boot(): void {
  // 单实例：重复启动时聚焦已有实例
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    openSettingsWindow();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.dsbalance.app'); // Windows 通知所需

    if (process.argv.includes('--settings')) {
      openSettingsWindow();
    }
    if (process.argv.includes('--popup')) {
      openPopupWindow();
    }

    initTray();
    console.log('[dsbalance] tray ready');
  });

  // 托盘应用：所有窗口关闭后保持常驻
  app.on('window-all-closed', () => {
    /* 不退出 */
  });

  // 退出前清理：停止轮询、销毁托盘
  app.on('will-quit', () => {
    poller.stop();
    disposeTray();
  });
}
