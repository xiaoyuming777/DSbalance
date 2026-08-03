// 打包入口：预置 electron-builder 二进制镜像（NSIS/winCodeSign 走 npmmirror，GitHub 直连不稳定）
process.env.ELECTRON_BUILDER_BINARIES_MIRROR =
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR || 'https://npmmirror.com/mirrors/electron-builder-binaries/';

require('electron-builder')
  .build()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
