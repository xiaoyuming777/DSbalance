// 设置页逻辑（独立文件：CSP 不允许内联脚本）
const $ = (id) => document.getElementById(id);
const api = window.dsbalance;

// 展示已配置密钥的脱敏形式（sk-****7890），不暴露明文
function renderKeyState(cfg) {
  const ks = $('keyState');
  const input = $('apiKey');
  if (cfg.hasApiKey) {
    const masked = cfg.apiKeyMasked || '****';
    ks.textContent = '已配置：' + masked;
    ks.className = 'state ok';
    input.placeholder = '已配置 ' + masked + '，留空保存则保持不变';
  } else {
    ks.textContent = '尚未配置';
    ks.className = 'state warn';
    input.placeholder = 'sk-…';
  }
}

async function init() {
  const cfg = await api.getConfig();
  console.log('settings init, hasApiKey=' + cfg.hasApiKey);
  // 配置值可能不在预设选项中（配置允许任意 1–60 整数），动态补一个选项避免下拉框空白
  const sel = $('pollInterval');
  if (![...sel.options].some((o) => o.value === String(cfg.pollIntervalMin))) {
    const opt = document.createElement('option');
    opt.value = String(cfg.pollIntervalMin);
    opt.textContent = cfg.pollIntervalMin + ' 分钟';
    sel.appendChild(opt);
  }
  sel.value = String(cfg.pollIntervalMin);
  $('warnThreshold').value = cfg.warnThreshold;
  $('dangerThreshold').value = cfg.dangerThreshold;
  renderKeyState(cfg);
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
  const cfg = await api.saveConfig({
    pollIntervalMin: Number($('pollInterval').value),
    warnThreshold: Number($('warnThreshold').value),
    dangerThreshold: Number($('dangerThreshold').value),
  });
  $('apiKey').value = ''; // 清空输入框，避免明文残留
  renderKeyState(cfg);
  const out = $('saveResult');
  out.textContent = '已保存 ✓';
  setTimeout(() => {
    out.textContent = '';
  }, 3000);
};

init();
