# 配置说明

## 默认歌单配置

项目现在支持在启动时自动加载指定的网易云音乐歌单。配置文件位于 `config.ts`。

### 当前配置

- **歌单ID**: `17473221422`
- **完整链接**: `https://music.163.com/playlist?id=17473221422`
- **自动播放**: 启用
- **加载延迟**: 500毫秒

### 如何修改默认歌单

1. 打开 `config.ts` 文件
2. 修改 `DEFAULT_PLAYLIST.URL` 为你想要的歌单链接
3. 保存文件并刷新页面

### 配置选项说明

```typescript
DEFAULT_PLAYLIST: {
  // 是否启用自动加载默认歌单
  ENABLED: true,
  
  // 默认歌单URL或ID（支持以下格式）
  // - 完整链接: "https://music.163.com/playlist?id=123456789"
  // - 歌单ID: "123456789"
  URL: "https://music.163.com/playlist?id=17473221422",
  
  // 是否自动播放第一首歌
  AUTO_PLAY: true,
  
  // 加载延迟时间（毫秒，建议保持500-1000）
  LOAD_DELAY: 500,
}
```

### 如何获取网易云音乐歌单ID

1. 打开网易云音乐网页版
2. 进入你想要的歌单页面
3. 从URL中复制歌单ID，例如：
   - URL: `https://music.163.com/#/playlist?id=123456789`
   - 歌单ID: `123456789`

### 禁用自动加载

如果你不想自动加载歌单，可以将 `ENABLED` 设置为 `false`：

```typescript
DEFAULT_PLAYLIST: {
  ENABLED: false,
  // ... 其他配置
}
```

这样应用启动时就不会自动加载任何歌单，你可以手动导入。