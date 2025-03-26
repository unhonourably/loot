const mysql = require('mysql2/promise');
const config = require('./config/config');

async function setupDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: config.database.host,
            user: config.database.user,
            password: config.database.password
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database.database}`);
        console.log(`Database ${config.database.database} created or already exists`);

        await connection.query(`USE ${config.database.database}`);
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                userId VARCHAR(255) PRIMARY KEY,
                balance BIGINT DEFAULT ${config.economy.startingBalance},
                lastDaily DATETIME,
                lastWork DATETIME,
                inventory JSON
            )
        `);
        console.log('Users table created or already exists');

        await connection.end();
        console.log('Database setup completed successfully');
    } catch (error) {
        console.error('Error setting up database:', error);
        process.exit(1);
    }
}

setupDatabase(); 