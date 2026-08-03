// 配置存储：userData/settings.json
// API Key 用 Electron safeStorage（Windows 下为 DPAPI，当前用户级加密）加密后落盘，
// 明文仅存在于进程内存中。
import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface AppConfig {
  pollIntervalMin: number; // 轮询间隔（分钟）
  warnThreshold: number; // 余额预警阈值（¥）
  dangerThreshold: number; // 余额危险阈值（¥）
}

export interface StoredConfig extends AppConfig {
  apiKeyEnc?: string; // safeStorage 加密后的 API Key（base64）
}

export const DEFAULT_CONFIG: AppConfig = {
  pollIntervalMin: 10,
  warnThreshold: 10,
  dangerThreshold: 2,
};

let cache: AppConfig | null = null;

function configPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readStored(): Partial<StoredConfig> {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), 'utf-8')) as Partial<StoredConfig>;
    return raw;
  } catch {
    return {};
  }
}

function writeStored(stored: Partial<StoredConfig>): void {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(stored, null, 2), 'utf-8');
}

function clampInt(v: unknown, min: number, max: number, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
}

function clampNum(v: unknown, min: number, max: number, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

export function getConfig(): AppConfig {
  if (!cache) {
    const stored = readStored();
    cache = {
      pollIntervalMin: clampInt(stored.pollIntervalMin, 1, 60, DEFAULT_CONFIG.pollIntervalMin),
      warnThreshold: clampNum(stored.warnThreshold, 0, 1e9, DEFAULT_CONFIG.warnThreshold),
      dangerThreshold: clampNum(stored.dangerThreshold, 0, 1e9, DEFAULT_CONFIG.dangerThreshold),
    };
  }
  return { ...cache };
}

export function saveConfig(partial: Partial<AppConfig>): AppConfig {
  const stored = readStored();
  const next: AppConfig = {
    pollIntervalMin: clampInt(partial.pollIntervalMin, 1, 60, stored.pollIntervalMin ?? DEFAULT_CONFIG.pollIntervalMin),
    warnThreshold: clampNum(partial.warnThreshold, 0, 1e9, stored.warnThreshold ?? DEFAULT_CONFIG.warnThreshold),
    dangerThreshold: clampNum(partial.dangerThreshold, 0, 1e9, stored.dangerThreshold ?? DEFAULT_CONFIG.dangerThreshold),
  };
  cache = next;
  writeStored({ ...next, apiKeyEnc: stored.apiKeyEnc });
  return { ...next };
}

// ---- API Key 加解密 ----

function encryptKey(key: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(key).toString('base64');
  }
  // 降级：仅 base64 编码（一般不会走到，Windows 桌面会话均可用 DPAPI）
  return Buffer.from(key, 'utf-8').toString('base64');
}

function decryptKey(enc: string): string {
  const buf = Buffer.from(enc, 'base64');
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(buf);
    } catch {
      return '';
    }
  }
  return buf.toString('utf-8');
}

export function getApiKey(): string | null {
  const stored = readStored();
  if (!stored.apiKeyEnc) return null;
  const key = decryptKey(stored.apiKeyEnc);
  return key || null;
}

export function setApiKey(key: string): void {
  const stored = readStored();
  stored.apiKeyEnc = encryptKey(key);
  writeStored(stored);
}
