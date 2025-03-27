const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { removeMoney, getGuildConfig } = require('../../config/db');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription('Remove money from a user\'s balance')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to remove money from')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Amount of money to remove')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Where to remove the money from')
                .setRequired(false)
                .addChoices(
                    { name: 'Wallet', value: 'wallet' },
                    { name: 'Bank', value: 'bank' },
                    { name: 'All', value: 'all' }
                )),

    async execute(messageOrInteraction, args) {
        let targetUser, amount, type;
        if (messageOrInteraction.reply && messageOrInteraction.editReply) {
            targetUser = messageOrInteraction.options.getUser('user');
            amount = messageOrInteraction.options.getInteger('amount');
            type = messageOrInteraction.options.getString('type') || 'wallet';
        } else {
            const userArg = args[0];
            if (!userArg) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Invalid User', 'Please specify a user to remove money from.')]
                });
            }

            targetUser = messageOrInteraction.mentions.users.first() || 
                        messageOrInteraction.guild.members.cache.get(userArg)?.user ||
                        messageOrInteraction.guild.members.cache.find(m => m.user.username.toLowerCase() === userArg.toLowerCase())?.user;

            if (!targetUser) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Invalid User', 'Please specify a valid user to remove money from.')]
                });
            }

            amount = parseInt(args[1]);
            type = args[2]?.toLowerCase() || 'wallet';
        }

        if (targetUser.bot) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid User', 'You cannot remove money from bots.')]
            });
        }

        if (isNaN(amount) || amount <= 0) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Amount', 'Please specify a valid amount greater than 0.')]
            });
        }

        if (!['wallet', 'bank', 'all'].includes(type)) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Type', 'Please specify either "wallet", "bank", or "all".')]
            });
        }

        try {
            const config = await getGuildConfig(messageOrInteraction.guildId);
            await removeMoney(messageOrInteraction.guildId, targetUser.id, amount, type);

            await messageOrInteraction.reply({
                embeds: [embed.success('Money Removed', `Successfully removed ${config.currency_emoji} ${amount.toLocaleString()} ${config.currency_name} from ${targetUser}'s ${type}!`)]
            });
        } catch (error) {
            await messageOrInteraction.reply({
                embeds: [embed.error('Operation Failed', error.message)]
            });
        }
    }
}; 