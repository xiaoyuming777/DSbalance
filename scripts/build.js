// 用 esbuild 把 main / preload 打包到 dist/（CJS，供 electron . 加载）
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 渲染层页面为纯静态 HTML（无构建），直接拷贝
fs.cpSync(path.join(__dirname, '..', 'src', 'renderer'), path.join(__dirname, '..', 'dist', 'renderer'), {
  recursive: true,
});

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
