const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addMoneyToRole, getGuildConfig } = require('../../config/db');
const embed = require('../../config/embed');

function findClosestRole(guild, roleName) {
    const roles = guild.roles.cache;
    let closestRole = null;
    let closestDistance = Infinity;

    roles.forEach(role => {
        const distance = levenshteinDistance(role.name.toLowerCase(), roleName.toLowerCase());
        if (distance < closestDistance) {
            closestDistance = distance;
            closestRole = role;
        }
    });

    return closestRole;
}

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + cost
            );
        }
    }

    return matrix[b.length][a.length];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addmoneyrole')
        .setDescription('Add money to all users with a specific role (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to give money to')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('amount')
                .setDescription('Amount to give')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Where to give the money')
                .setRequired(true)
                .addChoices(
                    { name: 'Wallet', value: 'wallet' },
                    { name: 'Bank', value: 'bank' }
                )),

    async execute(messageOrInteraction, args) {
        const isSlashCommand = messageOrInteraction.reply && messageOrInteraction.editReply;
        
        if (!messageOrInteraction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Permission Denied', 'You need Manage Server permissions to use this command.')]
            });
        }

        let role, amount, type;
        if (isSlashCommand) {
            role = messageOrInteraction.options.getRole('role');
            amount = messageOrInteraction.options.getString('amount');
            type = messageOrInteraction.options.getString('type');
        } else {
            if (args.length < 3) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Invalid Usage', 'Use !addmoneyrole [rolename] [amount] [wallet/bank]\nExample: !addmoneyrole "VIP Member" 1000 wallet')]
                });
            }

            const lastArg = args[args.length - 1].toLowerCase();
            const secondLastArg = args[args.length - 2];
            
            if (!['wallet', 'bank'].includes(lastArg)) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Invalid Type', 'Please specify either "wallet" or "bank"')]
                });
            }

            type = lastArg;
            amount = secondLastArg;
            
            const roleName = args.slice(0, -2).join(' ');
            role = findClosestRole(messageOrInteraction.guild, roleName);
        }

        if (!role) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Role', 'Could not find a matching role. Please check the role name and try again.')]
            });
        }

        amount = parseInt(amount);
        if (isNaN(amount) || amount <= 0) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Amount', 'Please provide a valid positive number.')]
            });
        }

        try {
            const result = await addMoneyToRole(messageOrInteraction.guildId, role.id, amount, type);
            const config = await getGuildConfig(messageOrInteraction.guildId);
            
            await messageOrInteraction.reply({
                embeds: [embed.success('Money Added', 
                    `Successfully added ${config.currency_emoji} ${amount.toLocaleString()} ${config.currency_name} to ${role.name}'s ${type}\n` +
                    `Success: ${result.successCount} users\n` +
                    `Failed: ${result.failCount} users (due to max balance limit)`
                )]
            });
        } catch (error) {
            await messageOrInteraction.reply({
                embeds: [embed.error('Operation Failed', error.message)]
            });
        }
    }
}; 