# 配置指南

## 飞书通知配置

1. 飞书里建个群（只有自己也行），进群设置 → 群机器人 → 添加自定义机器人 → 复制 Webhook 地址
2. 复制 `.env.example` 为 `.env`，把地址填进去：

```bash
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/你的地址
```

3. 测试：`node notify-system.js --task "测试"`

## Telegram 通知配置

1. 找 @BotFather 创建机器人，拿到 Token
2. 给机器人发条消息，访问 `https://api.telegram.org/bot<TOKEN>/getUpdates` 拿到 Chat ID
3. 填入 `.env`：

```bash
TELEGRAM_BOT_TOKEN=你的token
TELEGRAM_CHAT_ID=你的chat_id
```

需要代理的话加一行 `HTTPS_PROXY=http://127.0.0.1:7890`。

## 声音提醒

默认开启，仅支持 Windows。不需要的话设 `SOUND_ENABLED=false`。

## macOS 原生通知

macOS 上默认开启，任务完成时弹出通知中心横幅并播放提示音，无需配置 webhook。

需要先安装 `terminal-notifier`（一次性）：

```bash
brew install terminal-notifier
```

首次运行时若 macOS 弹出「"terminal-notifier" 想要发送通知」，点**允许**即可。
如果只进通知中心不弹横幅，去 **系统设置 → 通知 → terminal-notifier** 把样式设为**横幅/提醒**。

可选配置：
- `MAC_NOTIFICATION_ENABLED=false` — 关闭原生通知
- `MAC_NOTIFICATION_SOUND=Hero` — 换提示音（见 `/System/Library/Sounds`，如 Glass/Ping/Hero/Submarine）

## 故障排除

- 飞书收不到：检查 webhook 地址是否完整复制了
- 手环不震：确认飞书通知权限开着，手环和手机蓝牙连着
- 声音不响：Windows only，检查 PowerShell 能否正常运行
- macOS 没横幅/没声音：先确认已 `brew install terminal-notifier`；再去 **系统设置 → 通知 → terminal-notifier** 开启通知并设为横幅样式（osascript 的通知会被 Script Editor 权限静默丢弃，故本项目改用 terminal-notifier）
