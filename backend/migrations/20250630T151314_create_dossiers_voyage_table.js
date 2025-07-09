// Migration: create_dossiers_voyage_table
// Créée le: 2025-06-30T15:13:14.961Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        await db.query(`
            CREATE TABLE dossiers_voyage (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                type_voyage VARCHAR(50) NOT NULL,
                destination VARCHAR(255) NOT NULL,
                date_depart DATE NOT NULL,
                date_retour DATE,
                nombre_personnes INTEGER DEFAULT 1,
                motif_voyage VARCHAR(255),
                statut VARCHAR(50) DEFAULT 'en_cours',
                prix_total DECIMAL(10,2),
                acompte_verse DECIMAL(10,2) DEFAULT 0,
                reste_a_payer DECIMAL(10,2),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Créer des index pour les recherches fréquentes
        await db.query(`
            CREATE INDEX idx_dossiers_voyage_client_id ON dossiers_voyage(client_id);
        `);
        await db.query(`
            CREATE INDEX idx_dossiers_voyage_statut ON dossiers_voyage(statut);
        `);
        await db.query(`
            CREATE INDEX idx_dossiers_voyage_date_depart ON dossiers_voyage(date_depart);
        `);
        
        console.log('✅ Table dossiers_voyage créée avec succès');
    },

    // Fonction de rollback de la migration (optionnel)
    down: async (db) => {
        await db.query('DROP TABLE IF EXISTS dossiers_voyage CASCADE;');
        console.log('✅ Table dossiers_voyage supprimée');
    }
};
