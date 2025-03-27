const { loadCommands } = require('../modules/commandLoader');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        
        client.user.setActivity('economy', { type: 'PLAYING' });
        
        try {
            const slashCommands = Array.from(client.commands.values())
                .filter(cmd => cmd.data)
                .map(cmd => cmd.data.toJSON());
            
            if (slashCommands.length > 0) {
                await client.application.commands.set(slashCommands);
                console.log('Slash commands registered');
            }

            console.log('Fetching members for all guilds...');
            for (const guild of client.guilds.cache.values()) {
                try {
                    await guild.members.fetch();
                    console.log(`Fetched members for ${guild.name}`);
                } catch (error) {
                    console.error(`Failed to fetch members for ${guild.name}:`, error);
                }
            }
            console.log('Member fetching complete');
        } catch (error) {
            console.error('Failed during startup:', error);
        }
    }
}; 