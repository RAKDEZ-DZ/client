// Migration: fix_paiements_constraints
// Créée le: 2025-07-01T12:05:00.000Z

module.exports = {
    up: async (db) => {
        // Supprimer la contrainte restrictive qui empêche les paiements sans dossier
        await db.query(`
            ALTER TABLE paiements 
            DROP CONSTRAINT IF EXISTS check_dossier;
        `);

        // Permettre les paiements sans dossier spécifique (paiements généraux)
        console.log('✅ Contrainte restrictive supprimée de paiements');
    },

    down: async (db) => {
        // Remettre la contrainte si nécessaire
        await db.query(`
            ALTER TABLE paiements 
            ADD CONSTRAINT check_dossier CHECK (
                (dossier_voyage_id IS NOT NULL AND dossier_etudiant_id IS NULL) OR
                (dossier_voyage_id IS NULL AND dossier_etudiant_id IS NOT NULL)
            );
        `);
        console.log('✅ Contrainte ajoutée à paiements');
    }
};
