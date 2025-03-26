const { SlashCommandBuilder } = require('discord.js');
const { transferMoney, getGuildConfig, getUserBalance } = require('../../config/db');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer money between wallet and bank')
        .addStringOption(option =>
            option
                .setName('direction')
                .setDescription('Direction of transfer')
                .setRequired(true)
                .addChoices(
                    { name: 'To Bank', value: 'bank' },
                    { name: 'To Wallet', value: 'wallet' }
                ))
        .addStringOption(option =>
            option
                .setName('amount')
                .setDescription('Amount to transfer (use "all" for all money)')
                .setRequired(true)),

    async execute(messageOrInteraction, args) {
        const isSlashCommand = messageOrInteraction.reply && messageOrInteraction.editReply;
        const user = isSlashCommand ? messageOrInteraction.user : messageOrInteraction.author;

        let direction, amount;
        if (isSlashCommand) {
            direction = messageOrInteraction.options.getString('direction');
            amount = messageOrInteraction.options.getString('amount');
        } else {
            if (args.length < 2) {
                return messageOrInteraction.reply({
                    embeds: [embed.error('Invalid Usage', 'Use !transfer [bank/wallet] [amount/all]')]
                });
            }
            direction = args[0].toLowerCase();
            amount = args[1];
        }

        if (!['bank', 'wallet'].includes(direction)) {
            return messageOrInteraction.reply({
                embeds: [embed.error('Invalid Direction', 'Please specify either "bank" or "wallet"')]
            });
        }

        try {
            const config = await getGuildConfig(messageOrInteraction.guildId);
            const toBank = direction === 'bank';
            
            if (amount.toLowerCase() === 'all') {
                const balance = await getUserBalance(messageOrInteraction.guildId, user.id);
                amount = toBank ? balance.wallet : balance.bank;
            } else {
                amount = parseInt(amount);
                if (isNaN(amount) || amount <= 0) {
                    return messageOrInteraction.reply({
                        embeds: [embed.error('Invalid Amount', 'Please provide a valid positive number or "all"')]
                    });
                }
            }

            await transferMoney(messageOrInteraction.guildId, user.id, amount, toBank);
            
            const newBalance = await getUserBalance(messageOrInteraction.guildId, user.id);
            const fields = [
                { name: 'Wallet', value: `${config.currency_emoji} ${newBalance.wallet.toLocaleString()} ${config.currency_name}`, inline: true },
                { name: 'Bank', value: `${config.currency_emoji} ${newBalance.bank.toLocaleString()} ${config.currency_name}`, inline: true }
            ];

            await messageOrInteraction.reply({
                embeds: [embed.success('Transfer Successful', `Successfully transferred ${config.currency_emoji} ${amount.toLocaleString()} ${config.currency_name} to your ${direction}`, fields)]
            });
        } catch (error) {
            await messageOrInteraction.reply({
                embeds: [embed.error('Transfer Failed', error.message)]
            });
        }
    }
}; 