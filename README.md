# Claude Code 任务完成提醒系统 (支持手环震动)

这是一个智能提醒系统，用于在Claude Code完成任务时通过多种方式提醒你，支持手机通知和手环震动，让你可以专心玩手机而不用频繁检查任务状态。

## 🎯 功能特点

- ✅ **飞书通知推送**：任务完成时自动发送飞书消息到手机
- ✅ **手环震动提醒**：小米手环等智能穿戴设备会震动提醒
- ✅ **语音声音提醒**：电脑播放"任务完成，已发送手机通知"
- ✅ **双重提醒保障**：声音 + 手机推送，确保不会错过
- ✅ **Windows系统优化**：完美支持Windows 10/11
- ✅ **配置灵活**：可自由开关各种提醒方式
- ✅ **安全可靠**：使用官方API，安全稳定

## 📁 项目结构

```
ccdd/
├── notify-system.js        # 主通知系统（集成所有功能）
├── feishu-notify.js        # 飞书通知模块
├── notify-sound.js         # 声音提醒模块
├── setup-wizard.js         # 一键配置向导
├── .env                    # 环境变量配置（包含敏感信息，已git忽略）
├── .env.example           # 环境变量模板文件
├── .gitignore             # Git忽略文件配置
├── config.json            # 传统配置文件（可选）
├── package.json           # NPM项目配置
├── test-project/          # 测试项目
│   └── package.json
├── README.md              # 项目说明文档
├── SETUP.md               # 详细配置指南
└── task-completion-log.jsonl  # 任务日志
```

## 🛠 安装和配置

### ⚡ 快速开始（推荐方式）

#### 方法1：使用配置向导 🧙‍♂️（推荐）
```bash
node setup-wizard.js
```
向导会自动帮你配置所有设置，包括安全存储webhook地址。

#### 方法2：手动配置 📝
1. 复制 `.env.example` 为 `.env`
2. 在飞书中创建群组，添加自定义机器人，复制webhook地址
3. 编辑 `.env` 文件，替换 `FEISHU_WEBHOOK_URL` 为你的实际地址

详细步骤请查看 [SETUP.md](./SETUP.md)

#### 步骤2：验证配置 ✅
```bash
# 测试完整通知系统
node notify-system.js --task "测试手环震动提醒"
```

#### 步骤3：重启Claude Code 🔄
重启Claude Code使配置生效，然后正常使用即可！

### 📋 配置说明

#### 环境变量配置（推荐方式）
`.env` 文件支持以下配置：

```bash
# 飞书Webhook地址
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/你的地址

# 通知开关
NOTIFICATION_ENABLED=true    # 是否启用飞书通知
SOUND_ENABLED=true          # 是否启用声音提醒
```

#### 配置文件方式（可选）
`config.json` 仍然支持传统配置方式，环境变量会覆盖配置文件设置。

### 🔧 Claude Code Hook配置

Hook已自动配置在 `C:\Users\22348\.claude\settings.json` 中：
```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "node D:/code/code/ccdd/notify-system.js"
      }]
    }]
  }
}
```

## 🎯 使用效果

配置完成后，当Claude Code完成任务时：

1. **📱 手机通知**：飞书APP会收到任务完成消息
2. **⌚ 手环震动**：小米手环等智能设备会震动提醒
3. **🔊 语音提醒**：电脑播放"任务完成，已发送手机通知"

这样你就可以专心玩手机，当任务完成时通过手环震动就能知道！

## 🧪 测试功能

### 测试完整通知系统
```bash
node notify-system.js --task "测试任务"
```

### 只测试飞书通知
```bash
node feishu-notify.js --webhook "你的webhook地址" --message "测试消息"
```

### 只测试声音提醒
```bash
node notify-sound.js
```

### 测试Claude Code集成
```bash
cd test-project
npm run test
```

## 🔧 技术实现

### 架构设计
- **模块化设计**：分离飞书通知、声音提醒、配置管理
- **异步处理**：并行发送多种通知，提高响应速度
- **容错机制**：单一通知失败不影响其他通知方式
- **环境变量优先**：支持.env安全配置，保护敏感信息

### 安全特性
- 🔒 **环境变量保护**：webhook地址存储在.env文件中，已加入.gitignore
- 🔐 **配置隔离**：敏感配置与代码分离，防止意外泄露
- 🛡️ **模板化配置**：提供.env.example模板，便于团队协作

### 核心模块
- **notify-system.js**：主通知系统，协调所有提醒方式
- **feishu-notify.js**：飞书API调用模块，支持富文本消息
- **notify-sound.js**：Windows声音合成模块
- **config.json**：灵活的配置管理

### Hook集成
- 使用Claude Code的Stop hook，在任务完成时自动触发
- 不影响正常的任务执行流程
- 支持命令行参数自定义任务信息

## 📈 产品路线图

### 近期计划 (v1.2)
- [ ] 支持更多通知平台（微信、钉钉、企业微信）
- [ ] 添加任务执行时间统计
- [ ] 支持自定义通知模板
- [ ] 开发可视化配置界面

### 中期计划 (v2.0)
- [ ] 开发Claude Code官方插件
- [ ] 支持跨平台（macOS、Linux）
- [ ] 添加任务进度实时推送
- [ ] 支持群组协作通知

### 长期愿景
- [ ] 智能任务调度和优先级管理
- [ ] 集成更多智能穿戴设备
- [ ] 开发移动端APP
- [ ] 支持多AI平台集成

## 🏆 参赛亮点

### 解决的实际问题
1. **专注度提升**：开发者可以专心做其他事情，不用频繁检查任务状态
2. **效率优化**：及时获知任务完成，提高工作流程效率
3. **体验改善**：通过手环震动等私密提醒，不打扰他人

### 技术创新点
1. **多通道通知**：声音 + 手机推送 + 手环震动的立体提醒体系
2. **智能集成**：与Claude Code深度集成，自动触发通知
3. **模块化架构**：高度可扩展，支持多种通知方式
4. **用户友好**：配置简单，一键启用

### 商业价值
- **B2C市场**：面向个人开发者的小工具产品
- **B2B市场**：面向开发团队的协作效率工具
- **生态价值**：丰富AI编程工具生态，提升用户体验

## 🎯 完整使用流程

```mermaid
graph TD
    A[用户向Claude Code下达任务] --> B[Claude Code执行任务]
    B --> C[用户专心玩手机/做其他事]
    B --> D[任务执行完成]
    D --> E[触发Stop Hook]
    E --> F[调用notify-system.js]
    F --> G[并行发送通知]
    G --> H[📱 飞书消息推送到手机]
    G --> I[🔊 电脑播放语音提醒]
    H --> J[⌚ 手环震动提醒]
    I --> K[用户听到语音提醒]
    J --> L[用户感到手环震动]
    K --> M[查看任务结果]
    L --> M
```

现在你只需要配置好飞书webhook，就能享受这个强大的提醒系统了！详细配置请查看 [SETUP.md](./SETUP.md)。

---

**让AI编程更专注，让开发更高效！** 🚀