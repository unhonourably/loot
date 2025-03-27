const { SlashCommandBuilder } = require('discord.js');
const { addMoney, getGuildConfig, getUserDaily, updateUserDaily } = require('../../config/db');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward'),

    async execute(messageOrInteraction, args) {
        const userId = messageOrInteraction.user?.id || messageOrInteraction.author?.id;

        try {
            const config = await getGuildConfig(messageOrInteraction.guildId);
            const userDaily = await getUserDaily(messageOrInteraction.guildId, userId);

            if (!config.daily_enabled) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Command Disabled', 'Daily rewards are currently disabled in this server.')]
                });
            }

            const now = Math.floor(Date.now() / 1000);
            const timeLeft = userDaily.last_daily + config.daily_cooldown - now;

            if (timeLeft > 0) {
                const hours = Math.floor(timeLeft / 3600);
                const minutes = Math.floor((timeLeft % 3600) / 60);
                const seconds = timeLeft % 60;

                let timeString = '';
                if (hours > 0) timeString += `${hours}h `;
                if (minutes > 0) timeString += `${minutes}m `;
                if (seconds > 0) timeString += `${seconds}s`;

                return messageOrInteraction.reply({
                    embeds: [embed.error('Cooldown', `You can claim your daily reward again in ${timeString.trim()}`)]
                });
            }

            await addMoney(messageOrInteraction.guildId, userId, config.daily_amount, 'wallet');
            await updateUserDaily(messageOrInteraction.guildId, userId);
            await messageOrInteraction.reply({
                embeds: [embed.success('Daily Reward', `You received ${config.currency_emoji} ${config.daily_amount.toLocaleString()} ${config.currency_name} as your daily reward!`)]
            });
        } catch (error) {
            await messageOrInteraction.reply({
                embeds: [embed.error('Operation Failed', error.message)]
            });
        }
    }
}; 