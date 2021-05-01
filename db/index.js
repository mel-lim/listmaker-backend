// CENTRALISED DATABASE INTERACTIONS FILE
// All of our db interactions will come through here

const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const devConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
};

const productionConfig = {
    connectionString: process.env.DATABASE_URL, // This will come from our Heroku addon
    ssl: {
        rejectUnauthorized: false
    }
}

const pool = new Pool(
    process.env.NODE_ENV === "production" ? productionConfig : devConfig
);

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect()
};