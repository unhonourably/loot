module.exports = {
    token: process.env.TOKEN,
    prefix: '!',
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    },
    defaultCooldown: 3,
    economy: {
        startingBalance: 1000,
        dailyAmount: 100,
        workAmount: {
            min: 50,
            max: 200
        }
    }
}; 