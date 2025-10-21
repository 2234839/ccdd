/**
 * Claude Code 任务完成通知系统
 * 集成声音提醒和飞书推送，支持手环震动
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { envConfig } = require('./env-config');
const { NotificationManager } = require('./notification-manager');

/**
 * 通知系统管理器
 */
class NotificationSystem {
    constructor() {
        this.config = this.loadConfig();
        this.projectName = this.getProjectName();
        this.notificationManager = new NotificationManager(this.config, this.projectName);
    }

    /**
     * 加载配置文件
     */
    loadConfig() {
        try {
            const configPath = path.join(__dirname, 'config.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);

            // 从环境变量配置覆盖配置文件
            const envVars = envConfig.getAllConfig();

            // 飞书配置
            if (envVars.feishu.webhook_url) {
                config.notification.feishu.webhook_url = envVars.feishu.webhook_url;
                config.notification.feishu.enabled = true;
            }

            // Telegram配置
            if (envVars.telegram.enabled) {
                config.notification.telegram = {
                    ...config.notification.telegram,
                    ...envVars.telegram,
                    enabled: true
                };
            }

            // 声音配置
            if (process.env.SOUND_ENABLED !== undefined) {
                config.notification.sound.enabled = envVars.sound.enabled;
            }

            return config;
        } catch (error) {
            console.log('⚠️  无法加载配置文件，使用环境变量配置');
            const envVars = envConfig.getAllConfig();
            return {
                notification: {
                    type: envVars.feishu.enabled ? 'feishu' : 'sound',
                    feishu: envVars.feishu,
                    telegram: envVars.telegram,
                    sound: envVars.sound
                }
            };
        }
    }

    /**
     * 获取项目名称
     * 优先级: package.json > git仓库名 > 目录名
     */
    getProjectName() {
        try {
            // 1. 尝试从当前工作目录的 package.json 获取项目名称
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageData.name) {
                    console.log(`📦 从 package.json 检测到项目名称: ${packageData.name}`);
                    return packageData.name;
                }
            }

            // 2. 尝试从 git 仓库名获取
            const { execSync } = require('child_process');
            try {
                const gitRemote = execSync('git remote get-url origin', {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).trim();
                // 从 git URL 提取仓库名
                const matches = gitRemote.match(/\/([^\/]+)\.git$/);
                if (matches && matches[1]) {
                    console.log(`🔧 从 git 仓库检测到项目名称: ${matches[1]}`);
                    return matches[1];
                }
            } catch (gitError) {
                // git 命令失败，继续下一步
            }

            // 3. 从当前目录名获取
            const dirName = path.basename(process.cwd());
            console.log(`📁 从目录名检测到项目名称: ${dirName}`);
            return dirName;

        } catch (error) {
            console.log('⚠️  无法获取项目名称，使用默认值');
            return '未知项目';
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

        return await sendFeishuNotification(taskInfo, webhookUrl, this.projectName);
    }

    /**
     * 发送所有类型的通知
     */
    async sendAllNotifications(taskInfo = "Claude Code任务已完成") {
        const icons = this.notificationManager.getEnabledNotificationIcons();
        console.log(`🚀 开始发送任务完成通知... ${icons}`);
        console.log(`📁 项目名称：${this.projectName}`);
        console.log(`📝 任务信息：${taskInfo}`);

        // 发送所有通知
        const results = await this.notificationManager.sendAllNotifications(taskInfo);

        // 添加声音通知
        if (this.config.notification.sound.enabled) {
            this.sendSoundNotification();
            setTimeout(() => {
                console.log('🔊 声音提醒已播放');
            }, 1000);
        }

        // 打印结果汇总
        this.notificationManager.printNotificationSummary(results);

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