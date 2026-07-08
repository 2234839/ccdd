/**
 * 通知管理器
 * 统一管理各种通知方式
 */

const { FeishuNotifier } = require('./feishu-notify');
const { TelegramNotifier } = require('./telegram-notify');
const { BarkNotifier } = require('./bark-notify');

/**
 * 通知管理器类
 */
class NotificationManager {
    constructor(config, projectName) {
        this.config = config;
        this.projectName = projectName;
        this.notifiers = this.initializeNotifiers();
    }

    /**
     * 初始化各种通知器
     */
    initializeNotifiers() {
        const notifiers = {};

        // 飞书通知器
        if (this.config.notification.feishu.enabled) {
            notifiers.feishu = {
                enabled: true,
                notifier: new FeishuNotifier(this.config.notification.feishu.webhook_url),
                send: async (taskInfo) => {
                    const { notifyTaskCompletion } = require('./feishu-notify');
                    return await notifyTaskCompletion(taskInfo, this.config.notification.feishu.webhook_url, this.projectName);
                }
            };
        }

        // Telegram通知器
        if (this.config.notification.telegram && this.config.notification.telegram.enabled) {
            notifiers.telegram = {
                enabled: true,
                notifier: new TelegramNotifier(),
                send: async (taskInfo) => {
                    const { notifyTaskCompletion } = require('./telegram-notify');
                    return await notifyTaskCompletion(taskInfo, this.projectName);
                }
            };
        }

        // Bark通知器
        if (this.config.notification.bark && this.config.notification.bark.enabled) {
            notifiers.bark = {
                enabled: true,
                notifier: new BarkNotifier(this.config.notification.bark),
                send: async (taskInfo) => {
                    const { notifyTaskCompletion } = require('./bark-notify');
                    return await notifyTaskCompletion(taskInfo, this.config.notification.bark, this.projectName);
                }
            };
        }

        return notifiers;
    }

    /**
     * 发送所有启用的通知
     */
    async sendAllNotifications(taskInfo) {
        const notifications = [];
        const results = [];

        // 发送各种通知
        for (const [type, notifierConfig] of Object.entries(this.notifiers)) {
            if (notifierConfig.enabled) {
                notifications.push(
                    this.sendSingleNotification(type, notifierConfig, taskInfo)
                );
            }
        }

        // 等待所有通知完成
        if (notifications.length > 0) {
            const notificationResults = await Promise.allSettled(notifications);
            results.push(...notificationResults);
        }

        return results;
    }

    /**
     * 发送单个通知
     */
    async sendSingleNotification(type, notifierConfig, taskInfo) {
        try {
            const success = await notifierConfig.send(taskInfo);
            const typeName = this.getTypeName(type);
            console.log(success ? `✅ ${typeName}发送成功` : `❌ ${typeName}发送失败`);
            return { type, success };
        } catch (error) {
            const typeName = this.getTypeName(type);
            console.log(`❌ ${typeName}发送失败:`, error.message);
            return { type, success: false, error: error.message };
        }
    }

    /**
     * 获取通知类型的中文名称
     */
    getTypeName(type) {
        const typeNames = {
            feishu: '飞书通知',
            telegram: 'Telegram通知',
            bark: 'Bark 通知',
            sound: '声音提醒'
        };
        return typeNames[type] || type;
    }

    /**
     * 打印通知结果汇总
     */
    printNotificationSummary(results) {
        console.log('');
        console.log('📊 通知发送结果汇总：');

        // 显示各种通知的结果
        Object.keys(this.notifiers).forEach((type, index) => {
            const typeName = this.getTypeName(type);
            const result = results[index];
            const status = result && result.value && result.value.success ? '✅ 成功' : '❌ 失败';
            const icon = type === 'feishu' ? '📱' : type === 'telegram' ? '📲' : type === 'bark' ? '📲' : '🔊';
            console.log(`  ${icon} ${typeName}：${status}`);
        });

        console.log('');
        console.log('🎯 提醒效果：');
        if (this.notifiers.feishu) {
            console.log('  📱 手机将收到飞书通知');
            console.log('  ⌚ 小米手环会震动提醒');
        }
        if (this.notifiers.telegram) {
            console.log('  📲 Telegram将收到推送通知');
        }
        if (this.notifiers.bark) {
            console.log('  📱 iPhone 将收到 Bark 推送通知');
        }
        console.log('');
    }

    /**
     * 获取启用通知的图标列表
     */
    getEnabledNotificationIcons() {
        const icons = [];
        if (this.notifiers.feishu) icons.push('📱');
        if (this.notifiers.telegram) icons.push('📲');
        if (this.notifiers.bark) icons.push('📲');
        return icons.join(' ');
    }
}

module.exports = {
    NotificationManager
};