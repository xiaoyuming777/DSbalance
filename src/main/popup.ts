// 余额详情弹窗：点击托盘图标弹出，失焦自动关闭，数据实时推送
import { BrowserWindow } from 'electron';
import { forwardConsole, preloadPath, rendererPath } from './windows';

let popupWindow: BrowserWindow | null = null;

export function openPopupWindow(): void {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.focus();
    return;
  }
  popupWindow = new BrowserWindow({
    width: 340,
    height: 400,
    resizable: false,
    alwaysOnTop: true,
    title: 'DeepSeek 余额',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  popupWindow.once('ready-to-show', () => popupWindow?.show());
  forwardConsole(popupWindow, 'popup');
  popupWindow.on('blur', () => popupWindow?.close()); // 点击外部即关闭
  popupWindow.on('closed', () => {
    popupWindow = null;
  });
  popupWindow
    .loadFile(rendererPath('popup.html'))
    .then(() => console.log('[dsbalance] popup window loaded'))
    .catch((err) => console.error('[dsbalance] popup load failed:', err));
}
