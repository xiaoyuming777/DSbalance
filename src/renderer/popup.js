// 余额详情弹窗逻辑（独立文件：CSP 不允许内联脚本）
const $ = (id) => document.getElementById(id);
const api = window.dsbalance;

function fmtTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

// 展示以 CNY 优先，其次第一项
function primary(status) {
  const infos = status.data.balance_infos || [];
  return infos.find((i) => i.currency === 'CNY') || infos[0] || null;
}

function render(status) {
  const badge = $('badge');
  const errBox = $('errorBox');
  errBox.textContent = '';

  if (status.kind === 'fetching') {
    badge.className = 'badge';
    badge.textContent = '查询中…';
    $('total').textContent = '…';
    $('totalLabel').textContent = '总余额';
    $('details').innerHTML = '';
    $('updated').textContent = '';
    return;
  }
  if (status.kind === 'error') {
    badge.className = 'badge danger';
    badge.textContent = '查询失败';
    $('total').textContent = '!';
    $('totalLabel').textContent = '总余额';
    $('details').innerHTML = '';
    errBox.textContent = status.message;
    $('updated').textContent = status.at ? '失败于 ' + fmtTime(status.at) : '';
    return;
  }
  if (status.kind === 'idle') {
    badge.className = 'badge';
    badge.textContent = '未开始';
    $('total').textContent = '-';
    return;
  }

  const data = status.data;
  badge.className = 'badge ' + (data.is_available ? 'ok' : 'danger');
  badge.textContent = data.is_available ? '账户可用' : '余额不足';

  const p = primary(status);
  $('total').textContent = p ? p.total_balance : '-';
  $('totalLabel').textContent = p ? '总余额（' + p.currency + '）' : '总余额';

  $('details').innerHTML = (data.balance_infos || [])
    .map(
      (i) =>
        '<div class="detail">' +
        '<div class="row"><span class="k">币种</span><span class="v">' + i.currency + '</span></div>' +
        '<div class="row"><span class="k">总余额</span><span class="v">' + i.total_balance + '</span></div>' +
        '<div class="row"><span class="k">赠送余额</span><span class="v">' + i.granted_balance + '</span></div>' +
        '<div class="row"><span class="k">充值余额</span><span class="v">' + i.topped_up_balance + '</span></div>' +
        '</div>'
    )
    .join('');

  $('updated').textContent = '更新于 ' + fmtTime(status.at);
}

$('btnRefresh').onclick = () => void api.refreshBalance();
$('btnTopup').onclick = () => void api.openExternal('https://platform.deepseek.com/top_up');

api.getBalance().then(render);
api.onBalanceChanged(render);
console.log('popup init');
