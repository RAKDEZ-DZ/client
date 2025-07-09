// Migration: remove_devis_tables_keep_factures_only
// Créée le: 2025-07-01T14:00:00.000Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        // Supprimer les références aux devis dans les factures
        await db.query(`
            ALTER TABLE factures DROP COLUMN IF EXISTS devis_id;
        `);

        // Supprimer les tables devis
        await db.query(`
            DROP TABLE IF EXISTS devis_lignes CASCADE;
        `);

        await db.query(`
            DROP TABLE IF EXISTS devis CASCADE;
        `);

        // Supprimer les séquences et fonctions liées aux devis
        await db.query(`
            DROP SEQUENCE IF EXISTS seq_numero_devis CASCADE;
        `);

        await db.query(`
            DROP FUNCTION IF EXISTS generate_numero_devis() CASCADE;
        `);

        await db.query(`
            DROP FUNCTION IF EXISTS set_numero_devis() CASCADE;
        `);

        await db.query(`
            DROP FUNCTION IF EXISTS update_devis_montants() CASCADE;
        `);

        // Modifier le statut des factures pour inclure un état "devis" (brouillon étendu)
        await db.query(`
            ALTER TABLE factures ALTER COLUMN statut SET DEFAULT 'brouillon';
        `);

        // Ajouter un commentaire pour clarifier les statuts
        await db.query(`
            COMMENT ON COLUMN factures.statut IS 'Statuts possibles: brouillon (fait office de devis), envoyee, payee_partiellement, payee, annulee';
        `);

        // Ajouter un type "devis" pour type_facture pour identifier les factures qui servent de devis
        await db.query(`
            COMMENT ON COLUMN factures.type_facture IS 'Types possibles: devis (estimation), standard, acompte, solde';
        `);

        console.log('✅ Tables devis supprimées, système simplifié avec factures uniquement');
    },

    // Fonction de rollback de la migration
    down: async (db) => {
        // En cas de rollback, il faudrait recréer les tables devis
        // Mais nous ne le ferons pas car nous voulons simplifier le système
        console.log('⚠️  Rollback non implémenté - le système est maintenant simplifié avec factures uniquement');
    }
};
