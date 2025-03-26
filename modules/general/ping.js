const { SlashCommandBuilder } = require('discord.js');
const embed = require('../../config/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with bot latency'),
    
    async execute(messageOrInteraction, args) {
        const startTime = Date.now();
        const isSlashCommand = messageOrInteraction.reply && messageOrInteraction.editReply;
        
        if (isSlashCommand) {
            const reply = await messageOrInteraction.reply({ 
                embeds: [embed.info('Pinging...', 'Calculating latency...')], 
                fetchReply: true 
            });
            const latency = Date.now() - startTime;
            const apiLatency = Math.round(messageOrInteraction.client.ws.ping);
            await messageOrInteraction.editReply({ 
                embeds: [embed.success('Pong!', `Latency: ${latency}ms\nAPI Latency: ${apiLatency}ms`)]
            });
        } else {
            const sent = await messageOrInteraction.reply({ 
                embeds: [embed.info('Pinging...', 'Calculating latency...')] 
            });
            const latency = Date.now() - startTime;
            const apiLatency = Math.round(messageOrInteraction.client.ws.ping);
            await sent.edit({ 
                embeds: [embed.success('Pong!', `Latency: ${latency}ms\nAPI Latency: ${apiLatency}ms`)]
            });
        }
    }
};
