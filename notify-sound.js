/**
 * 任务完成发声提醒脚本
 * 当Claude Code完成任务时播放系统提示音
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

/**
 * 播放Windows系统提示音
 * @param {string} soundType - 声音类型: 'default', 'asterisk', 'exclamation', 'hand', 'question'
 */
function playWindowsSound(soundType = 'default') {
    // 使用更安全的PowerShell脚本
    const psScript = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak("任务完成"); [console]::Beep(800, 300)`;

    return spawn('powershell', ['-Command', psScript], {
        stdio: 'ignore',
        shell: false
    });
}

/**
 * 播放简单的蜂鸣声作为备用方案
 */
function playBeep() {
    // 使用PowerShell播放蜂鸣声
    const psScript = '[console]::Beep(800, 500)';

    return spawn('powershell', ['-Command', psScript], {
        stdio: 'ignore',
        shell: false
    });
}

/**
 * 主要的提醒函数
 */
function notifyTaskCompletion() {
    console.log('🎵 任务完成！播放提醒声音...');

    try {
        // 尝试播放系统声音和语音提醒
        const soundProcess = playWindowsSound('exclamation');

        soundProcess.on('error', (error) => {
            console.log('系统声音播放失败，使用蜂鸣声:', error.message);
            playBeep();
        });

        soundProcess.on('close', (code) => {
            if (code !== 0) {
                console.log('系统声音进程异常退出，使用蜂鸣声');
                playBeep();
            }
        });

    } catch (error) {
        console.log('播放声音时发生错误，使用蜂鸣声:', error.message);
        playBeep();
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    notifyTaskCompletion();

    // 3秒后退出程序
    setTimeout(() => {
        console.log('提醒完成，程序退出');
        process.exit(0);
    }, 3000);
}

module.exports = {
    notifyTaskCompletion,
    playWindowsSound,
    playBeep
};