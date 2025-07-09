// Migration: add_email_creer_mot_de_passe_to_clients
// Créée le: 2025-07-01T20:00:00.000Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN email_creer VARCHAR(255),
            ADD COLUMN mot_de_passe VARCHAR(255);
        `);
        
        // Créer un index sur email_creer pour les recherches rapides
        await db.query(`
            CREATE INDEX idx_clients_email_creer ON clients(email_creer);
        `);
        
        console.log('✅ Colonnes email_creer et mot_de_passe ajoutées à la table clients');
    },

    // Fonction de rollback de la migration
    down: async (db) => {
        await db.query(`
            DROP INDEX IF EXISTS idx_clients_email_creer;
        `);
        
        await db.query(`
            ALTER TABLE clients 
            DROP COLUMN IF EXISTS email_creer,
            DROP COLUMN IF EXISTS mot_de_passe;
        `);
        
        console.log('✅ Colonnes email_creer et mot_de_passe supprimées de la table clients');
    }
};
