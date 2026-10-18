# Aura Music（中文文档）

Aura Music 的中文说明：本地运行、构建、部署，以及歌单/歌词相关的常见操作。

## 功能要点

- WebGL 动态流体背景（着色器渲染）
- Canvas 手绘歌词（翻译与罗马音副行）与可视化效果
- 在线搜索、歌单导入（支持只填歌单 ID）与本地文件导入
- 播放速度与音调控制、液态玻璃界面、PWA 离线缓存

## 目录结构

- `apps/web-player`：应用入口（Vite + React）
- `packages/core`：类型、缓存、快捷键注册表
- `packages/player`：播放器、歌单与来源同步
- `packages/view`：界面组件与液态玻璃样式
- `packages/lyrics`：歌词解析与 Canvas 渲染
- `packages/background`、`packages/visualizer`：背景与可视化
- `tests/`：Bun 测试

## 本地开发

- 前置：Bun（`bun --version`）
- 安装依赖：`bun install`
- 启动开发服务器：`bun run dev`（默认 http://localhost:3000）
- 类型检查：`bun run typecheck`
- 运行测试：`bun test tests`
- 生产构建：`bun run build`（产物在 `apps/web-player/dist`）

## 部署

### Cloudflare Pages（主用）

工作流为 `.github/workflows/deploy-cloudflare.yml`，Pages 项目名 `auramusic`，需要在仓库 Secrets 里配置 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`。该构建使用 `VITE_BASE_PATH="/"`（部署在域名根路径）。

手动发布：

```bash
VITE_BASE_PATH="/" bun run build
npx wrangler pages deploy ./apps/web-player/dist --project-name auramusic --branch main
```

### GitHub Pages（备用）

工作流为 `.github/workflows/deploy.yml`，把 `apps/web-player/dist` 发布到 `gh-pages` 分支（仓库 Pages 源即该分支）。该构建使用默认 base `/aura-music/`，对应 `https://<owner>.github.io/aura-music/`。

## 默认歌单与导入

- 默认歌单位于 `apps/web-player/src/config.ts`：

```ts
export const APP_CONFIG = {
  DEFAULT_PLAYLIST: {
    ENABLED: true,
    URL: "https://music.163.com/playlist?id=17473221422",
    AUTO_PLAY: false,
    LOAD_DELAY: 500,
  },
};
```

- 启动时：队列为空则导入该歌单；队列里已有网易云歌曲则与歌单同步一次（补新增、移除歌单已删掉的、并把顺序对齐歌单）。
- 面板里也可以直接粘贴歌单 **ID** 或完整链接导入。
- 手动拖动过的顺序会被记住，直到歌单本身真的增删歌曲为止。

## 部署常见问题（黑屏/空白页）

- 确认 `dist/index.html` 引用的是构建后的 `./assets/index-xxx.js`，而不是源码入口文件。
- 静态资源的 `Content-Type` 应为 `application/javascript`。
- 清掉浏览器缓存与 Service Worker 后再访问。
- 在 DevTools Console 查看是否有模块加载失败、CORS 或 MIME 类型错误。