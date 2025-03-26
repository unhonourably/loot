const { EmbedBuilder } = require('discord.js');

const defaultColors = {
    success: '#00ff00',
    error: '#ff0000',
    info: '#0099ff',
    warning: '#ffff00',
    default: '#2b2d31'
};

let customColors = { ...defaultColors };

const embed = {
    success: (title, description, fields = []) => {
        return new EmbedBuilder()
            .setColor(customColors.success)
            .setTitle(title)
            .setDescription(description)
            .addFields(fields)
            .setTimestamp();
    },
    
    error: (title, description, fields = []) => {
        return new EmbedBuilder()
            .setColor(customColors.error)
            .setTitle(title)
            .setDescription(description)
            .addFields(fields)
            .setTimestamp();
    },
    
    info: (title, description, fields = []) => {
        return new EmbedBuilder()
            .setColor(customColors.info)
            .setTitle(title)
            .setDescription(description)
            .addFields(fields)
            .setTimestamp();
    },
    
    warning: (title, description, fields = []) => {
        return new EmbedBuilder()
            .setColor(customColors.warning)
            .setTitle(title)
            .setDescription(description)
            .addFields(fields)
            .setTimestamp();
    },
    
    default: (title, description, fields = []) => {
        return new EmbedBuilder()
            .setColor(customColors.default)
            .setTitle(title)
            .setDescription(description)
            .addFields(fields)
            .setTimestamp();
    },

    setColor: (type, color) => {
        if (defaultColors[type]) {
            customColors[type] = color;
            return true;
        }
        return false;
    },

    resetColors: () => {
        customColors = { ...defaultColors };
    },

    getColors: () => {
        return { ...customColors };
    }
};

module.exports = embed;
