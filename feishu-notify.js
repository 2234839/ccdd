/**
 * 飞书通知脚本 - 手环震动提醒版
 * 通过飞书webhook发送消息，触发手机通知并同步到手环震动提醒
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

/**
 * 飞书webhook通知类
 */
class FeishuNotifier {
    /**
     * 构造函数
     * @param {string} webhookUrl - 飞书机器人的webhook地址
     */
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    /**
     * 发送文本消息到飞书
     * @param {string} message - 消息内容
     * @param {Object} options - 额外选项
     * @returns {Promise<boolean>} 发送是否成功
     */
    async sendText(message, options = {}) {
        const payload = {
            msg_type: "text",
            content: {
                text: message
            }
        };

        return this._sendPayload(payload);
    }

    /**
     * 发送富文本消息到飞书
     * @param {string} title - 消息标题
     * @param {string} content - 消息内容
     * @param {Array} tags - 标签列表
     * @returns {Promise<boolean>} 发送是否成功
     */
    async sendRichText(title, content, tags = []) {
        const payload = {
            msg_type: "post",
            content: {
                post: {
                    zh_cn: {
                        title: title,
                        content: [
                            [
                                {
                                    tag: "text",
                                    text: content
                                }
                            ]
                        ]
                    }
                }
            }
        };

        return this._sendPayload(payload);
    }

    /**
     * 发送交互式卡片消息
     * @param {string} title - 卡片标题
     * @param {string} content - 卡片内容
     * @returns {Promise<boolean>} 发送是否成功
     */
    async sendCard(title, content) {
        const payload = {
            msg_type: "interactive",
            content: {
                type: "template",
                data: {
                    template_id: "AAqKGP7Qx6y9R",
                    template_variable: {
                        title: title,
                        content: content
                    }
                }
            }
        };

        return this._sendPayload(payload);
    }

    /**
     * 发送HTTP请求到飞书webhook
     * @param {Object} payload - 请求载荷
     * @returns {Promise<boolean>} 发送是否成功
     */
    _sendPayload(payload) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(payload);
            const url = new URL(this.webhookUrl);

            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const protocol = url.protocol === 'https:' ? https : http;

            const req = protocol.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const result = JSON.parse(responseData);
                        if (result.code === 0) {
                            console.log('✅ 飞书通知发送成功');
                            resolve(true);
                        } else {
                            console.error('❌ 飞书通知发送失败:', result.msg);
                            resolve(false);
                        }
                    } catch (error) {
                        console.error('❌ 解析飞书响应失败:', error.message);
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ 发送飞书请求失败:', error.message);
                resolve(false);
            });

            req.write(data);
            req.end();
        });
    }
}

/**
 * 任务完成通知函数
 * @param {string} taskInfo - 任务信息
 * @param {string} webhookUrl - 飞书webhook地址
 * @param {string} projectName - 项目名称
 */
async function notifyTaskCompletion(taskInfo = "Claude Code任务已完成", webhookUrl = null, projectName = "") {
    // 从环境变量或配置文件读取webhook地址
    const FEISHU_WEBHOOK_URL = webhookUrl ||
                             process.env.FEISHU_WEBHOOK_URL ||
                             'https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_WEBHOOK_URL_HERE';

    if (!FEISHU_WEBHOOK_URL || FEISHU_WEBHOOK_URL.includes('YOUR_WEBHOOK_URL_HERE')) {
        console.log('⚠️  请先配置飞书webhook地址');
        console.log('📝 配置方法：');
        console.log('1. 在飞书中创建群组');
        console.log('2. 添加自定义机器人');
        console.log('3. 复制webhook地址');
        console.log('4. 设置环境变量 FEISHU_WEBHOOK_URL 或修改脚本中的地址');
        return false;
    }

    const notifier = new FeishuNotifier(FEISHU_WEBHOOK_URL);

    // 构造丰富的通知内容
    const timestamp = new Date().toLocaleString('zh-CN');
    // 项目名放在title最前面，适配手环显示
    const title = projectName ? `${projectName}: ${taskInfo}` : taskInfo;
    const content = `⏰ 完成时间：${timestamp}
🎯 手机震动 + 手环震动提醒

💡 可以查看执行结果了！`;

    try {
        // 发送富文本消息
        const success = await notifier.sendRichText(title, content);

        if (success) {
            console.log('🎉 任务完成通知已发送到飞书！');
            console.log('📱 您的手机将收到通知，小米手环会震动提醒');
        } else {
            console.log('❌ 飞书通知发送失败，请检查webhook配置');
        }

        return success;
    } catch (error) {
        console.error('❌ 发送飞书通知时发生错误:', error.message);
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
            if (value !== true) i++; // 跳过下一个参数，因为它已经被当作值处理了
        }
    }

    return options;
}

// 如果直接运行此脚本
if (require.main === module) {
    const options = getCommandLineArgs();
    const taskInfo = options.message || options.task || "Claude Code任务已完成";
    const webhookUrl = options.webhook || null;

    console.log('🚀 开始发送飞书通知...');
    notifyTaskCompletion(taskInfo, webhookUrl);
}

module.exports = {
    FeishuNotifier,
    notifyTaskCompletion
};