/**
 * Claude Code 任务完成通知系统
 * 集成声音提醒和飞书推送，支持手环震动
 * 支持从 stdin 读取 hook 输入数据
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { envConfig } = require('./env-config');
const { NotificationManager } = require('./notification-manager');
const { notifyTaskCompletion } = require('./notify-sound');

/**
 * 从 stdin 读取 hook 输入的 JSON 数据
 */
async function readStdinJson() {
    return new Promise((resolve) => {
        if (process.stdin.isTTY) {
            resolve(null);
            return;
        }

        let data = '';
        const rl = readline.createInterface({ input: process.stdin, terminal: false });

        const timeout = setTimeout(() => { rl.close(); resolve(null); }, 1000);

        rl.on('line', (line) => { data += line; });

        rl.on('close', () => {
            clearTimeout(timeout);
            if (data.trim()) {
                try { resolve(JSON.parse(data)); }
                catch (e) { console.log('⚠️  无法解析 stdin JSON:', e.message); resolve(null); }
            } else { resolve(null); }
        });

        rl.on('error', () => { clearTimeout(timeout); resolve(null); });
    });
}

/**
 * 从 transcript 文件提取任务摘要
 * 策略：取最后一条用户消息（当前任务描述）
 */
function extractTaskSummary(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;

        const content = fs.readFileSync(transcriptPath, 'utf8');
        const lines = content.trim().split('\n');

        for (let i = lines.length - 1; i >= 0; i--) {
            try {
                const entry = JSON.parse(lines[i]);
                if (entry.type === 'user' && entry.message?.content) {
                    const raw = entry.message.content;
                    const textContent = typeof raw === 'string'
                        ? raw
                        : Array.isArray(raw)
                            ? raw.filter(c => c.type === 'text').map(c => c.text).join('\n')
                            : String(raw);

                    if (textContent) {
                        const summary = textContent.slice(0, 100).replace(/\n/g, ' ').trim();
                        return summary + (textContent.length > 100 ? '...' : '');
                    }
                }
            } catch (e) { /* skip */ }
        }
        return null;
    } catch (error) {
        console.log('⚠️  读取 transcript 失败:', error.message);
        return null;
    }
}

/**
 * 通知系统管理器
 */
class NotificationSystem {
    constructor(hookInput = null) {
        this.hookInput = hookInput;
        this.config = this.loadConfig();
        this.projectName = this.getProjectName();
        this.terminalName = this.getTerminalName();
        this.notificationManager = new NotificationManager(this.config, this.projectName);
    }

    /**
     * 自动检测终端名称
     * 优先级: TERMINAL_NAME env > tmux 窗口名 > AppleScript(iTerm2/Terminal.app) > null
     */
    getTerminalName() {
        const { execSync } = require('child_process');

        if (process.env.TERMINAL_NAME) {
            console.log(`🖥️  终端名称(env): ${process.env.TERMINAL_NAME}`);
            return process.env.TERMINAL_NAME;
        }

        if (process.env.TMUX) {
            try {
                const name = execSync('tmux display-message -p "#W"', {
                    encoding: 'utf8', timeout: 2000, stdio: 'pipe'
                }).trim();
                if (name) { console.log(`🖥️  终端名称(tmux): ${name}`); return name; }
            } catch (e) { /* continue */ }
        }

        if (require('os').platform() === 'darwin') {
            const termProgram = process.env.TERM_PROGRAM || '';
            try {
                if (termProgram === 'iTerm.app') {
                    const name = execSync(
                        'osascript -e \'tell application "iTerm2" to tell current session of current tab of current window to get name\'',
                        { encoding: 'utf8', timeout: 2000, stdio: 'pipe' }
                    ).trim();
                    if (name) { console.log(`🖥️  终端名称(iTerm2): ${name}`); return name; }
                }
                if (termProgram === 'Apple_Terminal') {
                    const name = execSync(
                        'osascript -e \'tell application "Terminal" to get custom title of selected tab of front window\'',
                        { encoding: 'utf8', timeout: 2000, stdio: 'pipe' }
                    ).trim();
                    if (name) { console.log(`🖥️  终端名称(Terminal): ${name}`); return name; }
                }
            } catch (e) { /* continue */ }
        }

        return null;
    }

    loadConfig() {
        try {
            const configPath = path.join(__dirname, 'config.json');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const envVars = envConfig.getAllConfig();

            if (envVars.feishu.webhook_url) {
                config.notification.feishu.webhook_url = envVars.feishu.webhook_url;
                config.notification.feishu.enabled = true;
            }
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
                    sound: envVars.sound
                }
            };
        }
    }

    getProjectName() {
        try {
            const workDir = this.hookInput?.cwd || process.cwd();

            const packageJsonPath = path.join(workDir, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageData.name) {
                    console.log(`📦 从 package.json 检测到项目名称: ${packageData.name}`);
                    return packageData.name;
                }
            }

            const { execSync } = require('child_process');
            try {
                const gitRemote = execSync('git remote get-url origin', {
                    encoding: 'utf8', stdio: 'pipe', cwd: workDir
                }).trim();
                const matches = gitRemote.match(/\/([^\/]+?)(\.git)?$/);
                if (matches && matches[1]) {
                    console.log(`🔧 从 git 仓库检测到项目名称: ${matches[1]}`);
                    return matches[1];
                }
            } catch (e) { /* continue */ }

            const dirName = path.basename(workDir);
            console.log(`📁 从目录名检测到项目名称: ${dirName}`);
            return dirName;
        } catch (error) {
            console.log('⚠️  无法获取项目名称，使用默认值');
            return '未知项目';
        }
    }

    async sendSoundNotification() {
        if (!this.config.notification.sound.enabled) return;
        const eventType = this.hookInput?.hook_event_name || 'default';
        const notificationType = this.hookInput?.notification_type || null;
        console.log('🔊 播放声音提醒...');
        try {
            notifyTaskCompletion(eventType, notificationType, this.terminalName);
        } catch (error) {
            console.log('播放声音时发生错误:', error.message);
        }
    }

    generateMessage(fallbackMessage) {
        if (!this.hookInput) return fallbackMessage;
        const eventName = this.hookInput.hook_event_name;

        if (eventName === 'Notification' && this.hookInput.message) return this.hookInput.message;

        if (eventName === 'Stop') {
            const summary = extractTaskSummary(this.hookInput.transcript_path);
            return summary ? `已完成: ${summary}` : '任务已完成';
        }

        if (eventName === 'SubagentStop') {
            const summary = extractTaskSummary(this.hookInput.transcript_path);
            return summary ? `子任务完成: ${summary}` : '子任务已完成';
        }

        return fallbackMessage;
    }

    async sendAllNotifications(taskInfo = "Claude Code任务已完成") {
        let message = this.generateMessage(taskInfo);
        if (this.terminalName) message = `${this.terminalName}，${message}`;

        const icons = this.notificationManager.getEnabledNotificationIcons();
        console.log(`🚀 开始发送通知... ${icons}`);
        console.log(`📁 项目名称：${this.projectName}`);
        console.log(`📝 通知内容：${message}`);

        if (this.hookInput) {
            console.log(`🔔 事件类型：${this.hookInput.hook_event_name}${this.hookInput.notification_type ? ` (${this.hookInput.notification_type})` : ''}`);
        }

        const results = await this.notificationManager.sendAllNotifications(message);

        if (this.config.notification.sound.enabled) {
            this.sendSoundNotification();
            setTimeout(() => { console.log('🔊 声音提醒已播放'); }, 1000);
        }

        this.notificationManager.printNotificationSummary(results);
        setTimeout(() => { console.log('✨ 通知系统执行完成，程序退出'); process.exit(0); }, 3000);
    }
}

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

if (require.main === module) {
    (async () => {
        const options = getCommandLineArgs();
        const fallbackMessage = options.message || options.task || "Claude Code任务已完成";
        const hookInput = await readStdinJson();
        if (hookInput) console.log('📥 收到 hook 输入数据');
        const notifier = new NotificationSystem(hookInput);
        notifier.sendAllNotifications(fallbackMessage);
    })();
}

module.exports = { NotificationSystem, readStdinJson, extractTaskSummary };
