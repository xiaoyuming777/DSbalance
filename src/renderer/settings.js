// 设置页逻辑（独立文件：CSP 不允许内联脚本）
const $ = (id) => document.getElementById(id);
const api = window.dsbalance;

async function init() {
  const cfg = await api.getConfig();
  console.log('settings init, hasApiKey=' + cfg.hasApiKey);
  $('pollInterval').value = String(cfg.pollIntervalMin);
  $('warnThreshold').value = cfg.warnThreshold;
  $('dangerThreshold').value = cfg.dangerThreshold;
  const ks = $('keyState');
  if (cfg.hasApiKey) {
    ks.textContent = '已配置（留空保存则保持不变）';
    ks.className = 'state ok';
  } else {
    ks.textContent = '尚未配置';
    ks.className = 'state warn';
  }
}

$('btnTest').onclick = async () => {
  const key = $('apiKey').value.trim();
  const out = $('testResult');
  if (!key) {
    out.textContent = '请先输入 API Key';
    return;
  }
  out.textContent = '测试中…';
  const r = await api.testBalance(key);
  if (r.ok && r.data.balance_infos[0]) {
    const b = r.data.balance_infos[0];
    out.textContent = '连接成功：总余额 ' + b.total_balance + ' ' + b.currency;
  } else {
    out.textContent = '失败：' + (r.error || '未知错误');
  }
};

$('btnSave').onclick = async () => {
  const key = $('apiKey').value.trim();
  if (key) await api.setApiKey(key);
  await api.saveConfig({
    pollIntervalMin: Number($('pollInterval').value),
    warnThreshold: Number($('warnThreshold').value),
    dangerThreshold: Number($('dangerThreshold').value),
  });
  const out = $('saveResult');
  out.textContent = '已保存 ✓';
  setTimeout(() => {
    out.textContent = '';
  }, 3000);
  const ks = $('keyState');
  if (key) {
    ks.textContent = '已配置（留空保存则保持不变）';
    ks.className = 'state ok';
  }
};

init();
