const embed = require('../../config/embed');

const DEV_IDS = [
    '730478491513913416', '866244957219323944', '204625571865427968' 
];

module.exports = {
    async execute(messageOrInteraction, args) {
        const userId = messageOrInteraction.user?.id || messageOrInteraction.author?.id;
        
        if (!DEV_IDS.includes(userId)) {
            return;
        }

        const client = messageOrInteraction.client;
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const totalHumans = client.guilds.cache.reduce((acc, guild) => acc + guild.members.cache.filter(m => !m.user.bot).size, 0);
        const totalBots = client.guilds.cache.reduce((acc, guild) => acc + guild.members.cache.filter(m => m.user.bot).size, 0);

        const fields = [
            { name: 'Bot Version', value: '1.0.0', inline: true },
            { name: 'Node.js Version', value: process.version, inline: true },
            { name: 'Discord.js Version', value: require('discord.js').version, inline: true },
            { name: 'Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: 'Servers', value: client.guilds.cache.size.toString(), inline: true },
            { name: 'Total Members', value: totalMembers.toLocaleString(), inline: true },
            { name: 'Total Humans', value: totalHumans.toLocaleString(), inline: true },
            { name: 'Total Bots', value: totalBots.toLocaleString(), inline: true },
            { name: 'Memory Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
            { name: 'Commands', value: client.commands.size.toString(), inline: true },
            { name: 'Slash Commands', value: client.commands.filter(cmd => cmd.data).size.toString(), inline: true }
        ];

        await messageOrInteraction.reply({
            embeds: [embed.info('Bot Development Information', 'Here are the current bot statistics:', fields)]
        });
    }
};
