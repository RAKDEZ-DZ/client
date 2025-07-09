// Migration: add_visa_fields_to_clients
// Créée le: 2025-06-30T15:49:49.353Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        // Ajouter la colonne type_visa
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN type_visa VARCHAR(100);
        `);
        
        // Ajouter la colonne pour stocker les documents PDF (nom de fichier ou chemin)
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN document_pdf TEXT;
        `);
        
        // Ajouter la colonne etat_dossier avec une valeur par défaut
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN etat_dossier VARCHAR(100) DEFAULT 'Dossier soumis';
        `);
        
        // Créer un index sur etat_dossier pour les recherches rapides
        await db.query(`
            CREATE INDEX idx_clients_etat_dossier ON clients(etat_dossier);
        `);
        
        // Ajouter des commentaires pour documenter les colonnes
        await db.query(`
            COMMENT ON COLUMN clients.type_visa IS 'Type de visa demandé (touriste, étudiant, travail, etc.)';
        `);
        
        await db.query(`
            COMMENT ON COLUMN clients.document_pdf IS 'Chemin ou nom du fichier PDF uploadé';
        `);
        
        await db.query(`
            COMMENT ON COLUMN clients.etat_dossier IS 'État du dossier: Dossier soumis, En cours de traitement, traite en cours de reponse, Passeport prêt à être retiré';
        `);
        
        console.log('✅ Champs visa ajoutés à la table clients avec succès');
    },

    // Fonction de rollback de la migration (optionnel)
    down: async (db) => {
        // Supprimer l'index
        await db.query('DROP INDEX IF EXISTS idx_clients_etat_dossier;');
        
        // Supprimer les colonnes ajoutées
        await db.query('ALTER TABLE clients DROP COLUMN IF EXISTS type_visa;');
        await db.query('ALTER TABLE clients DROP COLUMN IF EXISTS document_pdf;');
        await db.query('ALTER TABLE clients DROP COLUMN IF EXISTS etat_dossier;');
        
        console.log('✅ Champs visa supprimés de la table clients');
    }
};
