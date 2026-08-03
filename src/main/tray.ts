// 托盘：动态图标（余额数字 + 状态底色）、tooltip、右键菜单
import { app, Menu, Notification, Tray, nativeImage, shell } from 'electron';
import * as path from 'path';
import { BalanceInfo, BalanceResponse } from './api';
import { getConfig } from './config';
import { IconState, formatBalance, renderBalanceIcon } from './icon';
import { PollStatus, poller } from './poller';
import { openPopupWindow } from './popup';
import { openSettingsWindow } from './windows';

let tray: Tray | null = null;
let prevTotal: number | null = null; // 上次成功查询的余额，用于阈值穿越检测

const APP_ICON = path.join(__dirname, '..', '..', 'assets', 'icon.png');

export function initTray(): void {
  const icon = nativeImage.createFromPath(APP_ICON);
  tray = new Tray(icon);
  tray.setToolTip('DeepSeek 余额');
  tray.setContextMenu(buildMenu());
  tray.on('click', () => openPopupWindow()); // 左键点击弹详情
  poller.onChange(updateTray);
  poller.start(); // 启动即拉取一次余额
}

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: '立即刷新', click: () => void poller.refresh() },
    { label: '打开充值页面', click: () => void shell.openExternal('https://platform.deepseek.com/top_up') },
    { type: 'separator' },
    { label: '设置…', click: () => openSettingsWindow() },
    { label: '开机自启', type: 'checkbox', checked: isAutoStartEnabled(), click: (item) => setAutoStart(item.checked) },
    { type: 'separator' },
    { label: '退出', role: 'quit' },
  ]);
}

function isAutoStartEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}

function setAutoStart(enabled: boolean): void {
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: enabled });
  } else {
    // 开发模式：显式指向 electron.exe 与应用路径
    app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath, args: [app.getAppPath()] });
  }
}

// 余额展示以 CNY 优先，其次第一项
function primaryBalance(data: BalanceResponse): { info: BalanceInfo | null; total: number } {
  const infos = data.balance_infos ?? [];
  const cny = infos.find((i) => i.currency === 'CNY') ?? infos[0] ?? null;
  return {
    info: cny,
    total: cny ? Number(cny.total_balance) : NaN,
  };
}

function toIconState(status: PollStatus): IconState {
  switch (status.kind) {
    case 'fetching':
      return { text: '…', color: 'pending' };
    case 'idle':
      return { text: '-', color: 'pending' };
    case 'error':
      return { text: '!', color: 'error' };
    case 'ok': {
      const { total } = primaryBalance(status.data);
      if (!Number.isFinite(total)) return { text: '-', color: 'error' };
      const cfg = getConfig();
      const text = formatBalance(total);
      if (total <= cfg.dangerThreshold) return { text, color: 'danger' };
      if (total <= cfg.warnThreshold) return { text, color: 'warn' };
      return { text, color: 'ok' };
    }
  }
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
}

function tooltipText(status: PollStatus): string {
  switch (status.kind) {
    case 'idle':
      return 'DeepSeek 余额\n尚未开始查询';
    case 'fetching':
      return 'DeepSeek 余额\n查询中…';
    case 'error':
      return `DeepSeek 余额\n查询失败：${status.message}`;
    case 'ok': {
      const lines: string[] = ['DeepSeek 余额'];
      for (const info of status.data.balance_infos) {
        lines.push(
          `${info.currency} 总额 ${info.total_balance}（赠送 ${info.granted_balance} / 充值 ${info.topped_up_balance}）`
        );
      }
      lines.push(status.data.is_available ? '账户状态：可用' : '账户状态：余额不足，API 调用将失败');
      lines.push(`更新于 ${fmtTime(status.at)}`);
      return lines.join('\n');
    }
  }
}

async function updateTray(status: PollStatus): Promise<void> {
  if (!tray) return;
  tray.setToolTip(tooltipText(status));

  // 阈值穿越检测：跌破危险阈值时发一次性系统通知
  if (status.kind === 'ok') {
    const { info, total } = primaryBalance(status.data);
    if (Number.isFinite(total)) {
      const cfg = getConfig();
      if (prevTotal !== null && prevTotal > cfg.dangerThreshold && total <= cfg.dangerThreshold) {
        new Notification({
          title: 'DeepSeek 余额不足',
          body: `当前余额 ¥${info?.total_balance ?? total}，已低于危险阈值（¥${cfg.dangerThreshold}），请及时充值`,
          icon: APP_ICON,
        }).show();
      }
      prevTotal = total;
    }
  }

  try {
    const img = await renderBalanceIcon(toIconState(status));
    tray.setImage(img);
  } catch (err) {
    console.error('[dsbalance] icon render failed:', err);
  }
}
