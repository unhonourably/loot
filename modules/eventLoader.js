const fs = require('fs').promises;
const path = require('path');

async function loadEvents(client) {
    const listenersPath = path.join(__dirname, '..', 'listeners');
    
    try {
        const files = await fs.readdir(listenersPath);
        
        for (const file of files) {
            if (!file.endsWith('.js')) continue;
            
            const filePath = path.join(listenersPath, file);
            const event = require(filePath);
            
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            
            console.log(`Loaded event: ${event.name}`);
        }
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

module.exports = { loadEvents }; 