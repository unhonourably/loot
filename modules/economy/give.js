const { SlashCommandBuilder } = require('discord.js');
const { removeMoney, addMoney, getUserBalance, getGuildConfig } = require('../../config/db');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give money to another user')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to give money to')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Amount of money to give')
                .setRequired(true)),

    async execute(messageOrInteraction, args) {
        let targetUser, amount;
        const userId = messageOrInteraction.user?.id || messageOrInteraction.author?.id;

        if (messageOrInteraction.reply && messageOrInteraction.editReply) {
            targetUser = messageOrInteraction.options.getUser('user');
            amount = messageOrInteraction.options.getInteger('amount');
        } else {
            const userArg = args[0];
            if (!userArg) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Invalid User', 'Please specify a user to give money to.')]
                });
            }

            targetUser = messageOrInteraction.mentions.users.first() || 
                        messageOrInteraction.guild.members.cache.get(userArg)?.user ||
                        messageOrInteraction.guild.members.cache.find(m => m.user.username.toLowerCase() === userArg.toLowerCase())?.user;

            if (!targetUser) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Invalid User', 'Please specify a valid user to give money to.')]
                });
            }

            amount = parseInt(args[1]);
        }

        if (targetUser.bot) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid User', 'You cannot give money to bots.')]
            });
        }

        if (targetUser.id === userId) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid User', 'You cannot give money to yourself.')]
            });
        }

        if (isNaN(amount) || amount <= 0) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Amount', 'Please specify a valid amount greater than 0.')]
            });
        }

        try {
            const config = await getGuildConfig(messageOrInteraction.guildId);
            const userBalance = await getUserBalance(messageOrInteraction.guildId, userId);

            if (userBalance.wallet < amount) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Insufficient Funds', `You don't have enough money in your wallet. You need ${config.currency_emoji} ${amount.toLocaleString()} ${config.currency_name}, but you only have ${config.currency_emoji} ${userBalance.wallet.toLocaleString()} ${config.currency_name} in your wallet.`)]
                });
            }

            await removeMoney(messageOrInteraction.guildId, userId, amount, 'wallet');
            await addMoney(messageOrInteraction.guildId, targetUser.id, amount, 'bank');

            const newBalance = await getUserBalance(messageOrInteraction.guildId, userId);

            await messageOrInteraction.reply({
                embeds: [embed.success('Money Given', `Successfully gave ${config.currency_emoji} ${amount.toLocaleString()} ${config.currency_name} to ${targetUser}!\n\nYour new wallet balance: ${config.currency_emoji} ${newBalance.wallet.toLocaleString()} ${config.currency_name}`)]
            });
        } catch (error) {
            await messageOrInteraction.reply({
                embeds: [embed.error('Operation Failed', error.message)]
            });
        }
    }
}; 