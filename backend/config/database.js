const { Pool } = require('pg');
require('dotenv').config();

// Configuration de la connexion PostgreSQL
let poolConfig;

if (process.env.DATABASE_URL) {
    poolConfig = {
        connectionString: process.env.DATABASE_URL
    };
} else {
    poolConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
    };
    
    // Ajouter le mot de passe seulement s'il est défini
    if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim() !== '') {
        poolConfig.password = process.env.DB_PASSWORD;
    }
}

console.log('Configuration de connexion à la base de données:', 
    { ...poolConfig, password: poolConfig.password ? '***' : undefined });

const pool = new Pool(poolConfig);

// Test de connexion
pool.on('connect', () => {
    console.log('✅ Connexion à PostgreSQL établie');
});

pool.on('error', (err) => {
    console.error('❌ Erreur de connexion PostgreSQL:', err);
});

// Fonction pour exécuter des requêtes
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('🔍 Requête exécutée', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la requête:', error);
        throw error;
    }
};

// Fonction pour obtenir un client de la pool
const getClient = async () => {
    return await pool.connect();
};

module.exports = {
    query,
    getClient,
    pool
};
