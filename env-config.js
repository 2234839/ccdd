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
     * 获取 Bark 配置
     */
    getBarkConfig() {
        const key = process.env.BARK_KEY || '';
        return {
            server: process.env.BARK_SERVER || 'https://api.day.app',
            key: key,
            enabled: !!key && !key.includes('your_bark_device_key_here'),
            // 自定义图标（默认 Claude 图标）
            icon: process.env.BARK_ICON || 'https://claude.ai/apple-touch-icon.png',
            // 推送铃声（iOS 预置音效名或 App 里导入的自定义音效名）；留空=Bark 默认
            sound: process.env.BARK_SOUND || '',
            // 通知级别：active / timeSensitive(时效性) / passive
            level: process.env.BARK_LEVEL || 'timeSensitive',
            // 消息分组（默认启用，用项目名分组）
            groupEnabled: process.env.BARK_GROUP_ENABLED !== 'false',
            // 自动保存到通知历史：Stop 默认存、AskUserQuestion 默认不存
            archiveStop: process.env.BARK_ARCHIVE_STOP !== 'false',
            archiveAsk: process.env.BARK_ARCHIVE_ASK === 'true',
            // 重要警告(critical)：off / stop / ask / all，默认 off
            criticalScope: (process.env.BARK_CRITICAL || 'off').toLowerCase(),
            criticalVolume: parseInt(process.env.BARK_CRITICAL_VOLUME || '5', 10),
            // 持续响铃(call,~30s)：off / stop / ask / all，默认 off
            callScope: (process.env.BARK_CALL || 'off').toLowerCase(),
            // 端到端加密（可选）：设了密钥即开启；IV 留空则每次随机生成
            encryptKey: process.env.BARK_ENCRYPT_KEY || '',
            encryptIv: process.env.BARK_ENCRYPT_IV || '',
            encryptMode: (process.env.BARK_ENCRYPT_MODE || 'CBC').toUpperCase()
        };
    }

    /**
     * 获取声音通知配置
     */
    getSoundConfig() {
        return {
            enabled: process.env.SOUND_ENABLED !== 'false',
            file: process.env.SOUND_FILE || '',           // 任务完成(Stop)音效
            fileAsk: process.env.SOUND_FILE_ASK || '',     // Claude 等你(Notification)音效
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
            bark: this.getBarkConfig(),
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