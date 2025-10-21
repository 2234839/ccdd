/**
 * Claude Code 任务完成通知系统
 * 集成声音提醒和飞书推送，支持手环震动
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { notifyTaskCompletion: sendFeishuNotification } = require('./feishu-notify');

/**
 * 通知系统管理器
 */
class NotificationSystem {
    constructor() {
        this.config = this.loadConfig();
    }

    /**
     * 加载配置文件
     */
    loadConfig() {
        try {
            const configPath = path.join(__dirname, 'config.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);

            // 从环境变量覆盖配置
            if (process.env.FEISHU_WEBHOOK_URL) {
                config.notification.feishu.webhook_url = process.env.FEISHU_WEBHOOK_URL;
                config.notification.feishu.enabled = true;
            }

            if (process.env.NOTIFICATION_ENABLED !== undefined) {
                config.notification.feishu.enabled = process.env.NOTIFICATION_ENABLED === 'true';
            }

            if (process.env.SOUND_ENABLED !== undefined) {
                config.notification.sound.enabled = process.env.SOUND_ENABLED === 'true';
            }

            return config;
        } catch (error) {
            console.log('⚠️  无法加载配置文件，使用环境变量配置');
            return {
                notification: {
                    type: process.env.FEISHU_WEBHOOK_URL ? 'feishu' : 'sound',
                    feishu: {
                        enabled: !!process.env.FEISHU_WEBHOOK_URL,
                        webhook_url: process.env.FEISHU_WEBHOOK_URL || ''
                    },
                    sound: {
                        enabled: process.env.SOUND_ENABLED !== 'false',
                        backup: true
                    }
                }
            };
        }
    }

    /**
     * 播放Windows系统声音
     */
    playWindowsSound() {
        const psScript = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak("任务完成，已发送手机通知"); [console]::Beep(800, 300)`;

        return spawn('powershell', ['-Command', psScript], {
            stdio: 'ignore',
            shell: false
        });
    }

    /**
     * 播放蜂鸣声作为备用方案
     */
    playBeep() {
        const psScript = '[console]::Beep(800, 500)';
        return spawn('powershell', ['-Command', psScript], {
            stdio: 'ignore',
            shell: false
        });
    }

    /**
     * 发送声音提醒
     */
    async sendSoundNotification() {
        if (!this.config.notification.sound.enabled) {
            return;
        }

        console.log('🔊 播放声音提醒...');

        try {
            const soundProcess = this.playWindowsSound();

            soundProcess.on('error', (error) => {
                if (this.config.notification.sound.backup) {
                    console.log('声音播放失败，使用蜂鸣声');
                    this.playBeep();
                }
            });

            soundProcess.on('close', (code) => {
                if (code !== 0 && this.config.notification.sound.backup) {
                    console.log('声音播放异常，使用蜂鸣声');
                    this.playBeep();
                }
            });

        } catch (error) {
            if (this.config.notification.sound.backup) {
                console.log('播放声音时发生错误，使用蜂鸣声');
                this.playBeep();
            }
        }
    }

    /**
     * 发送飞书通知
     */
    async sendFeishuNotification(taskInfo) {
        if (!this.config.notification.feishu.enabled) {
            console.log('📱 飞书通知已禁用');
            return false;
        }

        const webhookUrl = this.config.notification.feishu.webhook_url;

        if (!webhookUrl || webhookUrl.includes('YOUR_WEBHOOK_URL_HERE')) {
            console.log('⚠️  请先配置飞书webhook地址');
            this.printFeishuSetupGuide();
            return false;
        }

        return await sendFeishuNotification(taskInfo, webhookUrl);
    }

    /**
     * 打印飞书配置指南
     */
    printFeishuSetupGuide() {
        console.log('');
        console.log('📋 飞书Webhook配置指南：');
        console.log('1. 在飞书中创建一个群组（可以只包含你自己）');
        console.log('2. 进入群组设置 > 群机器人 > 添加机器人');
        console.log('3. 选择"自定义机器人"');
        console.log('4. 设置机器人名称和头像');
        console.log('5. 复制生成的Webhook地址');
        console.log('6. 编辑 config.json 文件，将webhook地址填入 feishu.webhook_url');
        console.log('7. 将 feishu.enabled 设置为 true');
        console.log('');
    }

    /**
     * 发送所有类型的通知
     */
    async sendAllNotifications(taskInfo = "Claude Code任务已完成") {
        console.log('🚀 开始发送任务完成通知...');
        console.log(`📝 任务信息：${taskInfo}`);

        // 并行发送所有通知
        const notifications = [];

        // 发送飞书通知
        if (this.config.notification.feishu.enabled) {
            notifications.push(
                this.sendFeishuNotification(taskInfo).then(success => {
                    console.log(success ? '✅ 飞书通知发送成功' : '❌ 飞书通知发送失败');
                    return success;
                })
            );
        }

        // 发送声音通知
        if (this.config.notification.sound.enabled) {
            notifications.push(
                new Promise(resolve => {
                    this.sendSoundNotification();
                    setTimeout(() => {
                        console.log('🔊 声音提醒已播放');
                        resolve(true);
                    }, 1000);
                })
            );
        }

        // 等待所有通知完成
        const results = await Promise.allSettled(notifications);

        console.log('');
        console.log('📊 通知发送结果汇总：');
        results.forEach((result, index) => {
            const status = result.status === 'fulfilled' ? '✅ 成功' : '❌ 失败';
            const type = this.config.notification.feishu.enabled && index === 0 ? '飞书通知' : '声音提醒';
            console.log(`  ${type}：${status}`);
        });

        console.log('');
        console.log('🎯 提醒效果：');
        if (this.config.notification.feishu.enabled) {
            console.log('  📱 手机将收到飞书通知');
            console.log('  ⌚ 小米手环会震动提醒');
        }
        if (this.config.notification.sound.enabled) {
            console.log('  🔊 电脑会播放语音提醒');
        }
        console.log('');

        // 3秒后退出
        setTimeout(() => {
            console.log('✨ 通知系统执行完成，程序退出');
            process.exit(0);
        }, 3000);
    }
}

/**
 * 获取命令行参数
 */
function getCommandLineArgs() {
    const args = process.argv.slice(2);
    const options = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
            options[key] = value;
            if (value !== true) i++;
        }
    }

    return options;
}

// 如果直接运行此脚本
if (require.main === module) {
    const options = getCommandLineArgs();
    const taskInfo = options.message || options.task || "Claude Code任务已完成";

    const notifier = new NotificationSystem();
    notifier.sendAllNotifications(taskInfo);
}

module.exports = {
    NotificationSystem
};