/**
 * Claude Code 任务完成通知系统
 * 集成声音提醒和飞书推送，支持手环震动
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { envConfig } = require('./env-config');
const { NotificationManager } = require('./notification-manager');

// hook 运行环境的 PATH 可能不含 System32，直接 spawn('powershell') 会 ENOENT，
// 导致「bark 能收到但 Windows 没声音」。故用绝对路径定位 powershell.exe。
const POWERSHELL = path.join(process.env.SystemRoot || 'C:\\Windows',
    'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

/**
 * 通知系统管理器
 */
class NotificationSystem {
    constructor(options = {}) {
        this.options = options || {};
        this.config = this.loadConfig();
        this.projectName = this.getProjectName();
        this.notificationManager = new NotificationManager(this.config, this.projectName);
    }

    /**
     * 从环境变量加载配置
     */
    loadConfig() {
        const envVars = envConfig.getAllConfig();
        const sound = { ...envVars.sound };
        // 音效优先级：--sound 显式路径 > ask 事件用 SOUND_FILE_ASK > 默认 SOUND_FILE
        if (typeof this.options.sound === 'string' && this.options.sound) {
            sound.file = this.options.sound;
        } else if (this.options.ask && envVars.sound.fileAsk) {
            sound.file = envVars.sound.fileAsk;
        }
        return {
            notification: {
                type: envVars.feishu.enabled ? 'feishu' : 'sound',
                feishu: envVars.feishu,
                telegram: envVars.telegram,
                bark: this.resolveBark(envVars.bark),
                sound: sound
            }
        };
    }

    /**
     * 按当前事件(ask / stop)解析 Bark 的按事件差异项：
     * 归档(isArchive)、重要警告(critical)、持续响铃(call)
     */
    resolveBark(bark) {
        const eventKey = this.options.ask ? 'ask' : 'stop';
        const inScope = (scope) => scope === 'all' || scope === eventKey;
        return {
            ...bark,
            isArchive: (eventKey === 'stop' ? bark.archiveStop : bark.archiveAsk) ? '1' : '0',
            critical: inScope(bark.criticalScope),
            call: inScope(bark.callScope)
        };
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
    buildSoundPsScript() {
        // SOUND_FILE 未配置时用默认 Windows 通知音
        const defaultSound = 'C:\\Windows\\Media\\Windows Notify System Generic.wav';
        const soundFile = this.config.notification.sound.file || defaultSound;
        const safePath = soundFile.replace(/'/g, "''"); // 转义 PowerShell 单引号

        if (/\.wav$/i.test(soundFile)) {
            // .wav：SoundPlayer 同步播放，快且稳
            return `try { (New-Object Media.SoundPlayer '${safePath}').PlaySync() } catch { [console]::Beep(800, 300) }`;
        }
        // .mp3/.m4a/.wma 等：用 MediaPlayer 播放（等到时长可读后播完再退出）
        // MediaPlayer.Open 是异步的，文件缺失/损坏不会抛异常，故：先 Test-Path 兜底，
        // 且时长始终读不到时也蜂鸣兜底，避免静默失败（无声也无 beep）
        return `try {` +
            ` if (-not (Test-Path -LiteralPath '${safePath}')) { [console]::Beep(800, 300) } else {` +
            ` Add-Type -AssemblyName PresentationCore;` +
            ` $p = New-Object System.Windows.Media.MediaPlayer;` +
            ` $p.Open([uri]::new('${safePath}'));` +
            ` $t = 0; while (-not $p.NaturalDuration.HasTimeSpan -and $t -lt 50) { Start-Sleep -Milliseconds 100; $t++ };` +
            ` if ($p.NaturalDuration.HasTimeSpan) { $p.Play(); Start-Sleep -Milliseconds ([int]$p.NaturalDuration.TimeSpan.TotalMilliseconds + 300) } else { [console]::Beep(800, 300) };` +
            ` $p.Close() }` +
            ` } catch { [console]::Beep(800, 300) }`;
    }

    /**
     * 发送声音提醒
     */
    sendSoundNotification() {
        if (!this.config.notification.sound.enabled) {
            return;
        }

        console.log('🔊 播放声音提醒...');

        // 同步阻塞播放：保证在 hook 进程存活期间就把声音播完，
        // 不依赖 detached 子进程在本进程退出后存活（那样会被 hook 进程树回收而静默）
        const psScript = this.buildSoundPsScript();
        const r = spawnSync(POWERSHELL, ['-NoProfile', '-Command', psScript], {
            stdio: 'ignore', shell: false, windowsHide: true, timeout: 20000
        });

        // powershell 找不到等异常时退回蜂鸣
        if (r.error && this.config.notification.sound.backup) {
            spawnSync(POWERSHELL, ['-NoProfile', '-Command', '[console]::Beep(800,500)'],
                { stdio: 'ignore', shell: false, windowsHide: true, timeout: 5000 });
            console.log('声音播放失败，已尝试蜂鸣');
        }
        console.log('🔊 声音提醒已播放');
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

        // 声音通知：同步阻塞，播完再继续（不依赖 detached 子进程在本进程退出后存活）
        if (this.config.notification.sound.enabled) {
            this.sendSoundNotification();
        }

        // 打印结果汇总
        this.notificationManager.printNotificationSummary(results);

        // 声音已同步播完，直接退出
        console.log('✨ 通知系统执行完成，程序退出');
        process.exit(0);
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

/**
 * 从 stdin 读取 Claude Stop hook 传入的上下文
 * 包含 last_assistant_message 等信息
 */
function readStdinSync() {
    const { readFileSync } = require('fs');
    try {
        return readFileSync(0, 'utf8').trim();
    } catch {
        return '';
    }
}

/**
 * 读取并解析 stdin 里的 Claude hook 上下文（只能读一次，故集中解析）
 * @returns {Object} 解析后的上下文对象；非 JSON 或无输入时返回 {}
 */
function readStdinContext() {
    const raw = readStdinSync();
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

/**
 * 判断是否为「Claude 在等你」类事件(Notification hook)
 * 依次看：命令行 --event ask > stdin hook_event_name > stdin 含 message 字段的启发式
 */
function isAskEvent(options, ctx) {
    if (options.event === 'ask') return true;
    if (ctx && ctx.hook_event_name === 'Notification') return true;
    if (ctx && typeof ctx.message === 'string' && !ctx.last_assistant_message) return true;
    return false;
}

/**
 * 从 Claude 上下文生成通知消息
 */
function buildMessageFromContext(options, ctx, ask) {
    // 1. 命令行显式指定了消息，直接用
    if (options.message || options.task) {
        return options.message || options.task;
    }

    // 2. Notification(等你)事件：用 stdin 的 message，退回默认提示
    if (ask) {
        return (ctx && ctx.message) || '⏳ Claude 在等你回复 / 授权';
    }

    // 3. Stop：尝试从上下文提取最后一条助手消息
    if (ctx && ctx.last_assistant_message) {
        const text = ctx.last_assistant_message
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('#'))
            .slice(0, 5)
            .join(' ')
            .slice(0, 4000);
        return text || '任务完成';
    }

    return '任务完成';
}

// 如果直接运行此脚本
if (require.main === module) {
    const options = getCommandLineArgs();
    // 只在 stdin 被管道输入时读取（hook 会传 JSON）；交互式终端(TTY)下不读，
    // 否则 readFileSync(0) 会阻塞等 EOF，导致 `notify-system.js --task "测试"` 卡死
    const ctx = process.stdin.isTTY ? {} : readStdinContext();
    const ask = isAskEvent(options, ctx);
    options.ask = ask; // 供 loadConfig 选择 SOUND_FILE_ASK
    const taskInfo = buildMessageFromContext(options, ctx, ask);

    const notifier = new NotificationSystem(options);
    notifier.sendAllNotifications(taskInfo);
}

module.exports = {
    NotificationSystem
};