// 应用配置文件
export const APP_CONFIG = {
  // 默认歌单配置
  DEFAULT_PLAYLIST: {
    // 是否启用自动加载默认歌单
    ENABLED: true,
    // 默认歌单URL或ID
    URL: "https://music.163.com/playlist?id=17473221422",
    // 是否自动播放第一首歌
    AUTO_PLAY: false,
    // 加载延迟时间（毫秒）
    LOAD_DELAY: 500,
  },
  
  // 其他配置可以在这里添加
  UI: {
    // 默认主题色
    DEFAULT_ACCENT_COLOR: "#4f46e5",
  },
} as const;