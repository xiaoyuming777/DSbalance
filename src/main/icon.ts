// 图标渲染管线：离屏 BrowserWindow + Canvas 绘制余额文字与状态底色 → nativeImage
import { BrowserWindow, nativeImage, NativeImage } from 'electron';

export type IconColor = 'ok' | 'warn' | 'danger' | 'error' | 'pending';

export interface IconState {
  text: string;
  color: IconColor;
}

const COLORS: Record<IconColor, string> = {
  ok: '#22b04c', // 绿：余额充足
  warn: '#e8b75a', // 黄：低于预警阈值
  danger: '#e05c4e', // 红：低于危险阈值
  error: '#6b7280', // 灰：查询失败
  pending: '#5a6276', // 深灰：查询中/未开始
};

// 32x32 底图，Windows 按 DPI 缩放到任务栏尺寸，高 DPI 下更清晰
const SIZE = 32;

let offscreen: BrowserWindow | null = null;

async function ensureOffscreen(): Promise<BrowserWindow> {
  if (offscreen && !offscreen.isDestroyed()) return offscreen;
  const win = new BrowserWindow({
    show: false,
    width: SIZE,
    height: SIZE,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
    },
  });
  await win.loadURL('data:text/html;charset=utf-8,<canvas id="c"></canvas>');
  offscreen = win;
  return win;
}

// 精简余额格式：110 → "110"、12.5 → "12.5"、1100 → "1.1k"、0.05 → "0.05"
export function formatBalance(v: number): string {
  if (!Number.isFinite(v)) return '-';
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  if (v >= 100) return v.toFixed(0);
  if (v === 0) return '0';
  if (v < 1) return v.toFixed(2).replace(/0$/, '');
  return v.toFixed(1);
}

export async function renderBalanceIcon(state: IconState): Promise<NativeImage> {
  const win = await ensureOffscreen();
  const js = `(() => {
    const SIZE = ${SIZE};
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    const text = ${JSON.stringify(state.text)};
    const bg = ${JSON.stringify(COLORS[state.color])};
    // 圆角矩形背景
    const r = 7;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, SIZE - 1, SIZE - 1, r);
    ctx.fillStyle = bg;
    ctx.fill();
    // 白色数字，按位数自适应字号
    ctx.fillStyle = '#ffffff';
    const fontSize = text.length >= 4 ? 12 : text.length === 3 ? 14 : 15;
    ctx.font = 'bold ' + fontSize + 'px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, SIZE / 2, SIZE / 2 + 0.5);
    return canvas.toDataURL('image/png');
  })()`;
  const dataUrl = (await win.webContents.executeJavaScript(js)) as string;
  return nativeImage.createFromDataURL(dataUrl);
}
