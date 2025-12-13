# Aura Music（中文文档）

这是 Aura Music 的中文说明，包含本地运行、部署、以及自定义歌单等常见操作。

## 功能要点

- WebGL 动态流体背景（高性能着色器）。
# Aura Music（中文）

这是 Aura Music 的中文使用与部署指南，包含常用的本地运行、构建、部署与常见问题排查步骤。

## 概要
- WebGL 流体背景（着色器渲染）
- 画布形式歌词渲染与可视化效果
- 支持在线/本地音乐导入与搜索
- 支持播放速度与音调控制

## 本地开发

- 前置：Node.js（推荐 LTS）
- 安装依赖：
```bash
npm install
```
- 启动开发服务器：
```bash
npm run dev
```
- 打开浏览器：`http://localhost:3000`（默认端口）

## 构建与本地静态测试

- 构建生产包：
```bash
npm ci || npm install
npm run build
```
- 使用本地静态服务测试构建结果：
```bash
npx http-server ./dist -p 8080 -c-1
# 访问 http://127.0.0.1:8080
```

## 部署到 Cloudflare Pages（推荐）

1. 在 Cloudflare 控制台获取 `Account ID` 并创建一个具有 Pages 编辑权限的 API Token。
2. 登录 `wrangler`：
```bash
npx wrangler login
```
3. 构建并发布（示例项目名 `auramusic`）：
```bash
npm ci || npm install
npm run build
npx wrangler pages deploy ./dist --project-name auramusic --branch main
```
4. 如果 Pages 项目不存在，可先创建：
```bash
npx wrangler pages project create auramusic --account-id $CLOUDFLARE_ACCOUNT_ID
```

在 GitHub Actions 中自动化部署：在仓库 Secrets 中添加 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`，并在 `.github/workflows/deploy-cloudflare.yml` 中将 `projectName` 设置为你的 Pages 项目名。

示例 Action 段落：
```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    projectName: auramusic
    directory: './dist'
```

## 备用：GitHub Pages 部署（gh-pages）

- 可将 `dist` 发布到 `gh-pages` 分支，或使用 `peaceiris/actions-gh-pages`。
- 确保 `dist/index.html` 中引用的脚本为相对路径（例如 `./assets/index-xxx.js`），不要指向源码文件（如 `./index.tsx`）。

## 默认歌单与导入

- 默认歌单配置位于 `config.ts`：
```ts
export const APP_CONFIG = {
  DEFAULT_PLAYLIST: {
    ENABLED: true,
    URL: "https://music.163.com/playlist?id=17473221422",
    AUTO_PLAY: false,
    LOAD_DELAY: 500,
  }
}
```
- 修改默认歌单：编辑 `config.ts` 中的 `URL`。
- 无需重新部署即可在 UI 中通过“Import Playlist / Import URL”导入歌单。

## 部署常见问题（黑屏/空白页）

- 请确认 `dist/index.html` 引用了已构建的 JS（`./assets/index-xxx.js`），而不是源码（如 `./index.tsx`）。
- 检查静态资源的 `Content-Type` 是否为 `application/javascript`。
- 清除浏览器缓存和 Service Worker（若存在）后再访问。
- 在 DevTools Console 查看是否有模块加载失败、CORS、或 MIME type 错误。

## 其他建议

- 在第一次 CI 发布前，建议先在本地使用 `npx wrangler pages deploy` 验证构建和发布流程。
---