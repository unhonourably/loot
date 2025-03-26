require('dotenv').config({ path: __dirname + '/.env' });

console.log('Loading config...');
console.log('Environment variables:', {
    TOKEN: process.env.TOKEN ? 'Present' : 'Missing',
    DB_HOST: process.env.DB_HOST ? 'Present' : 'Missing',
    DB_PORT: process.env.DB_PORT ? 'Present' : 'Missing',
    DB_USER: process.env.DB_USER ? 'Present' : 'Missing',
    DB_PASSWORD: process.env.DB_PASSWORD ? 'Present' : 'Missing',
    DB_NAME: process.env.DB_NAME ? 'Present' : 'Missing'
});

module.exports = {
    token: process.env.TOKEN,
    prefix: '!',
    database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    },
    economy: {
        startingBalance: 1000,
        dailyAmount: 100,
        workAmount: { min: 50, max: 200 }
    }
};

console.log('Config loaded:', {
    token: module.exports.token ? 'Present' : 'Missing',
    database: {
        host: module.exports.database.host ? 'Present' : 'Missing',
        port: module.exports.database.port ? 'Present' : 'Missing',
        user: module.exports.database.user ? 'Present' : 'Missing',
        database: module.exports.database.database ? 'Present' : 'Missing'
    }
}); 