/**
 * 任务完成发声提醒脚本
 * 当Claude Code完成任务时播放系统提示音
 * 支持根据不同事件类型播放不同语音
 * 适配 macOS / Windows / 其他平台
 */

const { spawn } = require('child_process');
const os = require('os');

/**
 * 事件类型对应的语音内容
 */
const EVENT_VOICE_MAP = {
    'Stop': '任务完成',
    'permission_prompt': '需要权限确认',
    'idle_prompt': '等待你的输入',
    'elicitation_dialog': '需要输入信息',
    'SubagentStop': '子任务完成',
    'default': '任务完成'
};

/**
 * 事件类型对应的 macOS 系统音效名
 * 音效路径: /System/Library/Sounds/<name>.aiff
 */
const EVENT_SOUND_MAP = {
    'Stop': 'Glass',
    'permission_prompt': 'Sosumi',
    'idle_prompt': 'Tink',
    'elicitation_dialog': 'Ping',
    'SubagentStop': 'Pop',
    'default': 'Glass'
};

/**
 * 事件类型对应的蜂鸣音调 (Hz) — Windows 备用
 */
const EVENT_BEEP_MAP = {
    'Stop': 600,
    'permission_prompt': 1000,
    'idle_prompt': 800,
    'elicitation_dialog': 900,
    'SubagentStop': 700,
    'default': 800
};

/**
 * 获取事件类型的语音内容
 */
function getVoiceText(eventType, notificationType = null) {
    if (eventType === 'Notification' && notificationType) {
        return EVENT_VOICE_MAP[notificationType] || EVENT_VOICE_MAP['default'];
    }
    return EVENT_VOICE_MAP[eventType] || EVENT_VOICE_MAP['default'];
}

/**
 * 获取事件类型的 macOS 音效名
 */
function getSoundName(eventType, notificationType = null) {
    if (eventType === 'Notification' && notificationType) {
        return EVENT_SOUND_MAP[notificationType] || EVENT_SOUND_MAP['default'];
    }
    return EVENT_SOUND_MAP[eventType] || EVENT_SOUND_MAP['default'];
}

/**
 * 获取事件类型的蜂鸣音调
 */
function getBeepFrequency(eventType, notificationType = null) {
    if (eventType === 'Notification' && notificationType) {
        return EVENT_BEEP_MAP[notificationType] || EVENT_BEEP_MAP['default'];
    }
    return EVENT_BEEP_MAP[eventType] || EVENT_BEEP_MAP['default'];
}

/**
 * macOS: afplay 系统音效 + say TTS
 * @param {string} voicePrefix - 可选前缀，如终端名 "111"
 */
function playMacSound(eventType, notificationType, voicePrefix = null) {
    const soundName = getSoundName(eventType, notificationType);
    let voiceText = getVoiceText(eventType, notificationType);
    if (voicePrefix) {
        voiceText = `${voicePrefix}，${voiceText}`;
    }
    const soundPath = `/System/Library/Sounds/${soundName}.aiff`;

    const afplay = spawn('afplay', [soundPath], { stdio: 'ignore' });
    afplay.on('error', (err) => {
        console.log('afplay 播放失败:', err.message);
    });

    const say = spawn('say', ['-v', 'Tingting', voiceText], { stdio: 'ignore' });
    say.on('error', (err) => {
        console.log('say TTS 播放失败:', err.message);
    });

    return afplay;
}

/**
 * Windows: PowerShell TTS + Beep
 */
function playWindowsSound(voiceText = '任务完成', beepFreq = 800) {
    const psScript = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak("${voiceText}"); [console]::Beep(${beepFreq}, 300)`;
    return spawn('powershell', ['-Command', psScript], { stdio: 'ignore', shell: false });
}

/**
 * 通用: terminal bell
 */
function playTerminalBell() {
    process.stdout.write('\x07');
}

/**
 * 主要的提醒函数 — 自动检测平台
 * @param {string} voicePrefix - 可选语音前缀（终端名），如 "111"
 */
function notifyTaskCompletion(eventType = 'default', notificationType = null, voicePrefix = null) {
    const platform = os.platform();
    let voiceText = getVoiceText(eventType, notificationType);
    const displayText = voicePrefix ? `${voicePrefix}，${voiceText}` : voiceText;

    console.log(`🎵 播放提醒声音: "${displayText}" (${platform})`);

    try {
        if (platform === 'darwin') {
            playMacSound(eventType, notificationType, voicePrefix);
        } else if (platform === 'win32') {
            const beepFreq = getBeepFrequency(eventType, notificationType);
            const fullText = voicePrefix ? `${voicePrefix}，${voiceText}` : voiceText;
            const proc = playWindowsSound(fullText, beepFreq);
            proc.on('error', () => playTerminalBell());
        } else {
            playTerminalBell();
        }
    } catch (error) {
        console.log('播放声音时发生错误:', error.message);
        playTerminalBell();
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const args = process.argv.slice(2);
    let eventType = 'default';
    let notificationType = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--event' && args[i + 1]) {
            eventType = args[i + 1];
            i++;
        } else if (args[i] === '--type' && args[i + 1]) {
            notificationType = args[i + 1];
            i++;
        }
    }

    notifyTaskCompletion(eventType, notificationType);

    setTimeout(() => {
        console.log('提醒完成，程序退出');
        process.exit(0);
    }, 3000);
}

module.exports = {
    notifyTaskCompletion,
    playMacSound,
    playWindowsSound,
    playTerminalBell,
    getVoiceText,
    getSoundName,
    getBeepFrequency,
    EVENT_VOICE_MAP,
    EVENT_SOUND_MAP,
    EVENT_BEEP_MAP
};
