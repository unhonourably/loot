const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { getGuildPrefix } = require('../../config/db');
const embed = require('../../config/embed');

const categories = {
    economy: {
        name: '💰 Economy',
        description: 'Commands for managing your money and economy features',
        commands: [
            { name: 'balance', description: 'Check your or another user\'s wallet and bank balance' },
            { name: 'daily', description: 'Claim your daily reward' },
            { name: 'deposit', description: 'Deposit money into your bank' },
            { name: 'withdraw', description: 'Withdraw money from your bank' },
            { name: 'give', description: 'Give money to another user' },
            { name: 'leaderboard', description: 'View the server\'s wealth leaderboard (wallet/bank/total)' },
            { name: 'transfer', description: 'Transfer money between wallet and bank' }
        ]
    },
    admin: {
        name: '⚙️ Admin',
        description: 'Administrative commands for server management',
        commands: [
            { name: 'config', description: 'Manage bot configuration (currency, cooldowns, etc.)' },
            { name: 'addmoney', description: 'Add money to a user\'s balance' },
            { name: 'addmoneyrole', description: 'Add money to all users with a specific role' },
            { name: 'removemoney', description: 'Remove money from a user\'s balance' },
            { name: 'removemoneyrole', description: 'Remove money from all users with a specific role' },
            { name: 'reset', description: 'Reset a user\'s balance (wallet/bank/all)' },
            { name: 'prefix', description: 'Change the server\'s command prefix' },
            { name: 'embedcolor', description: 'Customize embed colors for different message types' }
        ]
    },
    general: {
        name: '📋 General',
        description: 'General utility commands',
        commands: [
            { name: 'help', description: 'Show this help message' },
            { name: 'ping', description: 'Check the bot\'s latency' }
        ]
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands')
        .addStringOption(option =>
            option
                .setName('category')
                .setDescription('Category to view')
                .setRequired(false)
                .addChoices(
                    { name: 'Economy', value: 'economy' },
                    { name: 'Admin', value: 'admin' },
                    { name: 'General', value: 'general' }
                )),

    async execute(messageOrInteraction, args) {
        let category = args[0]?.toLowerCase();
        if (messageOrInteraction.reply && messageOrInteraction.editReply) {
            category = messageOrInteraction.options.getString('category')?.toLowerCase();
        }

        if (category && !categories[category]) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Category', 'Please specify a valid category.')]
            });
        }

        const prefix = await getGuildPrefix(messageOrInteraction.guildId);
        const categoryKeys = Object.keys(categories);
        let currentIndex = category ? categoryKeys.indexOf(category) : 0;

        const prevButton = new ButtonBuilder()
            .setCustomId('help_prev')
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentIndex === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId('help_next')
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentIndex === categoryKeys.length - 1);

        const row = new ActionRowBuilder()
            .addComponents(prevButton, nextButton);

        const currentCategory = categoryKeys[currentIndex];
        const categoryInfo = categories[currentCategory];
        const fields = categoryInfo.commands.map(cmd => ({
            name: `\`${cmd.name}\``,
            value: cmd.description,
            inline: false
        }));

        const footer = `Page ${currentIndex + 1} of ${categoryKeys.length}`;
        const response = {
            embeds: [embed.info(categoryInfo.name, categoryInfo.description, fields, footer)],
            components: [row]
        };

        if (messageOrInteraction.reply && messageOrInteraction.editReply) {
            await messageOrInteraction.reply(response);
        } else {
            await messageOrInteraction.reply(response);
        }

        const collector = messageOrInteraction.channel.createMessageComponentCollector({
            time: 300000
        });

        collector.on('collect', async (interaction) => {
            if (!interaction.customId.startsWith('help_')) return;
            if (interaction.user.id !== (messageOrInteraction.user?.id || messageOrInteraction.author?.id)) {
                return interaction.reply({
                    embeds: [embed.error('Not Authorized', 'Only the command user can use these buttons.')],
                    ephemeral: true
                });
            }

            const [_, action] = interaction.customId.split('_');
            let newIndex = currentIndex;

            if (action === 'prev') {
                newIndex = Math.max(0, currentIndex - 1);
            } else if (action === 'next') {
                newIndex = Math.min(categoryKeys.length - 1, currentIndex + 1);
            }

            if (newIndex !== currentIndex) {
                currentIndex = newIndex;
                const newCategory = categoryKeys[currentIndex];
                const newCategoryInfo = categories[newCategory];
                const newFields = newCategoryInfo.commands.map(cmd => ({
                    name: `\`${cmd.name}\``,
                    value: cmd.description,
                    inline: false
                }));

                const newFooter = `Page ${currentIndex + 1} of ${categoryKeys.length}`;
                prevButton.setDisabled(currentIndex === 0);
                nextButton.setDisabled(currentIndex === categoryKeys.length - 1);

                await interaction.update({
                    embeds: [embed.info(newCategoryInfo.name, newCategoryInfo.description, newFields, newFooter)],
                    components: [row]
                });
            }
        });

        collector.on('end', () => {
            prevButton.setDisabled(true);
            nextButton.setDisabled(true);
            messageOrInteraction.editReply({ components: [row] }).catch(() => {});
        });
    }
};
