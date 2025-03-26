const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildPrefix, setGuildPrefix } = require('../../config/db');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Manage the server prefix')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the current prefix'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a new prefix')
                .addStringOption(option =>
                    option
                        .setName('prefix')
                        .setDescription('The new prefix to use')
                        .setRequired(true)
                        .setMaxLength(10))),

    async execute(messageOrInteraction, args) {
        const isSlashCommand = messageOrInteraction.reply && messageOrInteraction.editReply;
        
        if (isSlashCommand) {
            const subcommand = messageOrInteraction.options.getSubcommand();
            
            if (subcommand === 'view') {
                const prefix = await getGuildPrefix(messageOrInteraction.guildId);
                await messageOrInteraction.reply({ 
                    embeds: [embed.info('Server Prefix', `The current prefix is: \`${prefix}\``)]
                });
            } else if (subcommand === 'set') {
                const newPrefix = messageOrInteraction.options.getString('prefix');
                
                if (newPrefix.length > 10) {
                    return messageOrInteraction.reply({ 
                        embeds: [embed.error('Invalid Prefix', 'Prefix cannot be longer than 10 characters!')],
                        ephemeral: true 
                    });
                }

                await setGuildPrefix(messageOrInteraction.guildId, newPrefix);
                await messageOrInteraction.reply({ 
                    embeds: [embed.success('Prefix Updated', `Prefix has been set to: \`${newPrefix}\``)]
                });
            }
        } else {
            if (!messageOrInteraction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return messageOrInteraction.reply({ 
                    embeds: [embed.error('Permission Denied', 'You need Manage Server permissions to use this command.')]
                });
            }

            if (!args.length) {
                const prefix = await getGuildPrefix(messageOrInteraction.guildId);
                return messageOrInteraction.reply({ 
                    embeds: [embed.info('Server Prefix', `The current prefix is: \`${prefix}\``)]
                });
            }

            const newPrefix = args[0];
            if (newPrefix.length > 10) {
                return messageOrInteraction.reply({ 
                    embeds: [embed.error('Invalid Prefix', 'Prefix cannot be longer than 10 characters!')]
                });
            }

            await setGuildPrefix(messageOrInteraction.guildId, newPrefix);
            await messageOrInteraction.reply({ 
                embeds: [embed.success('Prefix Updated', `Prefix has been set to: \`${newPrefix}\``)]
            });
        }
    }
}; 