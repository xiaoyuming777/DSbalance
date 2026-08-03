# DSBalance — DeepSeek 余额托盘监控

在 Windows 任务栏托盘实时显示 DeepSeek API 账户余额的桌面小工具。

余额数字直接画在托盘图标上，底色随余额状态变化；悬停查看完整余额明细，左键点击弹出详情面板。

![status](https://img.shields.io/badge/platform-Windows-4D6BFE) ![electron](https://img.shields.io/badge/Electron-43.x-47848F) ![version](https://img.shields.io/badge/version-0.1.0-lightgrey)

## 功能特性

| 功能 | 说明 |
| --- | --- |
| 🖥️ 任务栏实时显示 | 余额数字（`3.2` / `12.5` / `1.1k` 精简格式）直接绘制在托盘图标上 |
| 🎨 状态颜色 | 绿 = 余额充足，黄 = 低于预警阈值，红 = 低于危险阈值，灰 = 查询失败 |
| 💬 悬浮提示 | 悬停显示总额 / 赠送 / 充值 / 币种 / 账户状态 / 更新时间 |
| 📋 详情弹窗 | 左键点击托盘弹出（位置跟随托盘图标、点击即刷新一次），失焦自动关闭，余额变化实时推送 |
| 🔔 阈值通知 | 余额跌破危险阈值时发送一次性系统通知，点击通知直达充值页 |
| ⏱️ 自动轮询 | 默认 10 分钟（可配置 1–60 分钟），失败指数退避（10 → 20 → 30 分钟封顶，成功即重置） |
| 🔒 密钥安全 | API Key 经 Windows DPAPI（safeStorage）加密后落盘，明文仅存内存；设置页仅显示脱敏形式（`sk-****1234`） |
| 🚀 开机自启 | 托盘右键菜单一键开关 |

## 快速开始

### 1. 下载

构建产物位于 `release/` 目录（需自行构建，见下文）：

- `DSBalance Setup <版本>.exe` — NSIS 安装包（可选安装目录、创建桌面快捷方式）
- `DSBalance-<版本>-portable.exe` — 免安装便携版

### 2. 配置 API Key

1. 在 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 创建 API Key
2. 启动应用，右键托盘图标 → **设置**
3. 粘贴 API Key → 点击 **测试连接**（应显示当前余额）
4. 点 **保存**，托盘图标随即开始显示余额

> 密钥仅加密保存在本机 `%APPDATA%\dsbalance\settings.json`，不会上传到任何第三方。

### 3. 常用操作

- 左键点托盘图标 → 余额详情弹窗（打开前自动刷新一次，展示最新余额）
- 右键托盘图标 → 立即刷新 / 打开充值页面 / 设置 / 开机自启 / 退出
- 悬停图标 → 查看完整余额明细

## 开发

### 环境要求

- Node.js ≥ 20（开发机已验证 v24）
- Windows 10/11（托盘与通知依赖 Windows API）

> 国内网络环境下，Electron 二进制通过 `.npmrc` 中的 `electron_mirror`（npmmirror）下载，打包工具二进制通过 `scripts/dist.js` 中的 `ELECTRON_BUILDER_BINARIES_MIRROR` 下载。

### 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm install` | 安装依赖 |
| `npm run dev` | 构建并启动应用（开发模式） |
| `npm run build` | 构建 main/preload 到 `dist/`，生成占位图标（含渲染层完整性校验） |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run dist` | 打包 NSIS 安装包 + 便携版到 `release/` |
| `npx electron . --selftest` | 运行数据层自检（临时 userData，不污染真实配置） |

### 开发标志

| 标志 | 说明 |
| --- | --- |
| `--settings` | 启动时打开设置窗口 |
| `--popup` | 启动时打开余额详情弹窗 |
| `--selftest` | 运行自检后退出：密钥加密往返 / 配置往返 / 无效 Key 返回 401 / 余额格式化 / 图标渲染 / 密钥脱敏 |

### 目录结构

```
DSbalance/
├── package.json / tsconfig.json / electron-builder.yml / .npmrc
├── assets/icon.png             # 应用图标（脚本生成，可替换）
├── scripts/
│   ├── build.js                # esbuild 打包 main/preload + 拷贝渲染层（含完整性校验）
│   ├── gen-icon.js             # 零依赖生成占位 PNG 图标
│   └── dist.js                 # electron-builder 入口（预置国内镜像）
└── src/
    ├── main/
    │   ├── index.ts            # 入口：单实例锁、生命周期、开发标志
    │   ├── api.ts              # DeepSeek 余额接口客户端
    │   ├── config.ts           # 配置读写 + safeStorage 密钥加密
    │   ├── poller.ts           # 轮询调度 + 失败退避
    │   ├── icon.ts             # 离屏 Canvas → 托盘图标渲染管线
    │   ├── tray.ts             # 托盘：动态图标 / tooltip / 菜单 / 阈值通知
    │   ├── ipc.ts              # IPC 注册（含站外链接白名单）
    │   ├── windows.ts          # 窗口工厂 + 渲染进程日志转发
    │   ├── popup.ts            # 余额详情弹窗
    │   └── selftest.ts         # 数据层自检
    ├── preload.ts              # contextBridge 安全桥
    └── renderer/
        ├── settings.html/js    # 设置页（API Key / 轮询间隔 / 阈值）
        └── popup.html/js       # 余额详情页
```

> 渲染层为纯静态页面，无框架依赖；内联脚本因 CSP（`default-src 'self'`）限制必须外置为独立 `.js` 文件。

## 工作原理

### 余额接口

应用调用 DeepSeek 官方接口（[文档](https://api-docs.deepseek.com/api/get-user-balance/)），无需任何第三方服务：

```
GET https://api.deepseek.com/user/balance
Authorization: Bearer <API_KEY>

{
  "is_available": true,
  "balance_infos": [{
    "currency": "CNY",
    "total_balance": "110.00",
    "granted_balance": "10.00",
    "topped_up_balance": "100.00"
  }]
}
```

支持多币种（CNY / USD 并存），展示以 CNY 优先，tooltip 中逐币种列出。

### 图标渲染

离屏 BrowserWindow + Canvas 绘制 32×32 位图（圆角底色 + 白色余额数字）→ `nativeImage` → `tray.setImage()`，Windows 按 DPI 自动缩放，高 DPI 下保持清晰。

### 详情弹窗

左键点击托盘时先触发一次余额刷新，再弹出详情窗；窗口定位到托盘图标（鼠标位置）附近，自动识别任务栏方向（上/下/左/右）并紧贴图标内侧，失焦即关闭，不占用任务栏按钮。

### 配置存储

- 位置：`%APPDATA%\dsbalance\settings.json`
- API Key 用 `safeStorage.encryptString`（Windows 下即 DPAPI，当前用户级）加密为 base64 存储，明文不出主进程；设置页仅返回脱敏形式（`sk-****1234`）
- 写入采用“临时文件 + 原子替换”，进程崩溃不会损坏配置；保存空 API Key 即清除密钥字段
- 字段：`pollIntervalMin`（1–60，默认 10）、`warnThreshold`（默认 ¥10）、`dangerThreshold`（默认 ¥2）

## 常见问题

### 打包版弹窗/设置页无响应（余额不显示、按钮点击无效）

历史上打包产物曾缺失渲染层 JS（`popup.js` / `settings.js` 未进入 asar），导致页面脚本 404、按钮事件未绑定。`scripts/build.js` 已加入渲染层完整性校验，缺失文件时构建直接报错退出。若旧安装包仍有此问题，重新执行 `npm run dist` 打包即可。

### 点击"测试连接"没有反应

早期版本的内联脚本会被 CSP（`default-src 'self'`）拦截导致页面 JS 不执行，已修复（脚本外置）。若仍异常：

1. 确认没有旧版本实例占用单实例锁（`PowerShell: Get-Process electron | Stop-Process`）
2. 查看启动日志中的 `[renderer:settings]` 前缀输出

### 余额图标显示为灰色 `!`

查询失败。悬停图标查看具体原因：

- 尚未配置 API Key → 在设置中填写
- API Key 无效或已过期 → 重新生成 Key
- 网络请求失败 → 检查网络后点"立即刷新"

### 提示"未知发布者"（SmartScreen）

exe 未做代码签名，首次运行可能弹出提示，选择"仍要运行"即可。正式分发可配置代码签名证书。

## 技术栈

- [Electron](https://www.electronjs.org/) + TypeScript
- [esbuild](https://esbuild.github.io/) — main/preload 打包
- [electron-builder](https://www.electron.build/) — 分发打包
- 零运行时第三方依赖（网络用 Node 内置 fetch，加密用 Electron safeStorage）

## License

MIT
