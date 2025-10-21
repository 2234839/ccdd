/**
 * 一键配置向导
 * 帮助用户快速配置飞书webhook
 */

require('dotenv').config();
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * 询问用户输入
 */
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

/**
 * 配置向导主函数
 */
async function setupWizard() {
    console.log('🚀 Claude Code 手环震动提醒系统 - 配置向导');
    console.log('=' .repeat(50));
    console.log('');

    console.log('📋 这个向导将帮助您配置飞书webhook，让Claude Code完成任务时能够通过手环震动提醒您。');
    console.log('');

    // 询问是否需要配置飞书
    const setupFeishu = await question('❓ 是否需要配置飞书通知？(y/n): ');

    if (setupFeishu.toLowerCase() !== 'y' && setupFeishu.toLowerCase() !== 'yes') {
        console.log('ℹ️  跳过飞书配置，您将只使用声音提醒。');
        console.log('🔧 稍后可以通过编辑 config.json 来启用飞书通知。');
        rl.close();
        return;
    }

    console.log('');
    console.log('📱 飞书Webhook配置步骤：');
    console.log('1. 📲 在飞书中创建一个群组（可以只包含你自己）');
    console.log('2. ⚙️  进入群组设置 > 群机器人 > 添加机器人');
    console.log('3. 🤖 选择"自定义机器人"并点击"添加"');
    console.log('4. 📝 设置机器人名称（如：Claude Code助手）');
    console.log('5. 🔗 复制生成的Webhook地址');
    console.log('');

    // 等待用户确认
    await question('✅ 按回车键继续，当您已获得webhook地址...');

    // 获取webhook地址
    const webhookUrl = await question('🔗 请粘贴您的飞书webhook地址: ');

    if (!webhookUrl || !webhookUrl.startsWith('https://open.feishu.cn')) {
        console.log('❌ 无效的webhook地址！请确保地址以 https://open.feishu.cn 开头');
        rl.close();
        return;
    }

    console.log('');
    console.log('⏳ 正在配置系统...');

    try {
        // 读取现有配置
        const configPath = path.join(__dirname, 'config.json');
        let config;

        try {
            const configData = fs.readFileSync(configPath, 'utf8');
            config = JSON.parse(configData);
        } catch (error) {
            console.log('📝 创建新的配置文件...');
            config = {
                notification: {
                    type: 'feishu',
                    feishu: { enabled: true, webhook_url: '' },
                    sound: { enabled: true, backup: true }
                },
                app: {
                    name: 'Claude Code 任务完成提醒',
                    version: '1.1.0',
                    description: '支持飞书通知和手环震动的任务完成提醒系统'
                }
            };
        }

        // 更新配置
        config.notification.feishu.webhook_url = webhookUrl;
        config.notification.feishu.enabled = true;

        // 保存配置文件
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

        // 创建.env文件
        const envPath = path.join(__dirname, '.env');
        const envContent = `# 飞书Webhook配置
FEISHU_WEBHOOK_URL=${webhookUrl}

# 通知配置
NOTIFICATION_ENABLED=true
SOUND_ENABLED=true
`;

        fs.writeFileSync(envPath, envContent, 'utf8');

        console.log('✅ 配置已保存到 config.json');
        console.log('✅ 环境变量已保存到 .env 文件');
        console.log('');

        // 测试配置
        console.log('🧪 测试飞书通知...');
        const { notifyTaskCompletion } = require('./feishu-notify');
        const success = await notifyTaskCompletion('配置向导测试消息', webhookUrl);

        if (success) {
            console.log('🎉 飞书通知测试成功！');
            console.log('📱 您的飞书应该已收到测试消息');
            console.log('⌚ 如果手环已连接，应该会感到震动');
        } else {
            console.log('❌ 飞书通知测试失败，请检查：');
            console.log('   1. webhook地址是否正确');
            console.log('   2. 网络连接是否正常');
            console.log('   3. 飞书群组是否正常');
        }

        console.log('');
        console.log('🎯 配置完成！现在您可以：');
        console.log('   1. 重启Claude Code');
        console.log('   2. 正常使用Claude Code执行任务');
        console.log('   3. 任务完成时会自动收到通知和手环震动');

    } catch (error) {
        console.log('❌ 配置过程中发生错误:', error.message);
    }

    rl.close();
}

// 如果直接运行此脚本
if (require.main === module) {
    setupWizard().then(() => {
        console.log('');
        console.log('👋 感谢使用！配置向导已退出。');
        process.exit(0);
    });
}

module.exports = {
    setupWizard
};