/**
 * Bark 通知脚本 - iOS 推送提醒版
 * 通过 Bark 服务器（默认 https://api.day.app）推送消息到 iPhone
 * 扩展能力：自定义图标、时效性/重要警告级别、消息分组、通知历史归档、持续响铃、端到端加密
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const crypto = require('crypto');

/**
 * 根据已解析的 Bark 配置构建推送 payload
 * @param {string} title  标题
 * @param {string} body   内容
 * @param {Object} cfg    已按事件解析好的 Bark 配置
 * @param {string} projectName 项目名（用于消息分组）
 */
function buildBarkPayload(title, body, cfg = {}, projectName = '') {
    // critical(重要警告) 优先级高于普通 level
    const level = cfg.critical ? 'critical' : (cfg.level || 'active');
    const payload = { title, body, level };

    if (cfg.icon) payload.icon = cfg.icon;                       // 自定义图标
    if (cfg.sound) payload.sound = cfg.sound;                    // 推送铃声(iOS 预置/自定义音效名)
    if (level === 'critical') {                                  // 重要警告音量 0~10
        const v = cfg.criticalVolume;
        payload.volume = (v === undefined || v === null || Number.isNaN(v)) ? 5 : v;
    }
    if (cfg.groupEnabled && projectName) payload.group = projectName; // 消息分组=项目名
    if (cfg.isArchive === '1' || cfg.isArchive === '0') payload.isArchive = cfg.isArchive; // 归档
    if (cfg.call) payload.call = '1';                            // 持续响铃(~30s)

    return payload;
}

/**
 * AES 加密 payload（Bark 端到端加密，服务器只转发密文）
 * 密钥长度决定 AES-128/192/256；需与 Bark App「推送加密」里的算法/密钥一致
 * @returns {{ciphertext:string, iv:(string|null)}}
 */
function encryptPayload(plaintext, key, mode = 'CBC', fixedIv = '') {
    const keyBuf = Buffer.from(key, 'utf8');
    const bits = keyBuf.length * 8;
    if (![128, 192, 256].includes(bits)) {
        throw new Error(`BARK_ENCRYPT_KEY 长度必须是 16/24/32 字符，当前 ${keyBuf.length} 字符`);
    }
    const m = (mode || 'CBC').toUpperCase();
    if (m === 'CBC') {
        // 固定 IV(BARK_ENCRYPT_IV) 优先，否则每次随机生成；两种都会放进 iv 参数一起发
        const iv = fixedIv || crypto.randomBytes(8).toString('hex'); // 16 个 ASCII 字符
        if (Buffer.byteLength(iv, 'utf8') !== 16) {
            throw new Error(`BARK_ENCRYPT_IV 必须是 16 字符，当前 ${Buffer.byteLength(iv, 'utf8')} 字符`);
        }
        const cipher = crypto.createCipheriv(`aes-${bits}-cbc`, keyBuf, Buffer.from(iv, 'utf8'));
        let ct = cipher.update(plaintext, 'utf8', 'base64');
        ct += cipher.final('base64');
        return { ciphertext: ct, iv };
    }
    if (m === 'ECB') {
        const cipher = crypto.createCipheriv(`aes-${bits}-ecb`, keyBuf, null);
        let ct = cipher.update(plaintext, 'utf8', 'base64');
        ct += cipher.final('base64');
        return { ciphertext: ct, iv: null };
    }
    throw new Error(`暂不支持的加密模式: ${m}（本脚本支持 CBC / ECB）`);
}

/**
 * Bark 推送通知类
 */
class BarkNotifier {
    /**
     * @param {Object} cfg 已解析的 Bark 配置（含 key/server/encryptKey 等）
     */
    constructor(cfg = {}) {
        this.cfg = cfg || {};
        this.deviceKey = this.cfg.key || '';
        this.server = (this.cfg.server || 'https://api.day.app').replace(/\/+$/, '');
    }

    /**
     * 发送 payload（配置了 encryptKey 则自动加密）
     * @returns {Promise<boolean>}
     */
    async send(payload) {
        if (this.cfg.encryptKey) {
            const { ciphertext, iv } = encryptPayload(
                JSON.stringify(payload), this.cfg.encryptKey, this.cfg.encryptMode, this.cfg.encryptIv
            );
            let form = 'ciphertext=' + encodeURIComponent(ciphertext);
            if (iv) form += '&iv=' + encodeURIComponent(iv);
            return this._request(form, 'application/x-www-form-urlencoded');
        }
        return this._request(JSON.stringify(payload), 'application/json; charset=utf-8');
    }

    /**
     * 发送 HTTP 请求到 Bark：POST ${server}/${deviceKey}
     */
    _request(data, contentType) {
        return new Promise((resolve) => {
            const url = new URL(`${this.server}/${this.deviceKey}`);
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': Buffer.byteLength(data)
                }
            };
            const protocol = url.protocol === 'https:' ? https : http;

            const req = protocol.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => { responseData += chunk; });
                res.on('end', () => {
                    try {
                        const result = JSON.parse(responseData);
                        if (result.code === 200) {
                            console.log('✅ Bark 通知发送成功');
                            resolve(true);
                        } else {
                            console.error('❌ Bark 通知发送失败:', result.message || responseData);
                            resolve(false);
                        }
                    } catch (error) {
                        console.error('❌ 解析 Bark 响应失败:', responseData || error.message);
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ 发送 Bark 请求失败:', error.message);
                resolve(false);
            });

            req.write(data);
            req.end();
        });
    }
}

/**
 * 任务完成通知函数
 * @param {string} taskInfo   任务信息
 * @param {Object} barkConfig 已按事件解析的 Bark 配置 { key, server, icon, level, ... }
 * @param {string} projectName 项目名称
 * @returns {Promise<boolean>}
 */
async function notifyTaskCompletion(taskInfo = 'Claude Code任务已完成', barkConfig = {}, projectName = '') {
    const deviceKey = barkConfig.key || process.env.BARK_KEY || '';
    const server = barkConfig.server || process.env.BARK_SERVER || 'https://api.day.app';

    if (!deviceKey || deviceKey.includes('your_bark_device_key_here')) {
        console.log('⚠️  请先配置 Bark 设备 key');
        console.log('📝 打开 Bark App 首页复制「设备 key」，在 .env 中设置 BARK_KEY');
        return false;
    }

    const cfg = { ...barkConfig, key: deviceKey, server };
    const notifier = new BarkNotifier(cfg);

    const title = projectName || 'Claude Code';
    const body = `${taskInfo}\n${new Date().toLocaleString('zh-CN')}`;
    const payload = buildBarkPayload(title, body, cfg, projectName);

    try {
        const success = await notifier.send(payload);
        if (success) {
            console.log('🎉 任务完成通知已推送到 Bark！');
            console.log('📱 您的 iPhone 将收到推送通知');
        } else {
            console.log('❌ Bark 通知发送失败，请检查 BARK_KEY / BARK_SERVER / 加密配置');
        }
        return success;
    } catch (error) {
        console.error('❌ 发送 Bark 通知时发生错误:', error.message);
        return false;
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

// 如果直接运行此脚本（按 Stop 事件的默认策略解析扩展项）
if (require.main === module) {
    const options = getCommandLineArgs();
    const taskInfo = options.message || options.task || 'Claude Code任务已完成';
    const { envConfig } = require('./env-config');
    const bark = envConfig.getBarkConfig();
    bark.isArchive = bark.archiveStop ? '1' : '0';
    bark.critical = (bark.criticalScope === 'all' || bark.criticalScope === 'stop');
    bark.call = (bark.callScope === 'all' || bark.callScope === 'stop');

    console.log('🚀 开始发送 Bark 通知...');
    notifyTaskCompletion(taskInfo, bark, options.project || '');
}

module.exports = {
    BarkNotifier,
    buildBarkPayload,
    encryptPayload,
    notifyTaskCompletion
};
