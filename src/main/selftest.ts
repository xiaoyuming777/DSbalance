// 数据层自检：npx electron . --selftest
// 使用临时 userData（不污染真实配置），验证：
//   1. API Key 加密存储往返
//   2. 配置保存/读取
//   3. 余额接口错误处理（无效 Key 应报 401）
import { app } from 'electron';
import * as path from 'path';
import { fetchBalance } from './api';
import { getApiKey, getConfig, saveConfig, setApiKey } from './config';
import { formatBalance, renderBalanceIcon } from './icon';

export function runSelfTest(): void {
  app.setPath('userData', path.join(app.getPath('temp'), 'dsbalance-selftest'));

  app.whenReady().then(async () => {
    const logs: string[] = [];

    // 1. 密钥加密往返
    setApiKey('sk-test-123');
    const key = getApiKey();
    logs.push(`apiKey roundtrip: ${key === 'sk-test-123' ? 'PASS' : 'FAIL (' + String(key) + ')'}`);

    // 2. 配置往返
    saveConfig({ pollIntervalMin: 7, warnThreshold: 5, dangerThreshold: 1 });
    const cfg = getConfig();
    const cfgOk = cfg.pollIntervalMin === 7 && cfg.warnThreshold === 5 && cfg.dangerThreshold === 1;
    logs.push(`config roundtrip: ${cfgOk ? 'PASS' : 'FAIL ' + JSON.stringify(cfg)}`);

    // 3. 无效 Key 应得到 401 类错误
    try {
      await fetchBalance('sk-invalid-dummy-key');
      logs.push('fetch invalid key: FAIL (no error thrown)');
    } catch (err) {
      const e = err as { kind?: string; message?: string };
      if (e.kind === 'auth') logs.push('fetch invalid key: PASS (401 auth error)');
      else logs.push(`fetch invalid key: NOTE (${e.kind ?? '?'}: ${e.message})`);
    }

    // 4. 余额格式化
    const fbCases: Array<[number, string]> = [
      [110, '110'],
      [12.5, '12.5'],
      [1100, '1.1k'],
      [0.05, '0.05'],
      [0, '0'],
      [NaN, '-'],
    ];
    for (const [input, expected] of fbCases) {
      const got = formatBalance(input);
      logs.push(`formatBalance(${input}): ${got === expected ? 'PASS' : 'FAIL (' + got + ')'}`);
    }

    // 5. 离屏画布图标渲染
    try {
      const img = await renderBalanceIcon({ text: '3.2', color: 'ok' });
      const size = img.getSize();
      const ok = size.width > 0 && img.toBitmap().length > 0;
      logs.push(`icon render: ${ok ? 'PASS' : 'FAIL'} (${size.width}x${size.height}, ${img.toBitmap().length} bytes)`);
    } catch (err) {
      logs.push(`icon render: FAIL (${(err as Error).message})`);
    }

    console.log('[selftest]\n' + logs.join('\n'));
    app.exit(0);
  });
}
