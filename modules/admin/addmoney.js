const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addMoney, getGuildConfig } = require('../../config/db');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Add money to a user\'s balance')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to add money to')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Amount of money to add')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Where to add the money')
                .setRequired(false)
                .addChoices(
                    { name: 'Wallet', value: 'wallet' },
                    { name: 'Bank', value: 'bank' }
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
                    embeds: [embed.error('Invalid User', 'Please specify a user to add money to.')]
                });
            }

            targetUser = messageOrInteraction.mentions.users.first() || 
                        messageOrInteraction.guild.members.cache.get(userArg)?.user ||
                        messageOrInteraction.guild.members.cache.find(m => m.user.username.toLowerCase() === userArg.toLowerCase())?.user;

            if (!targetUser) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Invalid User', 'Please specify a valid user to add money to.')]
                });
            }

            amount = parseInt(args[1]);
            type = args[2]?.toLowerCase() || 'wallet';
        }

        if (targetUser.bot) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid User', 'You cannot add money to bots.')]
            });
        }

        if (isNaN(amount) || amount <= 0) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Amount', 'Please specify a valid amount greater than 0.')]
            });
        }

        if (!['wallet', 'bank'].includes(type)) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Type', 'Please specify either "wallet" or "bank".')]
            });
        }

        try {
            const config = await getGuildConfig(messageOrInteraction.guildId);
            await addMoney(messageOrInteraction.guildId, targetUser.id, amount, type);

            await messageOrInteraction.reply({
                embeds: [embed.success('Money Added', `Successfully added ${config.currency_emoji} ${amount.toLocaleString()} ${config.currency_name} to ${targetUser}'s ${type}!`)]
            });
        } catch (error) {
            await messageOrInteraction.reply({
                embeds: [embed.error('Operation Failed', error.message)]
            });
        }
    }
}; 