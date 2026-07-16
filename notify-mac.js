/**
 * macOS 原生通知脚本
 * 通过 terminal-notifier 投递系统通知，弹出横幅并播放系统提示音
 * 仅在 macOS (darwin) 平台生效
 *
 * 为什么用 terminal-notifier 而非 osascript：
 * osascript 的 `display notification` 把通知归属给 "Script Editor" 宿主 App，
 * 一旦 Script Editor 通知权限被关，通知会被系统静默丢弃且退出码仍为 0（假成功）。
 * terminal-notifier 以自身身份投递，权限清晰，后台 hook 触发也可靠。
 */

const { spawn } = require('child_process');

/**
 * macOS 通知器
 */
class MacNotifier {
    /**
     * 构造函数
     * @param {string} sound - 系统提示音名称，见 /System/Library/Sounds（如 Glass、Ping、Hero），或 'default'
     */
    constructor(sound = 'Glass') {
        this.sound = sound;
    }

    /**
     * 折叠换行为空格并截断，避免通知内容过长
     * @param {string} str - 原始字符串
     * @param {number} max - 最大长度
     * @returns {string}
     */
    clean(str, max) {
        return String(str).replace(/[\r\n]+/g, ' ').trim().slice(0, max);
    }

    /**
     * 弹出一条 macOS 通知
     * 参数经 spawn 数组直传 argv，不经过 shell，天然免注入，无需转义
     * @param {string} title - 通知标题
     * @param {string} body - 通知正文
     * @returns {Promise<boolean>} 发送是否成功
     */
    notify(title, body) {
        const safeTitle = this.clean(title, 120) || 'Claude Code';
        const safeBody = this.clean(body, 400) || '任务完成';

        return new Promise((resolve) => {
            const proc = spawn('terminal-notifier', [
                '-title', safeTitle,
                '-message', safeBody,
                '-sound', this.sound
            ], { stdio: 'ignore' });

            proc.on('error', (error) => {
                console.error('❌ macOS 通知发送失败（terminal-notifier 未安装？请执行 brew install terminal-notifier）:', error.message);
                resolve(false);
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ macOS 原生通知已弹出');
                    resolve(true);
                } else {
                    console.error(`❌ macOS 通知发送失败 (退出码 ${code})`);
                    resolve(false);
                }
            });
        });
    }
}

/**
 * 任务完成通知函数
 * @param {string} taskInfo - 任务信息
 * @param {string} projectName - 项目名称
 * @param {string} sound - 系统提示音名称
 * @returns {Promise<boolean>} 发送是否成功
 */
async function notifyTaskCompletion(taskInfo = 'Claude Code任务已完成', projectName = '', sound = 'Glass') {
    if (process.platform !== 'darwin') {
        console.log('⏭️  非 macOS 平台，跳过原生通知');
        return false;
    }

    const notifier = new MacNotifier(sound);
    const title = projectName || 'Claude Code';
    return await notifier.notify(title, taskInfo);
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
    const taskInfo = options.message || options.task || 'Claude Code任务已完成';
    const projectName = options.project || '';

    console.log('🚀 发送 macOS 原生通知...');
    notifyTaskCompletion(taskInfo, projectName);
}

module.exports = {
    MacNotifier,
    notifyTaskCompletion
};
