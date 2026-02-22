# 配置指南

## 飞书 Webhook 配置

1. 飞书中创建群组（可以只有你自己）
2. 群设置 → 群机器人 → 添加自定义机器人
3. 复制 webhook 地址

```bash
cp .env.example .env
# 编辑 .env，填入 FEISHU_WEBHOOK_URL
```

或运行 `node setup-wizard.js`

测试：`node notify-system.js --message "测试"`

## Claude Code Hooks

编辑 `~/.claude/settings.json`：

```json
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "node /path/to/ccdd/notify-system.js" }] }],
    "Notification": [{ "hooks": [{ "type": "command", "command": "node /path/to/ccdd/notify-system.js" }] }]
  }
}
```

## 终端名识别

### tmux（推荐）
```bash
tmux new -s work -n "feature-x"
# 通知显示: "feature-x，任务完成"
```

### iTerm2 / Terminal.app
自动通过 AppleScript 读取标签名。

### 手动
```bash
export TERMINAL_NAME="my-session"
```

## 故障排除

- **飞书不生效**：检查 `.env` 中 webhook 地址，运行 `node feishu-notify.js --message "测试"` 单独测试
- **声音不播放**：macOS 检查音量和 `/System/Library/Sounds/Glass.aiff`；Windows 检查 PowerShell
- **手环不震动**：检查蓝牙连接、飞书通知权限、手环 APP 通知权限
