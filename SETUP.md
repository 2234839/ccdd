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

## Bark 通知配置（iOS）

1. iPhone 安装 Bark App，打开首页复制「设备 key」（如 `https://api.day.app/AbCd1234.../` 里的 `AbCd1234...`）
2. 填入 `.env`：

```bash
BARK_KEY=你的设备key
BARK_SERVER=https://api.day.app
```

`BARK_SERVER` 默认官方服务器，自建 Bark 服务器时才需要改。测试：`node notify-system.js --task "测试"`。

### Bark 扩展功能（可选）

都在 `.env` 里配置，按事件（Stop=任务完成 / ask=Claude 等你）区分：

| 变量 | 作用 | 默认 |
|------|------|------|
| `BARK_ICON` | 通知图标 URL | Claude 图标 |
| `BARK_SOUND` | iPhone 铃声：iOS 预置音效名或 App 导入的自定义音效名（预置名列表见 `.env.example`） | 空=Bark 默认 |
| `BARK_LEVEL` | `active`/`timeSensitive`(时效性)/`passive` | `timeSensitive` |
| `BARK_GROUP_ENABLED` | 用项目名分组 | `true` |
| `BARK_ARCHIVE_STOP` / `BARK_ARCHIVE_ASK` | 存进通知历史 | Stop 存 / ask 不存 |
| `BARK_CRITICAL` | 重要警告(静音也响)：`off`/`stop`/`ask`/`all` | `off` |
| `BARK_CRITICAL_VOLUME` | 重要警告音量 0~10 | `5` |
| `BARK_CALL` | 持续响铃~30秒：`off`/`stop`/`ask`/`all` | `off` |
| `BARK_ENCRYPT_KEY` | 端到端加密密钥(16/24/32 位)，需与 App「推送加密」一致 | 空=不加密 |
| `BARK_ENCRYPT_IV` | 固定 IV(16 位)；固定 IV 会让相同前缀消息密文前缀相同(中继可关联)，追求隐私建议留空用随机 | 空=随机(推荐) |
| `BARK_ENCRYPT_MODE` | 加密模式 `CBC`/`ECB` | `CBC` |

> 加密：在 Bark App「设置 → 推送加密」里选相同算法/模式并填同一密钥，服务器就只转发密文、看不到内容。

## 声音提醒

默认开启，仅支持 Windows。不需要的话设 `SOUND_ENABLED=false`。

想换音效：在 `.env` 里设音效路径，留空则用默认 Windows 通知音。**支持 `.wav` 和 `.mp3`**（`.wav` 走 SoundPlayer，`.mp3`/`.m4a`/`.wma` 走 MediaPlayer）。可给两类事件分别配音效：

```bash
SOUND_FILE=C:\Windows\Media\tada.wav             # 任务完成(Stop hook)
SOUND_FILE_ASK=C:\Windows\Media\chimes.wav  # Claude 问你/等你(Notification hook)
```

`SOUND_FILE_ASK` 留空则回退到 `SOUND_FILE`。系统自带音效在 `C:\Windows\Media\`（如 `tada.wav`、`chimes.wav`），也可填任意 wav/mp3（建议短音效，1~3 秒）。

hook 命令里 `--event ask` 表示这是「等你」事件；`--sound <路径>` 可临时覆盖音效。（原来的机器人语音已换成音效播放。）

## 故障排除

- 飞书收不到：检查 webhook 地址是否完整复制了
- 手环不震：确认飞书通知权限开着，手环和手机蓝牙连着
- 声音不响：Windows only，检查 PowerShell 能否正常运行
