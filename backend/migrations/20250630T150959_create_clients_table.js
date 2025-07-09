// Migration: create_clients_table
// Créée le: 2025-06-30T15:09:59.627Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        await db.query(`
            CREATE TABLE clients (
                id SERIAL PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                telephone VARCHAR(20),
                adresse TEXT,
                date_naissance DATE,
                nationalite VARCHAR(50),
                numero_passeport VARCHAR(50) UNIQUE,
                date_expiration_passeport DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Créer un index sur l'email pour les recherches rapides
        await db.query(`
            CREATE INDEX idx_clients_email ON clients(email);
        `);
        
        console.log('✅ Table clients créée avec succès');
    },

    // Fonction de rollback de la migration (optionnel)
    down: async (db) => {
        await db.query('DROP TABLE IF EXISTS clients CASCADE;');
        console.log('✅ Table clients supprimée');
    }
};
