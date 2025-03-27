const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { cleanLeaderboard } = require('../../config/db');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleanleaderboard')
        .setDescription('Remove entries for users who have left the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(messageOrInteraction, args) {
        if (!messageOrInteraction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Permission Denied', 'You need Manage Server permissions to use this command.')]
            });
        }

        try {
            const result = await cleanLeaderboard(messageOrInteraction.guildId, messageOrInteraction.guild);
            await messageOrInteraction.reply({
                embeds: [embed.success('Leaderboard Cleaned', `Successfully removed ${result.removed} entries for users who have left the server.`)]
            });
        } catch (error) {
            await messageOrInteraction.reply({
                embeds: [embed.error('Operation Failed', error.message)]
            });
        }
    }
};
