const { SlashCommandBuilder } = require('discord.js');
const { getUserBalance, getGuildConfig } = require('../../config/db');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your or another user\'s balance')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to check balance for')
                .setRequired(false)),

    async execute(messageOrInteraction, args) {
        const isSlashCommand = messageOrInteraction.reply && messageOrInteraction.editReply;
        const targetUser = isSlashCommand 
            ? messageOrInteraction.options.getUser('user') || messageOrInteraction.user
            : messageOrInteraction.mentions.users.first() || messageOrInteraction.author;

        const config = await getGuildConfig(messageOrInteraction.guildId);
        const balance = await getUserBalance(messageOrInteraction.guildId, targetUser.id);

        const fields = [
            { name: 'Wallet', value: `${config.currency_emoji} ${balance.wallet.toLocaleString()} ${config.currency_name}`, inline: true },
            { name: 'Bank', value: `${config.currency_emoji} ${balance.bank.toLocaleString()} ${config.currency_name}`, inline: true },
            { name: 'Total', value: `${config.currency_emoji} ${(balance.wallet + balance.bank).toLocaleString()} ${config.currency_name}`, inline: true }
        ];

        if (targetUser.id === (isSlashCommand ? messageOrInteraction.user.id : messageOrInteraction.author.id)) {
            await messageOrInteraction.reply({ 
                embeds: [embed.info('Your Balance', 'Here\'s your current balance:', fields)]
            });
        } else {
            await messageOrInteraction.reply({ 
                embeds: [embed.info(`${targetUser.username}'s Balance`, `Here's ${targetUser.username}'s current balance:`, fields)]
            });
        }
    }
}; 