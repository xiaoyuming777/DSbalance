// 余额详情弹窗：点击托盘图标弹出，失焦自动关闭，数据实时推送
import { BrowserWindow, screen } from 'electron';
import { forwardConsole, preloadPath, rendererPath } from './windows';

const POPUP_WIDTH = 340;
const POPUP_HEIGHT = 400;
const EDGE_MARGIN = 6; // 与任务栏/屏幕边缘的间距

// 弹窗定位到托盘图标（鼠标所在位置）附近：按任务栏方向紧贴图标内侧弹出，避免居中
function popupPosition(): { x: number; y: number } {
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const { workArea: wa, bounds } = display;
  // 通过工作区与屏幕边界之差推断任务栏方向（多显示器下仅对含任务栏的屏幕有效）
  const taskbarBottom = wa.height < bounds.height && wa.y > bounds.y;
  const taskbarTop = wa.height < bounds.height && wa.y === bounds.y;
  const taskbarLeft = wa.width < bounds.width && wa.x === bounds.x;
  const taskbarRight = wa.width < bounds.width && wa.x > bounds.x;

  let x = cursor.x - POPUP_WIDTH / 2;
  let y = cursor.y - POPUP_HEIGHT - EDGE_MARGIN; // 默认：弹窗在图标上方
  if (taskbarBottom) y = cursor.y - POPUP_HEIGHT - EDGE_MARGIN;
  else if (taskbarTop) y = cursor.y + EDGE_MARGIN;
  else if (taskbarLeft) x = cursor.x + EDGE_MARGIN;
  else if (taskbarRight) x = cursor.x - POPUP_WIDTH - EDGE_MARGIN;

  // 夹取到工作区内，保证不超出屏幕
  x = Math.min(Math.max(x, wa.x + EDGE_MARGIN), wa.x + wa.width - POPUP_WIDTH - EDGE_MARGIN);
  y = Math.min(Math.max(y, wa.y + EDGE_MARGIN), wa.y + wa.height - POPUP_HEIGHT - EDGE_MARGIN);
  return { x, y };
}

let popupWindow: BrowserWindow | null = null;

export function openPopupWindow(): void {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.focus();
    return;
  }
  const { x, y } = popupPosition();
  popupWindow = new BrowserWindow({
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    x,
    y,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true, // 不占用任务栏按钮
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
