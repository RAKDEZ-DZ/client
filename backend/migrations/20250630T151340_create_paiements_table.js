// Migration: create_paiements_table
// Créée le: 2025-06-30T15:13:40.606Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        await db.query(`
            CREATE TABLE paiements (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                dossier_voyage_id INTEGER REFERENCES dossiers_voyage(id) ON DELETE SET NULL,
                dossier_etudiant_id INTEGER REFERENCES dossiers_etudiants(id) ON DELETE SET NULL,
                montant DECIMAL(10,2) NOT NULL,
                methode_paiement VARCHAR(50) NOT NULL,
                statut VARCHAR(50) DEFAULT 'en_attente',
                reference_transaction VARCHAR(255),
                date_paiement TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT check_dossier CHECK (
                    (dossier_voyage_id IS NOT NULL AND dossier_etudiant_id IS NULL) OR
                    (dossier_voyage_id IS NULL AND dossier_etudiant_id IS NOT NULL)
                )
            );
        `);
        
        // Créer des index pour les recherches fréquentes
        await db.query(`
            CREATE INDEX idx_paiements_client_id ON paiements(client_id);
        `);
        await db.query(`
            CREATE INDEX idx_paiements_statut ON paiements(statut);
        `);
        await db.query(`
            CREATE INDEX idx_paiements_date ON paiements(date_paiement);
        `);
        
        console.log('✅ Table paiements créée avec succès');
    },

    // Fonction de rollback de la migration (optionnel)
    down: async (db) => {
        await db.query('DROP TABLE IF EXISTS paiements CASCADE;');
        console.log('✅ Table paiements supprimée');
    }
};
