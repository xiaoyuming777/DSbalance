// 轮询调度：启动即拉一次，按配置间隔轮询；失败指数退避（10 分钟起，翻倍封顶 30 分钟，成功即重置）
import { ApiError, BalanceResponse, fetchBalance } from './api';
import { getApiKey, getConfig } from './config';

export type PollStatus =
  | { kind: 'idle' }
  | { kind: 'fetching' }
  | { kind: 'ok'; data: BalanceResponse; at: number }
  | { kind: 'error'; message: string; at: number };

export type StatusListener = (status: PollStatus) => void;

const BACKOFF_BASE_MS = 10 * 60_000; // 首次失败退避 10 分钟
const BACKOFF_MAX_MS = 30 * 60_000; // 退避上限 30 分钟

export class Poller {
  private timer: NodeJS.Timeout | null = null;
  private status: PollStatus = { kind: 'idle' };
  private listeners = new Set<StatusListener>();
  private fetching = false;
  private failCount = 0; // 连续失败次数，用于指数退避

  start(): void {
    void this.poll();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  async refresh(): Promise<void> {
    await this.poll();
  }

  getStatus(): PollStatus {
    return this.status;
  }

  onChange(fn: StatusListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // 配置变化后重新按新间隔调度
  reschedule(): void {
    this.failCount = 0;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.schedule(getConfig().pollIntervalMin * 60_000);
  }

  private schedule(ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.poll(), ms);
  }

  private async poll(): Promise<void> {
    if (this.fetching) return;
    this.fetching = true;
    this.status = { kind: 'fetching' };
    this.emit();

    const key = getApiKey();
    try {
      if (!key) {
        throw new ApiError('尚未配置 API Key，请在设置中填写', 'auth');
      }
      const data = await fetchBalance(key);
      this.status = { kind: 'ok', data, at: Date.now() };
      this.failCount = 0; // 成功后重置连续失败计数
      this.schedule(getConfig().pollIntervalMin * 60_000);
      console.log('[dsbalance] balance updated, kind=ok');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.status = { kind: 'error', message, at: Date.now() };
      // 指数退避：10 分钟 → 20 分钟 → 30 分钟封顶
      this.failCount++;
      const backoff = Math.min(BACKOFF_BASE_MS * 2 ** (this.failCount - 1), BACKOFF_MAX_MS);
      this.schedule(backoff);
      console.log(`[dsbalance] balance update failed: ${message}`);
    } finally {
      this.fetching = false;
      this.emit();
    }
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.status);
  }
}

export const poller = new Poller();
