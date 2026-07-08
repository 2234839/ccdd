# ccdd - Claude Code 任务完成提醒

Claude Code 完成任务时自动发通知到手机/手环，你不用一直盯着屏幕等。

支持飞书 Webhook、Telegram Bot、Bark（iOS 推送）、Windows 声音提醒。

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

配置 Claude Code Hook，在 `~/.claude/settings.json` 中添加：

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "node /你的路径/ccdd/notify-system.js"
      }]
    }]
  }
}
```

不传 `--message` 时，会自动从 Claude 的上下文中提取最后一条消息作为通知内容。

更多细节见 [SETUP.md](./SETUP.md)。
