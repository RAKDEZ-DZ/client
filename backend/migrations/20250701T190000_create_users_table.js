// Migration: create_users_table
// Créée le: 2025-07-01T19:00:00.000Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        // Table des utilisateurs
        await db.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
                permissions JSONB DEFAULT '[]'::jsonb,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                created_by INTEGER REFERENCES users(id)
            );
        `);

        // Créer des index pour les recherches rapides
        await db.query(`
            CREATE INDEX idx_users_email ON users(email);
        `);
        await db.query(`
            CREATE INDEX idx_users_username ON users(username);
        `);
        await db.query(`
            CREATE INDEX idx_users_role ON users(role);
        `);
        await db.query(`
            CREATE INDEX idx_users_is_active ON users(is_active);
        `);

        // Insérer l'utilisateur admin par défaut
        await db.query(`
            INSERT INTO users (username, email, password_hash, role, permissions, is_active)
            VALUES (
                'admin',
                'admin@oussamatravel.com',
                '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: admin123
                'admin',
                '["factures", "clients", "paiements", "dossiers_voyage", "users"]'::jsonb,
                true
            );
        `);

        console.log('✅ Table users créée avec succès');
        console.log('✅ Utilisateur admin créé: admin@oussamatravel.com / admin123');
    },

    // Fonction de rollback de la migration
    down: async (db) => {
        await db.query('DROP TABLE IF EXISTS users CASCADE;');
        console.log('✅ Table users supprimée');
    }
};
