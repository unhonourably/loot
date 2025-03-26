const mysql = require('mysql2');
const config = require('./config');

const pool = mysql.createPool({
    ...config.database,
    waitForConnections: true,
    connectionLimit: 200,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

const promisePool = pool.promise();

async function connectDatabase() {
    try {
        const connection = await promisePool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                userId VARCHAR(255) PRIMARY KEY,
                balance BIGINT DEFAULT ${config.economy.startingBalance},
                lastDaily DATETIME,
                lastWork DATETIME,
                inventory JSON
            )
        `);
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS guilds (
                guildId VARCHAR(255) PRIMARY KEY,
                prefix VARCHAR(10) DEFAULT '!',
                settings JSON
            )
        `);
        connection.release();
    } catch (error) {
        throw new Error(`Database connection failed: ${error.message}`);
    }
}

async function getUser(userId) {
    const [rows] = await promisePool.query('SELECT * FROM users WHERE userId = ?', [userId]);
    return rows[0];
}

async function createUser(userId) {
    await promisePool.query('INSERT INTO users (userId) VALUES (?)', [userId]);
    return getUser(userId);
}

async function updateUser(userId, updates) {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), userId];
    await promisePool.query(`UPDATE users SET ${setClause} WHERE userId = ?`, values);
    return getUser(userId);
}

async function getGuildPrefix(guildId) {
    const [rows] = await promisePool.query('SELECT prefix FROM guilds WHERE guildId = ?', [guildId]);
    return rows[0]?.prefix || config.prefix;
}

async function setGuildPrefix(guildId, prefix) {
    await promisePool.query(
        'INSERT INTO guilds (guildId, prefix) VALUES (?, ?) ON DUPLICATE KEY UPDATE prefix = ?',
        [guildId, prefix, prefix]
    );
    return getGuildPrefix(guildId);
}

module.exports = { 
    connectDatabase, 
    getUser, 
    createUser, 
    updateUser, 
    getGuildPrefix,
    setGuildPrefix,
    pool: promisePool 
};
