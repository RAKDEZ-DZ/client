// Migration: remove_personal_fields_from_clients
// Créée le: 2025-07-01T17:00:00.000Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        // Supprimer les colonnes de données personnelles de la table clients
        await db.query(`
            ALTER TABLE clients 
            DROP COLUMN IF EXISTS adresse,
            DROP COLUMN IF EXISTS date_naissance,
            DROP COLUMN IF EXISTS nationalite,
            DROP COLUMN IF EXISTS numero_passeport,
            DROP COLUMN IF EXISTS date_expiration_passeport;
        `);
        
        // Modifier la colonne document_pdf pour devenir documents (JSONB) pour supporter plusieurs fichiers
        await db.query(`
            ALTER TABLE clients 
            DROP COLUMN IF EXISTS document_pdf;
        `);
        
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
        `);
        
        // Créer un index sur la colonne documents
        await db.query(`
            CREATE INDEX idx_clients_documents ON clients USING GIN (documents);
        `);
        
        console.log('✅ Colonnes de données personnelles supprimées et système de documents multiple ajouté');
    },

    // Fonction de rollback de la migration
    down: async (db) => {
        // Restaurer les colonnes supprimées
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN adresse TEXT,
            ADD COLUMN date_naissance DATE,
            ADD COLUMN nationalite VARCHAR(50),
            ADD COLUMN numero_passeport VARCHAR(50),
            ADD COLUMN date_expiration_passeport DATE,
            ADD COLUMN document_pdf TEXT;
        `);
        
        // Supprimer la nouvelle colonne documents
        await db.query(`
            ALTER TABLE clients 
            DROP COLUMN IF EXISTS documents;
        `);
        
        // Recréer l'index unique sur numero_passeport
        await db.query(`
            CREATE UNIQUE INDEX idx_clients_numero_passeport ON clients(numero_passeport) WHERE numero_passeport IS NOT NULL;
        `);
        
        console.log('✅ Rollback terminé: colonnes de données personnelles restaurées');
    }
};
