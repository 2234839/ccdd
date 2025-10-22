/**
 * 环境变量配置管理模块
 * 统一处理所有环境变量的加载和配置
 */

const fs = require('fs');
const path = require('path');

/**
 * 环境变量配置类
 */
class EnvConfig {
    constructor() {
        this.loadEnvironmentVariables();
    }

    /**
     * 加载环境变量
     * 根据脚本所在位置加载 .env 文件
     */
    loadEnvironmentVariables() {
        try {
            // 优先加载 notify-system.js 所在目录的 .env 文件
            const envPath = path.join(__dirname, '.env');

            if (fs.existsSync(envPath)) {
                require('dotenv').config({ path: envPath });
                console.log('✅ 环境变量加载成功');
            } else {
                console.log('⚠️  .env 文件不存在，使用系统环境变量');
                require('dotenv').config();
            }
        } catch (error) {
            console.log('❌ 环境变量加载失败:', error.message);
        }
    }

    /**
     * 获取飞书配置
     */
    getFeishuConfig() {
        return {
            webhook_url: process.env.FEISHU_WEBHOOK_URL || '',
            enabled: process.env.FEISHU_WEBHOOK_URL ? true : false
        };
    }

    /**
     * 获取Telegram配置
     */
    getTelegramConfig() {
        return {
            bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
            chat_id: process.env.TELEGRAM_CHAT_ID || '',
            enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
            proxy_url: process.env.HTTPS_PROXY ||
                      process.env.HTTP_PROXY ||
                      process.env.https_proxy ||
                      process.env.http_proxy || ''
        };
    }

    /**
     * 获取声音通知配置
     */
    getSoundConfig() {
        return {
            enabled: process.env.SOUND_ENABLED !== 'false',
            backup: true
        };
    }

    /**
     * 获取通用通知配置
     */
    getNotificationConfig() {
        return {
            enabled: process.env.NOTIFICATION_ENABLED !== 'false'
        };
    }

    /**
     * 获取所有配置
     */
    getAllConfig() {
        return {
            feishu: this.getFeishuConfig(),
            telegram: this.getTelegramConfig(),
            sound: this.getSoundConfig(),
            notification: this.getNotificationConfig()
        };
    }
}

// 导出单例实例
const envConfig = new EnvConfig();

module.exports = {
    EnvConfig,
    envConfig
};