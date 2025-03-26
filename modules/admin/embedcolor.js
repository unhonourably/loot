const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embedcolor')
        .setDescription('Manage embed colors')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a color for a specific embed type')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('The type of embed')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Success', value: 'success' },
                            { name: 'Error', value: 'error' },
                            { name: 'Info', value: 'info' },
                            { name: 'Warning', value: 'warning' },
                            { name: 'Default', value: 'default' }
                        ))
                .addStringOption(option =>
                    option
                        .setName('color')
                        .setDescription('The hex color code (e.g., #ff0000)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current embed colors'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all colors to default')),

    async execute(messageOrInteraction, args) {
        const isSlashCommand = messageOrInteraction.reply && messageOrInteraction.editReply;
        
        if (isSlashCommand) {
            const subcommand = messageOrInteraction.options.getSubcommand();
            
            if (subcommand === 'set') {
                const type = messageOrInteraction.options.getString('type');
                const color = messageOrInteraction.options.getString('color');
                
                if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    return messageOrInteraction.reply({ 
                        content: 'Please provide a valid hex color code (e.g., #ff0000)', 
                        ephemeral: true 
                    });
                }

                if (embed.setColor(type, color)) {
                    await messageOrInteraction.reply(`Successfully set ${type} embed color to ${color}`);
                } else {
                    await messageOrInteraction.reply({ 
                        content: 'Invalid embed type!', 
                        ephemeral: true 
                    });
                }
            } else if (subcommand === 'view') {
                const colors = embed.getColors();
                const colorList = Object.entries(colors)
                    .map(([type, color]) => `${type}: ${color}`)
                    .join('\n');
                
                await messageOrInteraction.reply(`Current embed colors:\n${colorList}`);
            } else if (subcommand === 'reset') {
                embed.resetColors();
                await messageOrInteraction.reply('All embed colors have been reset to default');
            }
        } else {
            if (!messageOrInteraction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return messageOrInteraction.reply('You need Manage Server permissions to use this command.');
            }

            if (!args.length) {
                const colors = embed.getColors();
                const colorList = Object.entries(colors)
                    .map(([type, color]) => `${type}: ${color}`)
                    .join('\n');
                return messageOrInteraction.reply(`Current embed colors:\n${colorList}`);
            }

            const subcommand = args[0].toLowerCase();
            
            if (subcommand === 'reset') {
                embed.resetColors();
                return messageOrInteraction.reply('All embed colors have been reset to default');
            }
            
            if (subcommand === 'set' && args.length >= 3) {
                const type = args[1].toLowerCase();
                const color = args[2];
                
                if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    return messageOrInteraction.reply('Please provide a valid hex color code (e.g., #ff0000)');
                }

                if (embed.setColor(type, color)) {
                    return messageOrInteraction.reply(`Successfully set ${type} embed color to ${color}`);
                } else {
                    return messageOrInteraction.reply('Invalid embed type!');
                }
            }

            return messageOrInteraction.reply('Invalid command usage. Use !embedcolor [view/set/reset]');
        }
    }
}; 