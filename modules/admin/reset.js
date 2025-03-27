const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { resetUserBalance, getGuildConfig } = require('../../config/db');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset a user\'s balance')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to reset balance for')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('What to reset')
                .setRequired(false)
                .addChoices(
                    { name: 'Wallet', value: 'wallet' },
                    { name: 'Bank', value: 'bank' },
                    { name: 'All', value: 'all' }
                )),

    async execute(messageOrInteraction, args) {
        let targetUser, type;
        if (messageOrInteraction.reply && messageOrInteraction.editReply) {
            targetUser = messageOrInteraction.options.getUser('user');
            type = messageOrInteraction.options.getString('type') || 'all';
        } else {
            const userArg = args[0];
            if (!userArg) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Invalid User', 'Please specify a user to reset balance for.')]
                });
            }

            targetUser = messageOrInteraction.mentions.users.first() || 
                        messageOrInteraction.guild.members.cache.get(userArg)?.user ||
                        messageOrInteraction.guild.members.cache.find(m => m.user.username.toLowerCase() === userArg.toLowerCase())?.user;

            if (!targetUser) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Invalid User', 'Please specify a valid user to reset balance for.')]
                });
            }

            type = args[1]?.toLowerCase() || 'all';
        }

        if (targetUser.bot) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid User', 'You cannot reset balance for bots.')]
            });
        }

        if (!['wallet', 'bank', 'all'].includes(type)) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Type', 'Please specify either "wallet", "bank", or "all".')]
            });
        }

        try {
            const config = await getGuildConfig(messageOrInteraction.guildId);
            await resetUserBalance(messageOrInteraction.guildId, targetUser.id, type);

            const typeText = type === 'all' ? 'balances' : `${type} balance`;
            await messageOrInteraction.reply({
                embeds: [embed.success('Balance Reset', `Successfully reset ${targetUser}'s ${typeText}!`)]
            });
        } catch (error) {
            await messageOrInteraction.reply({
                embeds: [embed.error('Operation Failed', error.message)]
            });
        }
    }
};
