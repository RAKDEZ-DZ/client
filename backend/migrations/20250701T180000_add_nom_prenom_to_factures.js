const db = require('../config/database');

class AddNomPrenomToFacturesMigration {
    static get timestamp() {
        return '20250701T180000';
    }

    static get description() {
        return 'Ajouter les champs nom et prenom à la table factures';
    }

    static async up() {
        console.log('🔄 Ajout des champs nom et prenom à la table factures...');
        
        try {
            // Ajouter les colonnes nom et prenom à la table factures
            await db.query(`
                ALTER TABLE factures 
                ADD COLUMN IF NOT EXISTS nom VARCHAR(100),
                ADD COLUMN IF NOT EXISTS prenom VARCHAR(100)
            `);

            // Mettre à jour les factures existantes avec les noms des clients
            await db.query(`
                UPDATE factures 
                SET nom = c.nom, prenom = c.prenom
                FROM clients c 
                WHERE factures.client_id = c.id 
                AND (factures.nom IS NULL OR factures.prenom IS NULL)
            `);

            console.log('✅ Champs nom et prenom ajoutés à la table factures avec succès');
            console.log('✅ Données existantes mises à jour depuis la table clients');
        } catch (error) {
            console.error('❌ Erreur lors de l\'ajout des champs nom et prenom:', error);
            throw error;
        }
    }

    static async down() {
        console.log('🔄 Suppression des champs nom et prenom de la table factures...');
        
        try {
            await db.query(`
                ALTER TABLE factures 
                DROP COLUMN IF EXISTS nom,
                DROP COLUMN IF EXISTS prenom
            `);
            
            console.log('✅ Champs nom et prenom supprimés de la table factures');
        } catch (error) {
            console.error('❌ Erreur lors de la suppression des champs nom et prenom:', error);
            throw error;
        }
    }

    static async verify() {
        try {
            // Vérifier que les colonnes existent
            const result = await db.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'factures' 
                AND column_name IN ('nom', 'prenom')
                ORDER BY column_name
            `);

            const columns = result.rows.map(row => row.column_name);
            const expectedColumns = ['nom', 'prenom'];
            
            const missingColumns = expectedColumns.filter(col => !columns.includes(col));
            
            if (missingColumns.length === 0) {
                console.log('✅ Vérification réussie: colonnes nom et prenom présentes dans la table factures');
                return true;
            } else {
                console.log(`❌ Colonnes manquantes: ${missingColumns.join(', ')}`);
                return false;
            }
        } catch (error) {
            console.error('❌ Erreur lors de la vérification:', error);
            return false;
        }
    }
}

module.exports = AddNomPrenomToFacturesMigration;
