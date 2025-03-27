const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { getLeaderboard, getGuildConfig, getUserPosition } = require('../../config/db');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server\'s wealth leaderboard')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Type of leaderboard to view')
                .setRequired(false)
                .addChoices(
                    { name: 'Total', value: 'total' },
                    { name: 'Wallet', value: 'wallet' },
                    { name: 'Bank', value: 'bank' }
                ))
        .addIntegerOption(option =>
            option
                .setName('page')
                .setDescription('Page number to view')
                .setRequired(false)),

    async execute(messageOrInteraction, args) {
        let type, page;
        const userId = messageOrInteraction.user?.id || messageOrInteraction.author?.id;

        if (messageOrInteraction.reply && messageOrInteraction.editReply) {
            type = messageOrInteraction.options.getString('type') || 'total';
            page = messageOrInteraction.options.getInteger('page') || 1;
        } else {
            type = args[0]?.toLowerCase() || 'total';
            page = parseInt(args[1]) || 1;
        }

        if (!['wallet', 'bank', 'total'].includes(type)) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Type', 'Please specify either "wallet", "bank", or "total"')]
            });
        }

        if (isNaN(page) || page < 1) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Page', 'Please provide a valid page number.')]
            });
        }

        try {
            const leaderboard = await getLeaderboard(messageOrInteraction.guildId, type, page);
            const config = await getGuildConfig(messageOrInteraction.guildId);
            const userPosition = await getUserPosition(messageOrInteraction.guildId, userId, type);

            if (leaderboard.users.length === 0) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('No Data', 'No users found on the leaderboard.')]
                });
            }

            const typeText = type === 'total' ? 'Total Balance' : type.charAt(0).toUpperCase() + type.slice(1);
            const description = leaderboard.users.map((user, index) => {
                const position = (page - 1) * 10 + index + 1;
                const medal = position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : '•';
                return `${medal} **${position}.** <@${user.user_id}> - ${config.currency_emoji} ${user.balance.toLocaleString()} ${config.currency_name}`;
            }).join('\n');

            const footer = userPosition ? `Your Position: #${userPosition}` : '';

            const firstButton = new ButtonBuilder()
                .setCustomId(`lb_first_${type}`)
                .setLabel('First')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1);

            const prevButton = new ButtonBuilder()
                .setCustomId(`lb_prev_${type}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 1);

            const nextButton = new ButtonBuilder()
                .setCustomId(`lb_next_${type}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === leaderboard.pages);

            const lastButton = new ButtonBuilder()
                .setCustomId(`lb_last_${type}`)
                .setLabel('Last')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === leaderboard.pages);

            const row = new ActionRowBuilder()
                .addComponents(firstButton, prevButton, nextButton, lastButton);

            const response = {
                embeds: [embed.info(`${typeText} Leaderboard`, description, [], footer)],
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
                if (!interaction.customId.startsWith('lb_')) return;
                if (interaction.user.id !== userId) {
                    return interaction.reply({
                        embeds: [embed.error('Not Authorized', 'Only the command user can use these buttons.')],
                        ephemeral: true
                    });
                }

                const [_, action, type] = interaction.customId.split('_');
                let newPage = page;

                switch (action) {
                    case 'first':
                        newPage = 1;
                        break;
                    case 'prev':
                        newPage = Math.max(1, page - 1);
                        break;
                    case 'next':
                        newPage = Math.min(leaderboard.pages, page + 1);
                        break;
                    case 'last':
                        newPage = leaderboard.pages;
                        break;
                }

                if (newPage !== page) {
                    const newLeaderboard = await getLeaderboard(messageOrInteraction.guildId, type, newPage);
                    const newDescription = newLeaderboard.users.map((user, index) => {
                        const position = (newPage - 1) * 10 + index + 1;
                        const medal = position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : '•';
                        return `${medal} **${position}.** <@${user.user_id}> - ${config.currency_emoji} ${user.balance.toLocaleString()} ${config.currency_name}`;
                    }).join('\n');

                    const newFooter = userPosition ? `Your Position: #${userPosition}` : '';

                    firstButton.setDisabled(newPage === 1);
                    prevButton.setDisabled(newPage === 1);
                    nextButton.setDisabled(newPage === newLeaderboard.pages);
                    lastButton.setDisabled(newPage === newLeaderboard.pages);

                    await interaction.update({
                        embeds: [embed.info(`${typeText} Leaderboard`, newDescription, [], newFooter)],
                        components: [row]
                    });
                }
            });

            collector.on('end', () => {
                firstButton.setDisabled(true);
                prevButton.setDisabled(true);
                nextButton.setDisabled(true);
                lastButton.setDisabled(true);
                messageOrInteraction.editReply({ components: [row] }).catch(() => {});
            });
        } catch (error) {
            await messageOrInteraction.reply({
                embeds: [embed.error('Operation Failed', error.message)]
            });
        }
    }
}; 