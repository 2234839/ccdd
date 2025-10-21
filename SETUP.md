# 手环震动提醒系统配置指南

## 🎯 功能概述

这个系统会在Claude Code完成任务时发送通知到你的手机，小米手环会震动提醒，让你可以专心玩手机而不用担心错过任务完成。

## 🔧 配置步骤

### 1. 配置飞书Webhook机器人

#### 步骤1：创建飞书群组
1. 打开飞书APP
2. 创建一个新群组（可以只包含你自己）
3. 给群组起个名字，比如"Claude Code通知"

#### 步骤2：添加自定义机器人
1. 进入群组设置
2. 点击"群机器人"
3. 点击"添加机器人"
4. 选择"自定义机器人"
5. 点击"添加"

#### 步骤3：配置机器人
1. 设置机器人名称：Claude Code助手
2. 设置机器人头像（可选）
3. 点击"添加"
4. 复制生成的Webhook地址（格式：`https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx`）

#### 步骤4：更新配置文件
编辑 `config.json` 文件：

```json
{
  "notification": {
    "type": "feishu",
    "feishu": {
      "webhook_url": "https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_ACTUAL_WEBHOOK_URL_HERE",
      "enabled": true
    },
    "sound": {
      "enabled": true,
      "backup": true
    }
  }
}
```

将 `YOUR_ACTUAL_WEBHOOK_URL_HERE` 替换为你刚才复制的实际webhook地址。

### 2. 测试配置

运行以下命令测试配置：

```bash
# 测试基本功能
node notify-system.js

# 测试自定义消息
node notify-system.js --task "测试任务已完成"

# 只测试飞书通知
node feishu-notify.js --webhook "你的webhook地址" --message "测试消息"
```

### 3. 验证手环震动

1. 确保你的小米手环已与手机蓝牙连接
2. 确保飞书APP有通知权限
3. 确保手环APP有通知权限
4. 运行测试命令，检查手环是否震动

## 🎛 高级配置

### 只使用声音提醒
如果你暂时不想配置飞书，可以只使用声音提醒：

```json
{
  "notification": {
    "feishu": {
      "enabled": false
    },
    "sound": {
      "enabled": true,
      "backup": true
    }
  }
}
```

### 只使用飞书通知（静音模式）
如果你不想播放声音：

```json
{
  "notification": {
    "feishu": {
      "enabled": true,
      "webhook_url": "你的webhook地址"
    },
    "sound": {
      "enabled": false
    }
  }
}
```

## 🐛 故障排除

### 飞书通知不生效
1. 检查webhook地址是否正确
2. 检查网络连接
3. 查看飞书群组是否收到了消息
4. 检查config.json文件格式是否正确

### 手环不震动
1. 检查手环与手机的蓝牙连接
2. 检查手机通知权限设置
3. 检查手环APP的通知权限
4. 确保飞书APP没有被设置为"免打扰"模式

### 声音不播放
1. 检查电脑音量设置
2. 确保PowerShell可以正常执行
3. 检查Windows语音功能是否正常

## 📱 通知效果

配置完成后，当Claude Code完成任务时：

1. **飞书通知**：手机会收到飞书消息通知
2. **手环震动**：小米手环会震动提醒
3. **声音提醒**：电脑会播放"任务完成，已发送手机通知"

这样你就可以专心玩手机，不用担心错过任务完成了！

## 🔒 安全提醒

- 不要将你的webhook地址分享给他人
- 定期更换机器人webhook地址以确保安全
- 如果webhook地址泄露，可以在飞书中重新生成