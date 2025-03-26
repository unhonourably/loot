const { loadCommands } = require('../modules/commandLoader');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        
        client.user.setActivity('economy', { type: 'PLAYING' });
        
        try {
            const slashCommands = await loadCommands(client);
            await client.application.commands.set(slashCommands);
            console.log('Slash commands registered');
        } catch (error) {
            console.error('Failed to register slash commands:', error);
        }
    }
}; 