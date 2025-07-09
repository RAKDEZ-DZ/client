// Migration: create_dossiers_etudiants_table
// Créée le: 2025-06-30T15:12:43.223Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        await db.query(`
            CREATE TABLE dossiers_etudiants (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                universite_destination VARCHAR(255) NOT NULL,
                pays_destination VARCHAR(100) NOT NULL,
                programme_etude VARCHAR(255) NOT NULL,
                niveau_etude VARCHAR(50) NOT NULL,
                duree_etude VARCHAR(50),
                date_debut_prevue DATE,
                statut VARCHAR(50) DEFAULT 'en_cours',
                notes TEXT,
                documents_requis JSONB,
                documents_soumis JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Créer des index pour les recherches fréquentes
        await db.query(`
            CREATE INDEX idx_dossiers_etudiants_client_id ON dossiers_etudiants(client_id);
        `);
        await db.query(`
            CREATE INDEX idx_dossiers_etudiants_statut ON dossiers_etudiants(statut);
        `);
        
        console.log('✅ Table dossiers_etudiants créée avec succès');
    },

    // Fonction de rollback de la migration (optionnel)
    down: async (db) => {
        await db.query('DROP TABLE IF EXISTS dossiers_etudiants CASCADE;');
        console.log('✅ Table dossiers_etudiants suprimée avec succès');
    }
};
