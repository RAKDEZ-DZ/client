// Migration: remove_devis_tables
// Créée le: 2025-07-01T14:00:00.000Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        // Supprimer la colonne devis_id des factures
        await db.query(`
            ALTER TABLE factures DROP COLUMN IF EXISTS devis_id;
        `);

        // Supprimer les tables liées aux devis
        await db.query('DROP TABLE IF EXISTS devis_lignes CASCADE;');
        await db.query('DROP TABLE IF EXISTS devis CASCADE;');
        
        // Supprimer les séquences et fonctions liées aux devis
        await db.query('DROP SEQUENCE IF EXISTS seq_numero_devis CASCADE;');
        await db.query('DROP FUNCTION IF EXISTS generate_numero_devis() CASCADE;');
        await db.query('DROP FUNCTION IF EXISTS set_numero_devis() CASCADE;');
        await db.query('DROP FUNCTION IF EXISTS update_devis_montants() CASCADE;');

        console.log('✅ Tables et fonctions devis supprimées avec succès');
    },

    // Fonction de rollback de la migration
    down: async (db) => {
        console.log('⚠️ Rollback non implémenté pour cette migration de nettoyage');
    }
};
