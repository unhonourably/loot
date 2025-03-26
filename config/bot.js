const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadEvents } = require('../modules/eventLoader');
const { loadCommands } = require('../modules/commandLoader');
const { connectDatabase } = require('./db');
const config = require('./config');

class Bot {
    constructor() {
        if (!config.token) throw new Error('Discord bot token is missing');
        
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers
            ]
        });

        this.client.commands = new Collection();
        this.client.cooldowns = new Collection();
    }

    async initialize() {
        try {
            await connectDatabase();
            await loadCommands(this.client);
            await loadEvents(this.client);
            this.setupErrorHandlers();
            await this.client.login(config.token);
        } catch (error) {
            console.error('Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    setupErrorHandlers() {
        this.client.on('error', error => console.error('Discord client error:', error));
        process.on('unhandledRejection', error => console.error('Unhandled promise rejection:', error));
        process.on('uncaughtException', error => console.error('Uncaught exception:', error));
        process.on('SIGINT', () => {
            this.client.destroy();
            process.exit(0);
        });
    }
}

module.exports = Bot; 