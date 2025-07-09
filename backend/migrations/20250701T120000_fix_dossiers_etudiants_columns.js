// Migration: fix_dossiers_etudiants_columns
// Créée le: 2025-07-01T12:00:00.000Z

module.exports = {
    up: async (db) => {
        // Ajouter les colonnes manquantes
        await db.query(`
            ALTER TABLE dossiers_etudiants 
            ADD COLUMN IF NOT EXISTS universite VARCHAR(255),
            ADD COLUMN IF NOT EXISTS programme VARCHAR(255),
            ADD COLUMN IF NOT EXISTS niveau_etudes VARCHAR(50),
            ADD COLUMN IF NOT EXISTS annee_academique VARCHAR(20),
            ADD COLUMN IF NOT EXISTS ville_etudes VARCHAR(100),
            ADD COLUMN IF NOT EXISTS duree_etudes INTEGER,
            ADD COLUMN IF NOT EXISTS date_debut DATE,
            ADD COLUMN IF NOT EXISTS date_fin DATE,
            ADD COLUMN IF NOT EXISTS frais_scolarite DECIMAL(10,2);
        `);

        // Mettre à jour les colonnes existantes pour les rendre optionnelles si nécessaire
        await db.query(`
            ALTER TABLE dossiers_etudiants 
            ALTER COLUMN universite_destination DROP NOT NULL;
        `);

        console.log('✅ Colonnes ajoutées à dossiers_etudiants');
    },

    down: async (db) => {
        await db.query(`
            ALTER TABLE dossiers_etudiants 
            DROP COLUMN IF EXISTS universite,
            DROP COLUMN IF EXISTS programme,
            DROP COLUMN IF EXISTS niveau_etudes,
            DROP COLUMN IF EXISTS annee_academique,
            DROP COLUMN IF EXISTS ville_etudes,
            DROP COLUMN IF EXISTS duree_etudes,
            DROP COLUMN IF EXISTS date_debut,
            DROP COLUMN IF EXISTS date_fin,
            DROP COLUMN IF EXISTS frais_scolarite;
        `);
        console.log('✅ Colonnes supprimées de dossiers_etudiants');
    }
};
