// 用 esbuild 把 main / preload 打包到 dist/（CJS，供 electron . 加载）
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 渲染层页面为纯静态 HTML（无构建），直接拷贝
fs.cpSync(path.join(__dirname, '..', 'src', 'renderer'), path.join(__dirname, '..', 'dist', 'renderer'), {
  recursive: true,
});

// 完整性校验：html 引用的外置 JS 必须一并拷入，否则打包版弹窗/设置页会因脚本 404 失灵
const REQUIRED_RENDERER = ['popup.html', 'popup.js', 'settings.html', 'settings.js'];
const missing = REQUIRED_RENDERER.filter((f) => !fs.existsSync(path.join(__dirname, '..', 'dist', 'renderer', f)));
if (missing.length > 0) {
  console.error(`[build] 渲染层文件缺失（打包后将导致页面失灵）: ${missing.join(', ')}`);
  process.exit(1);
}

esbuild
  .build({
    entryPoints: ['src/main/index.ts', 'src/preload.ts'],
    outdir: 'dist',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron'],
    sourcemap: true,
    logLevel: 'info',
  })
  .catch(() => process.exit(1));
