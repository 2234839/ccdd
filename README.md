# ccdd - Claude Code 任务完成提醒

Claude Code 完成任务时自动发通知到手机/手环，你不用一直盯着屏幕等。

支持飞书 Webhook、Telegram Bot、macOS 原生通知、Windows 声音提醒。

## 一句话配置

复制下面这段发给你的 AI 编程助手，它会帮你搞定：

> 帮我配置 Claude Code 任务完成通知：clone https://github.com/2234839/ccdd 这个仓库，用 pnpm 安装依赖，然后帮我配置 .env 文件（我需要飞书通知，请向我要 Webhook 地址），最后在 ~/.claude/settings.json 中配置 Stop hook 调用 notify-system.js。参考项目 README.md。

## 手动配置

如果喜欢自己搞：

```bash
pnpm install
cp .env.example .env
# 编辑 .env，填入 FEISHU_WEBHOOK_URL
node notify-system.js --task "测试通知"
```

飞书 Webhook 获取：群设置 → 群机器人 → 添加自定义机器人 → 复制地址。

**macOS 原生通知**（弹横幅+提示音，默认开启，无需 webhook）需先安装一次：

```bash
brew install terminal-notifier
```

配置 Claude Code Hook，在 `~/.claude/settings.json` 中添加：

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "node /your_path/ccdd/notify-system.js"
      }]
    }],
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "node /your_path/ccdd/notify-system.js"
          }
        ]
      },
      {
        "matcher": "agent_needs_input",
        "hooks": [
          {
            "type": "command",
            "command": "node /your_path/ccdd/notify-system.js"
          }
        ]
      }
    ]
  }
}
```

不传 `--message` 时，会自动从 Claude 的上下文中提取最后一条消息作为通知内容。

更多细节见 [SETUP.md](./SETUP.md)。

## Codex CLI 任务完成提醒

在 `~/.codex/config.toml` 末尾添加：

```toml
# Codex 回答结束通知：复用 ccdd 通知系统（与 Claude Code Stop hook 一致）
[[hooks.Stop]]
[[hooks.Stop.hooks]]
type = "command"
command = "node /Users/thread0_japheth/Code/ccdd/notify-system.js"
async = true
```

- `Stop` 在 Codex 每轮回答结束时触发，与 Claude Code 的 `Stop` hook 行为一致；
- 不传 `--message` 时自动从 Codex 传入的 `last_assistant_message` 提取通知内容，取不到则回退为「任务完成」；
- `async = true` 让通知在后台执行，不阻塞 Codex 继续输入；
- 配置后首次运行 `codex`，在 TUI 里执行 `/hooks` 审查并信任该 hook，否则不会执行。

### 请求授权提醒

Codex 等待你授权执行命令时也会通知（对应 Claude Code 的 `Notification`/`permission_prompt`），继续在 `~/.codex/config.toml` 末尾追加：

```toml
# Codex 请求授权通知
[[hooks.PermissionRequest]]
[[hooks.PermissionRequest.hooks]]
type = "command"
command = "node /Users/thread0_japheth/Code/ccdd/notify-system.js"
async = true
```

- 通知内容自动带上待执行的命令或授权原因（`tool_input.description` 优先，取不到则用 `tool_input.command`）；
- hook 只通知、不返回决策，不影响正常审批流程；
- 同样需要 `/hooks` 信任后生效。
