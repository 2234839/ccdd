# CCDD — Claude Code 叮叮

Claude Code 任务完成通知系统。飞书推送 + macOS 音效 + 终端名识别，让你离开键盘也不会错过任务状态。

## 功能

- **飞书推送** — 任务完成/需要输入时发送飞书消息，手环震动提醒
- **macOS 系统音效** — 不同事件播放不同音效 (Glass/Sosumi/Tink/Ping/Pop) + 中文 TTS
- **Windows 支持** — PowerShell TTS + Beep，其他平台 terminal bell
- **终端名识别** — 自动读取 tmux 窗口名 / iTerm2 标签名，通知带上终端标识
- **智能摘要** — 自动提取最后一条用户消息作为任务描述
- **Hook 集成** — 通过 Claude Code hooks 自动触发，支持 Stop / Notification 事件

## 快速开始

```bash
# 1. 克隆
git clone https://github.com/2234839/ccdd.git ~/.claude/ccdd
cd ~/.claude/ccdd && npm install

# 2. 配置飞书 webhook
cp .env.example .env
# 编辑 .env，填入你的 FEISHU_WEBHOOK_URL

# 3. 配置 Claude Code hooks — 编辑 ~/.claude/settings.json
```

在 `~/.claude/settings.json` 中添加：

```json
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "node ~/.claude/ccdd/notify-system.js" }] }],
    "Notification": [{ "hooks": [{ "type": "command", "command": "node ~/.claude/ccdd/notify-system.js" }] }]
  }
}
```

```bash
# 4. 测试
node notify-sound.js --event Stop        # Glass 音效 + "任务完成"
node notify-system.js --message "测试"    # 飞书 + 声音
```

## 终端名识别

通知自动带上终端名前缀，方便区分多个会话。

| 方式 | 检测方法 | 示例 |
|------|---------|------|
| **tmux** (推荐) | 自动读取窗口名 | `ourai，任务完成` |
| **iTerm2** | AppleScript | `debug，任务完成` |
| **Terminal.app** | AppleScript | `deploy，任务完成` |
| **环境变量** | `export TERMINAL_NAME="xxx"` | `xxx，任务完成` |

## 事件音效映射 (macOS)

| 事件 | 音效 | TTS |
|------|------|-----|
| Stop | Glass | 任务完成 |
| permission_prompt | Sosumi | 需要权限确认 |
| idle_prompt | Tink | 等待你的输入 |
| elicitation_dialog | Ping | 需要输入信息 |
| SubagentStop | Pop | 子任务完成 |

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `FEISHU_WEBHOOK_URL` | 飞书 webhook 地址 | 必填 |
| `NOTIFICATION_ENABLED` | 启用飞书通知 | `true` |
| `SOUND_ENABLED` | 启用声音提醒 | `true` |
| `TERMINAL_NAME` | 手动指定终端名 | 自动检测 |

详细配置请查看 [SETUP.md](./SETUP.md)

## License

MIT
