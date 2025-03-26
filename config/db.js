const mysql = require('mysql2/promise');
const config = require('./config');

let pool;

async function connectDatabase() {
    if (!config.database.database) {
        throw new Error('Database name is not configured. Please set DB_NAME in your .env file.');
    }

    pool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    await createTables();
    return pool;
}

async function createTables() {
    const connection = await pool.getConnection();
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS guild_prefixes (
                guild_id VARCHAR(255) PRIMARY KEY,
                prefix VARCHAR(10) NOT NULL DEFAULT '!'
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS guild_configs (
                guild_id VARCHAR(255) PRIMARY KEY,
                currency_name VARCHAR(50) NOT NULL DEFAULT 'coins',
                currency_emoji VARCHAR(20) NOT NULL DEFAULT '💰',
                command_cooldown INT NOT NULL DEFAULT 3,
                daily_cooldown INT NOT NULL DEFAULT 86400,
                work_cooldown INT NOT NULL DEFAULT 3600,
                work_min_amount INT NOT NULL DEFAULT 10,
                work_max_amount INT NOT NULL DEFAULT 100,
                daily_amount INT NOT NULL DEFAULT 1000,
                starting_balance INT NOT NULL DEFAULT 1000,
                max_balance BIGINT NOT NULL DEFAULT 1000000000,
                interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                interest_cooldown INT NOT NULL DEFAULT 86400,
                rob_chance DECIMAL(5,2) NOT NULL DEFAULT 30.00,
                rob_cooldown INT NOT NULL DEFAULT 3600,
                rob_min_amount INT NOT NULL DEFAULT 100,
                rob_max_amount INT NOT NULL DEFAULT 1000,
                shop_enabled BOOLEAN NOT NULL DEFAULT true,
                gambling_enabled BOOLEAN NOT NULL DEFAULT true,
                rob_enabled BOOLEAN NOT NULL DEFAULT true,
                work_enabled BOOLEAN NOT NULL DEFAULT true,
                daily_enabled BOOLEAN NOT NULL DEFAULT true,
                interest_enabled BOOLEAN NOT NULL DEFAULT true,
                FOREIGN KEY (guild_id) REFERENCES guild_prefixes(guild_id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_balances (
                guild_id VARCHAR(255),
                user_id VARCHAR(255),
                balance BIGINT NOT NULL DEFAULT 0,
                last_daily TIMESTAMP NULL,
                last_work TIMESTAMP NULL,
                last_rob TIMESTAMP NULL,
                last_interest TIMESTAMP NULL,
                PRIMARY KEY (guild_id, user_id),
                FOREIGN KEY (guild_id) REFERENCES guild_prefixes(guild_id) ON DELETE CASCADE
            )
        `);
    } finally {
        connection.release();
    }
}

async function getGuildPrefix(guildId) {
    const [rows] = await pool.query('SELECT prefix FROM guild_prefixes WHERE guild_id = ?', [guildId]);
    return rows.length > 0 ? rows[0].prefix : '!';
}

async function setGuildPrefix(guildId, prefix) {
    await pool.query(
        'INSERT INTO guild_prefixes (guild_id, prefix) VALUES (?, ?) ON DUPLICATE KEY UPDATE prefix = ?',
        [guildId, prefix, prefix]
    );
}

async function getGuildConfig(guildId) {
    // First ensure the guild prefix exists
    await setGuildPrefix(guildId, '!');
    
    const [rows] = await pool.query('SELECT * FROM guild_configs WHERE guild_id = ?', [guildId]);
    if (rows.length === 0) {
        await pool.query(
            'INSERT INTO guild_configs (guild_id) VALUES (?)',
            [guildId]
        );
        return getGuildConfig(guildId);
    }
    return rows[0];
}

async function updateGuildConfig(guildId, updates) {
    // First ensure the guild prefix exists
    await setGuildPrefix(guildId, '!');

    const validFields = [
        'currency_name', 'currency_emoji', 'command_cooldown', 'daily_cooldown',
        'work_cooldown', 'work_min_amount', 'work_max_amount', 'daily_amount',
        'starting_balance', 'max_balance', 'interest_rate', 'interest_cooldown',
        'rob_chance', 'rob_cooldown', 'rob_min_amount', 'rob_max_amount',
        'shop_enabled', 'gambling_enabled', 'rob_enabled', 'work_enabled',
        'daily_enabled', 'interest_enabled'
    ];

    const setClause = Object.keys(updates)
        .filter(key => validFields.includes(key))
        .map(key => `${key} = ?`)
        .join(', ');

    if (!setClause) return false;

    const values = Object.entries(updates)
        .filter(([key]) => validFields.includes(key))
        .map(([_, value]) => value);

    values.push(guildId);

    await pool.query(
        `UPDATE guild_configs SET ${setClause} WHERE guild_id = ?`,
        values
    );

    return true;
}

module.exports = {
    connectDatabase,
    getGuildPrefix,
    setGuildPrefix,
    getGuildConfig,
    updateGuildConfig
};
