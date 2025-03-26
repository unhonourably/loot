const fs = require('fs').promises;
const path = require('path');

async function loadCommands(client) {
    const modulesPath = path.join(__dirname);
    const modules = await fs.readdir(modulesPath);
    const slashCommands = [];

    for (const module of modules) {
        const modulePath = path.join(modulesPath, module);
        const stat = await fs.stat(modulePath);

        if (stat.isDirectory()) {
            const commandFiles = await fs.readdir(modulePath);
            
            for (const file of commandFiles) {
                if (!file.endsWith('.js')) continue;
                
                const filePath = path.join(modulePath, file);
                const command = require(filePath);
                
                if ('execute' in command) {
                    const commandName = command.data ? command.data.name : file.replace('.js', '');
                    client.commands.set(commandName, command);
                    
                    if (command.data) {
                        const commandData = command.data.toJSON();
                        slashCommands.push(commandData);
                        console.log(`Loaded slash command: ${commandName} from ${module}`);
                    } else {
                        console.log(`Loaded prefix command: ${commandName} from ${module}`);
                    }
                } else {
                    console.warn(`Command at ${filePath} is missing execute function`);
                }
            }
        }
    }

    if (slashCommands.length > 0) {
        console.log(`Registering ${slashCommands.length} slash commands...`);
    }

    return slashCommands;
}

module.exports = { loadCommands }; 