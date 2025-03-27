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
                wallet_balance BIGINT NOT NULL DEFAULT 0,
                bank_balance BIGINT NOT NULL DEFAULT 0,
                last_daily TIMESTAMP NULL,
                last_work TIMESTAMP NULL,
                last_rob TIMESTAMP NULL,
                last_interest TIMESTAMP NULL,
                PRIMARY KEY (guild_id, user_id),
                FOREIGN KEY (guild_id) REFERENCES guild_prefixes(guild_id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_daily (
                guild_id VARCHAR(255),
                user_id VARCHAR(255),
                last_daily INT NOT NULL DEFAULT 0,
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

async function getUserBalance(guildId, userId) {
    const [rows] = await pool.query(
        'SELECT * FROM user_balances WHERE guild_id = ? AND user_id = ?',
        [guildId, userId]
    );

    if (rows.length === 0) {
        const config = await getGuildConfig(guildId);
        await pool.query(
            'INSERT INTO user_balances (guild_id, user_id, wallet_balance, bank_balance) VALUES (?, ?, ?, 0)',
            [guildId, userId, config.starting_balance]
        );
        return {
            wallet: config.starting_balance,
            bank: 0
        };
    }

    return {
        wallet: rows[0].wallet_balance,
        bank: rows[0].bank_balance
    };
}

async function transferMoney(guildId, userId, amount, toBank = true) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            'SELECT * FROM user_balances WHERE guild_id = ? AND user_id = ? FOR UPDATE',
            [guildId, userId]
        );

        if (rows.length === 0) {
            throw new Error('User not found');
        }

        const currentBalance = toBank ? rows[0].wallet_balance : rows[0].bank_balance;
        if (currentBalance < amount) {
            throw new Error('Insufficient funds');
        }

        const config = await getGuildConfig(guildId);
        if (toBank && rows[0].bank_balance + amount > config.max_balance) {
            throw new Error('Bank balance would exceed maximum limit');
        }

        if (toBank) {
            await connection.query(
                'UPDATE user_balances SET wallet_balance = wallet_balance - ?, bank_balance = bank_balance + ? WHERE guild_id = ? AND user_id = ?',
                [amount, amount, guildId, userId]
            );
        } else {
            await connection.query(
                'UPDATE user_balances SET wallet_balance = wallet_balance + ?, bank_balance = bank_balance - ? WHERE guild_id = ? AND user_id = ?',
                [amount, amount, guildId, userId]
            );
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function resetUserBalance(guildId, userId, type) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            'SELECT * FROM user_balances WHERE guild_id = ? AND user_id = ? FOR UPDATE',
            [guildId, userId]
        );

        if (rows.length === 0) {
            throw new Error('User not found');
        }

        switch (type) {
            case 'wallet':
                await connection.query(
                    'UPDATE user_balances SET wallet_balance = 0 WHERE guild_id = ? AND user_id = ?',
                    [guildId, userId]
                );
                break;
            case 'bank':
                await connection.query(
                    'UPDATE user_balances SET bank_balance = 0 WHERE guild_id = ? AND user_id = ?',
                    [guildId, userId]
                );
                break;
            case 'all':
                await connection.query(
                    'UPDATE user_balances SET wallet_balance = 0, bank_balance = 0 WHERE guild_id = ? AND user_id = ?',
                    [guildId, userId]
                );
                break;
            default:
                throw new Error('Invalid reset type');
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function giveMoney(guildId, userId, amount, type) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            'SELECT * FROM user_balances WHERE guild_id = ? AND user_id = ? FOR UPDATE',
            [guildId, userId]
        );

        if (rows.length === 0) {
            const config = await getGuildConfig(guildId);
            await connection.query(
                'INSERT INTO user_balances (guild_id, user_id, wallet_balance, bank_balance) VALUES (?, ?, ?, ?)',
                [guildId, userId, type === 'wallet' ? amount : 0, type === 'bank' ? amount : 0]
            );
        } else {
            const config = await getGuildConfig(guildId);
            const newBalance = rows[0][`${type}_balance`] + amount;
            
            if (newBalance > config.max_balance) {
                throw new Error('Amount would exceed maximum balance limit');
            }

            await connection.query(
                `UPDATE user_balances SET ${type}_balance = ${type}_balance + ? WHERE guild_id = ? AND user_id = ?`,
                [amount, guildId, userId]
            );
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function addMoneyToRole(guildId, roleId, amount, type) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const config = await getGuildConfig(guildId);
        const maxBalance = config.max_balance;

        const [rows] = await connection.query(
            'SELECT user_id FROM user_balances WHERE guild_id = ?',
            [guildId]
        );

        let successCount = 0;
        let failCount = 0;

        for (const row of rows) {
            try {
                const currentBalance = row[`${type}_balance`];
                const newBalance = currentBalance + amount;

                if (newBalance > maxBalance) {
                    failCount++;
                    continue;
                }

                await connection.query(
                    `UPDATE user_balances SET ${type}_balance = ${type}_balance + ? WHERE guild_id = ? AND user_id = ?`,
                    [amount, guildId, row.user_id]
                );
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        await connection.commit();
        return { successCount, failCount };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function removeMoneyFromRole(guildId, roleId, amount, type) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            'SELECT user_id FROM user_balances WHERE guild_id = ?',
            [guildId]
        );

        let successCount = 0;
        let failCount = 0;

        for (const row of rows) {
            try {
                if (type === 'all') {
                    const totalBalance = row.wallet_balance + row.bank_balance;
                    if (totalBalance < amount) {
                        failCount++;
                        continue;
                    }

             
                    if (row.bank_balance >= amount) {
                        await connection.query(
                            'UPDATE user_balances SET bank_balance = bank_balance - ? WHERE guild_id = ? AND user_id = ?',
                            [amount, guildId, row.user_id]
                        );
                    } else {
                        const remainingAmount = amount - row.bank_balance;
                        await connection.query(
                            'UPDATE user_balances SET bank_balance = 0, wallet_balance = wallet_balance - ? WHERE guild_id = ? AND user_id = ?',
                            [remainingAmount, guildId, row.user_id]
                        );
                    }
                } else {
                    const currentBalance = row[`${type}_balance`];
                    if (currentBalance < amount) {
                        failCount++;
                        continue;
                    }

                    await connection.query(
                        `UPDATE user_balances SET ${type}_balance = ${type}_balance - ? WHERE guild_id = ? AND user_id = ?`,
                        [amount, guildId, row.user_id]
                    );
                }
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        await connection.commit();
        return { successCount, failCount };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function removeMoney(guildId, userId, amount, type) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            'SELECT * FROM user_balances WHERE guild_id = ? AND user_id = ? FOR UPDATE',
            [guildId, userId]
        );

        if (rows.length === 0) {
            throw new Error('User not found');
        }

        if (type === 'all') {
            const totalBalance = rows[0].wallet_balance + rows[0].bank_balance;
            if (totalBalance < amount) {
                throw new Error('Insufficient total balance');
            }

       
            if (rows[0].bank_balance >= amount) {
                await connection.query(
                    'UPDATE user_balances SET bank_balance = bank_balance - ? WHERE guild_id = ? AND user_id = ?',
                    [amount, guildId, userId]
                );
            } else {
                const remainingAmount = amount - rows[0].bank_balance;
                await connection.query(
                    'UPDATE user_balances SET bank_balance = 0, wallet_balance = wallet_balance - ? WHERE guild_id = ? AND user_id = ?',
                    [remainingAmount, guildId, userId]
                );
            }
        } else {
            const currentBalance = rows[0][`${type}_balance`];
            if (currentBalance < amount) {
                throw new Error(`Insufficient ${type} balance`);
            }

            await connection.query(
                `UPDATE user_balances SET ${type}_balance = ${type}_balance - ? WHERE guild_id = ? AND user_id = ?`,
                [amount, guildId, userId]
            );
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getLeaderboard(guildId, type, page = 1) {
    const perPage = 10;
    const offset = (page - 1) * perPage;

    let query;
    let params = [guildId];

    switch (type) {
        case 'wallet':
            query = `
                SELECT user_id, wallet_balance as balance 
                FROM user_balances 
                WHERE guild_id = ? 
                ORDER BY wallet_balance DESC 
                LIMIT ? OFFSET ?
            `;
            params.push(perPage, offset);
            break;
        case 'bank':
            query = `
                SELECT user_id, bank_balance as balance 
                FROM user_balances 
                WHERE guild_id = ? 
                ORDER BY bank_balance DESC 
                LIMIT ? OFFSET ?
            `;
            params.push(perPage, offset);
            break;
        case 'total':
        default:
            query = `
                SELECT user_id, (wallet_balance + bank_balance) as balance 
                FROM user_balances 
                WHERE guild_id = ? 
                ORDER BY (wallet_balance + bank_balance) DESC 
                LIMIT ? OFFSET ?
            `;
            params.push(perPage, offset);
            break;
    }

    const [rows] = await pool.query(query, params);
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM user_balances WHERE guild_id = ?', [guildId]);
    
    return {
        users: rows,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / perPage),
        currentPage: page
    };
}

async function addMoney(guildId, userId, amount, type) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            'SELECT * FROM user_balances WHERE guild_id = ? AND user_id = ?',
            [guildId, userId]
        );

        if (rows.length === 0) {
            const guildConfig = await getGuildConfig(guildId);
            await connection.execute(
                'INSERT INTO user_balances (guild_id, user_id, wallet_balance, bank_balance) VALUES (?, ?, ?, ?)',
                [guildId, userId, guildConfig.starting_balance, 0]
            );
        }

        const column = type === 'wallet' ? 'wallet_balance' : 'bank_balance';
        await connection.execute(
            `UPDATE user_balances SET ${column} = ${column} + ? WHERE guild_id = ? AND user_id = ?`,
            [amount, guildId, userId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getUserPosition(guildId, userId, type) {
    let query;
    switch (type) {
        case 'wallet':
            query = 'SELECT COUNT(*) as position FROM user_balances WHERE guild_id = ? AND wallet_balance > (SELECT wallet_balance FROM user_balances WHERE guild_id = ? AND user_id = ?)';
            break;
        case 'bank':
            query = 'SELECT COUNT(*) as position FROM user_balances WHERE guild_id = ? AND bank_balance > (SELECT bank_balance FROM user_balances WHERE guild_id = ? AND user_id = ?)';
            break;
        case 'total':
        default:
            query = 'SELECT COUNT(*) as position FROM user_balances WHERE guild_id = ? AND (wallet_balance + bank_balance) > (SELECT (wallet_balance + bank_balance) FROM user_balances WHERE guild_id = ? AND user_id = ?)';
    }

    const [rows] = await pool.execute(query, [guildId, guildId, userId]);
    return rows[0].position + 1;
}

async function getUserDaily(guildId, userId) {
    const [rows] = await pool.execute(
        'SELECT * FROM user_daily WHERE guild_id = ? AND user_id = ?',
        [guildId, userId]
    );

    if (rows.length === 0) {
        await pool.execute(
            'INSERT INTO user_daily (guild_id, user_id, last_daily) VALUES (?, ?, 0)',
            [guildId, userId]
        );
        return { last_daily: 0 };
    }

    return rows[0];
}

async function updateUserDaily(guildId, userId) {
    const now = Math.floor(Date.now() / 1000);
    await pool.execute(
        'INSERT INTO user_daily (guild_id, user_id, last_daily) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE last_daily = ?',
        [guildId, userId, now, now]
    );
}

module.exports = {
    connectDatabase,
    getGuildPrefix,
    setGuildPrefix,
    getGuildConfig,
    updateGuildConfig,
    getUserBalance,
    transferMoney,
    resetUserBalance,
    giveMoney,
    addMoneyToRole,
    removeMoneyFromRole,
    removeMoney,
    getLeaderboard,
    addMoney,
    getUserPosition,
    getUserDaily,
    updateUserDaily
};
