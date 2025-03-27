const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../../config/db');
const embed = require('../../config/embed');

function parseTime(value) {
    const unit = value.slice(-1).toLowerCase();
    const number = parseFloat(value.slice(0, -1));
    
    if (isNaN(number)) return null;
    
    switch (unit) {
        case 's': return number;
        case 'm': return number * 60;
        case 'h': return number * 3600;
        case 'd': return number * 86400;
        default: return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Manage bot configuration')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current configuration'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a configuration value')
                .addStringOption(option =>
                    option
                        .setName('setting')
                        .setDescription('The setting to change')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Currency Name', value: 'currency_name' },
                            { name: 'Currency Emoji', value: 'currency_emoji' },
                            { name: 'Command Cooldown (s/m/h/d)', value: 'command_cooldown' },
                            { name: 'Daily Cooldown (s/m/h/d)', value: 'daily_cooldown' },
                            { name: 'Work Cooldown (s/m/h/d)', value: 'work_cooldown' },
                            { name: 'Work Min Amount', value: 'work_min_amount' },
                            { name: 'Work Max Amount', value: 'work_max_amount' },
                            { name: 'Daily Amount', value: 'daily_amount' },
                            { name: 'Starting Balance', value: 'starting_balance' },
                            { name: 'Max Balance', value: 'max_balance' },
                            { name: 'Interest Rate (%)', value: 'interest_rate' },
                            { name: 'Interest Cooldown (s/m/h/d)', value: 'interest_cooldown' },
                            { name: 'Rob Chance (%)', value: 'rob_chance' },
                            { name: 'Rob Cooldown (s/m/h/d)', value: 'rob_cooldown' },
                            { name: 'Rob Min Amount', value: 'rob_min_amount' },
                            { name: 'Rob Max Amount', value: 'rob_max_amount' },
                            { name: 'Shop Enabled', value: 'shop_enabled' },
                            { name: 'Gambling Enabled', value: 'gambling_enabled' },
                            { name: 'Rob Enabled', value: 'rob_enabled' },
                            { name: 'Work Enabled', value: 'work_enabled' },
                            { name: 'Daily Enabled', value: 'daily_enabled' },
                            { name: 'Interest Enabled', value: 'interest_enabled' }
                        ))
                .addStringOption(option =>
                    option
                        .setName('value')
                        .setDescription('The new value (use s/m/h/d for time values)')
                        .setRequired(true))),

    async execute(messageOrInteraction, args) {
        const isSlashCommand = messageOrInteraction.reply && messageOrInteraction.editReply;
        
        if (isSlashCommand) {
            const subcommand = messageOrInteraction.options.getSubcommand();
            
            if (subcommand === 'view') {
                const config = await getGuildConfig(messageOrInteraction.guildId);
                const fields = Object.entries(config)
                    .filter(([key]) => key !== 'guild_id')
                    .map(([key, value]) => ({
                        name: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                        value: key.endsWith('_enabled') ? (value === 1 ? 'Yes' : 'No') : value.toString(),
                        inline: true
                    }));

                await messageOrInteraction.reply({ 
                    embeds: [embed.info('Server Configuration', 'Current server settings:', fields)]
                });
            } else if (subcommand === 'set') {
                const setting = messageOrInteraction.options.getString('setting');
                let value = messageOrInteraction.options.getString('value');

                if (['shop_enabled', 'gambling_enabled', 'rob_enabled', 'work_enabled', 'daily_enabled', 'interest_enabled'].includes(setting)) {
                    value = value.toLowerCase() === 'true';
                } else if (['command_cooldown', 'daily_cooldown', 'work_cooldown', 'interest_cooldown', 'rob_cooldown'].includes(setting)) {
                    value = parseTime(value);
                    if (value === null) {
                        return messageOrInteraction.reply({ 
                            embeds: [embed.error('Invalid Time Format', 'Please use format: number followed by s (seconds), m (minutes), h (hours), or d (days). Example: 1h, 30m, 3600s')],
                            ephemeral: true 
                        });
                    }
                } else if (['interest_rate', 'rob_chance'].includes(setting)) {
                    value = parseFloat(value);
                } else if (['work_min_amount', 'work_max_amount', 'daily_amount', 'starting_balance', 'max_balance', 'rob_min_amount', 'rob_max_amount'].includes(setting)) {
                    value = parseInt(value);
                }

                if (isNaN(value) && typeof value !== 'boolean') {
                    return messageOrInteraction.reply({ 
                        embeds: [embed.error('Invalid Value', 'Please provide a valid value for this setting.')],
                        ephemeral: true 
                    });
                }

                const success = await updateGuildConfig(messageOrInteraction.guildId, { [setting]: value });
                
                if (success) {
                    await messageOrInteraction.reply({ 
                        embeds: [embed.success('Configuration Updated', `Successfully updated ${setting} to ${value}`)]
                    });
                } else {
                    await messageOrInteraction.reply({ 
                        embeds: [embed.error('Update Failed', 'Failed to update the configuration.')],
                        ephemeral: true 
                    });
                }
            }
        } else {
            if (!messageOrInteraction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return messageOrInteraction.reply({ 
                    embeds: [embed.error('Permission Denied', 'You need Manage Server permissions to use this command.')]
                });
            }

            if (!args.length) {
                const config = await getGuildConfig(messageOrInteraction.guildId);
                const fields = Object.entries(config)
                    .filter(([key]) => key !== 'guild_id')
                    .map(([key, value]) => ({
                        name: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                        value: key.endsWith('_enabled') ? (value === 1 ? 'Yes' : 'No') : value.toString(),
                        inline: true
                    }));

                return messageOrInteraction.reply({ 
                    embeds: [embed.info('Server Configuration', 'Current server settings:', fields)]
                });
            }

            const subcommand = args[0].toLowerCase();
            
            if (subcommand === 'set' && args.length >= 3) {
                const setting = args[1].toLowerCase();
                let value = args[2];

                if (['shop_enabled', 'gambling_enabled', 'rob_enabled', 'work_enabled', 'daily_enabled', 'interest_enabled'].includes(setting)) {
                    value = value.toLowerCase() === 'true';
                } else if (['command_cooldown', 'daily_cooldown', 'work_cooldown', 'interest_cooldown', 'rob_cooldown'].includes(setting)) {
                    value = parseTime(value);
                    if (value === null) {
                        return messageOrInteraction.reply({ 
                            embeds: [embed.error('Invalid Time Format', 'Please use format: number followed by s (seconds), m (minutes), h (hours), or d (days). Example: 1h, 30m, 3600s')]
                        });
                    }
                } else if (['interest_rate', 'rob_chance'].includes(setting)) {
                    value = parseFloat(value);
                } else if (['work_min_amount', 'work_max_amount', 'daily_amount', 'starting_balance', 'max_balance', 'rob_min_amount', 'rob_max_amount'].includes(setting)) {
                    value = parseInt(value);
                }

                if (isNaN(value) && typeof value !== 'boolean') {
                    return messageOrInteraction.reply({ 
                        embeds: [embed.error('Invalid Value', 'Please provide a valid value for this setting.')]
                    });
                }

                const success = await updateGuildConfig(messageOrInteraction.guildId, { [setting]: value });
                
                if (success) {
                    return messageOrInteraction.reply({ 
                        embeds: [embed.success('Configuration Updated', `Successfully updated ${setting} to ${value}`)]
                    });
                } else {
                    return messageOrInteraction.reply({ 
                        embeds: [embed.error('Update Failed', 'Failed to update the configuration.')]
                    });
                }
            }

            return messageOrInteraction.reply({ 
                embeds: [embed.error('Invalid Usage', 'Use !config [view/set] [setting] [value]')]
            });
        }
    }
}; 