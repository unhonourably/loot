const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadEvents } = require('./modules/eventLoader');
const { loadCommands } = require('./modules/commandLoader');
const { connectDatabase } = require('./modules/database');
const { config } = require('./config/config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();
client.cooldowns = new Collection();

(async () => {
    try {
        await connectDatabase();
        await loadEvents(client);
        await loadCommands(client);
        client.login(config.token);
    } catch (error) {
        console.error('Failed to initialize bot:', error);
        process.exit(1);
    }
})();
