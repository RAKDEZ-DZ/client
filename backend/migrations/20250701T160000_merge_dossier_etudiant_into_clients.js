// Migration: merge_dossier_etudiant_into_clients
// Créée le: 2025-07-01T16:00:00.000Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        // Vérifier si la table dossiers_etudiants existe et sauvegarder les données si nécessaire
        let dossiers = { rows: [] };
        try {
            dossiers = await db.query('SELECT * FROM dossiers_etudiants');
        } catch (error) {
            console.log('⚠️ Table dossiers_etudiants n\'existe pas ou déjà supprimée');
        }
        
        // Supprimer la table dossiers_etudiants si elle existe
        await db.query('DROP TABLE IF EXISTS dossiers_etudiants CASCADE;');
        console.log('✅ Table dossiers_etudiants supprimée (ou n\'existait pas)');
        
        // Vérifier si les colonnes existent déjà dans la table clients
        const checkColumns = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'clients' AND column_name IN ('universite_destination', 'payement')
        `);
        
        if (checkColumns.rows.length === 0) {
            // Ajouter les nouveaux champs à la table clients
            await db.query(`
                ALTER TABLE clients 
                ADD COLUMN universite_destination VARCHAR(255),
                ADD COLUMN pays_destination VARCHAR(100),
                ADD COLUMN programme_etude VARCHAR(255),
                ADD COLUMN niveau_etude VARCHAR(50),
                ADD COLUMN statut VARCHAR(50) DEFAULT 'nouveau',
                ADD COLUMN notes TEXT,
                ADD COLUMN documents_requis JSONB,
                ADD COLUMN documents_soumis JSONB,
                ADD COLUMN payement VARCHAR(20) DEFAULT 'pas_payer';
            `);
            
            // Créer des index pour les nouvelles colonnes importantes
            await db.query(`
                CREATE INDEX idx_clients_statut ON clients(statut);
            `);
            await db.query(`
                CREATE INDEX idx_clients_pays_destination ON clients(pays_destination);
            `);
            await db.query(`
                CREATE INDEX idx_clients_payement ON clients(payement);
            `);
            
            console.log('✅ Colonnes dossier étudiant et payement ajoutées à la table clients');
        } else {
            console.log('✅ Colonnes déjà présentes dans la table clients');
        }
        
        console.log('✅ Colonnes dossier étudiant ajoutées à la table clients');
        
        // Si il y avait des données dans dossiers_etudiants, les migrer vers clients
        if (dossiers.rows && dossiers.rows.length > 0) {
            for (const dossier of dossiers.rows) {
                // Valider et corriger les données JSON si nécessaire
                let documentsRequis = null;
                let documentsSoumis = null;
                
                try {
                    if (dossier.documents_requis) {
                        if (typeof dossier.documents_requis === 'string') {
                            documentsRequis = JSON.parse(dossier.documents_requis);
                        } else {
                            documentsRequis = dossier.documents_requis;
                        }
                        documentsRequis = JSON.stringify(documentsRequis);
                    }
                } catch (error) {
                    console.log(`⚠️ Documents requis invalides pour le dossier ${dossier.id}, données ignorées`);
                    documentsRequis = null;
                }
                
                try {
                    if (dossier.documents_soumis) {
                        if (typeof dossier.documents_soumis === 'string') {
                            documentsSoumis = JSON.parse(dossier.documents_soumis);
                        } else {
                            documentsSoumis = dossier.documents_soumis;
                        }
                        documentsSoumis = JSON.stringify(documentsSoumis);
                    }
                } catch (error) {
                    console.log(`⚠️ Documents soumis invalides pour le dossier ${dossier.id}, données ignorées`);
                    documentsSoumis = null;
                }
                
                await db.query(`
                    UPDATE clients 
                    SET universite_destination = $1,
                        pays_destination = $2,
                        programme_etude = $3,
                        niveau_etude = $4,
                        statut = $5,
                        notes = $6,
                        documents_requis = $7::jsonb,
                        documents_soumis = $8::jsonb,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $9
                `, [
                    dossier.universite_destination,
                    dossier.pays_destination,
                    dossier.programme_etude,
                    dossier.niveau_etude,
                    dossier.statut,
                    dossier.notes,
                    documentsRequis,
                    documentsSoumis,
                    dossier.client_id
                ]);
            }
            console.log(`✅ ${dossiers.rows.length} dossiers étudiants migrés vers la table clients`);
        }
    },

    // Fonction de rollback de la migration
    down: async (db) => {
        // Recréer la table dossiers_etudiants
        await db.query(`
            CREATE TABLE dossiers_etudiants (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                universite_destination VARCHAR(255) NOT NULL,
                pays_destination VARCHAR(100) NOT NULL,
                programme_etude VARCHAR(255) NOT NULL,
                niveau_etude VARCHAR(50) NOT NULL,
                duree_etude VARCHAR(50),
                date_debut_prevue DATE,
                statut VARCHAR(50) DEFAULT 'en_cours',
                notes TEXT,
                documents_requis JSONB,
                documents_soumis JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Recréer les index
        await db.query(`
            CREATE INDEX idx_dossiers_etudiants_client_id ON dossiers_etudiants(client_id);
        `);
        await db.query(`
            CREATE INDEX idx_dossiers_etudiants_statut ON dossiers_etudiants(statut);
        `);
        
        // Migrer les données de clients vers dossiers_etudiants
        const clients = await db.query(`
            SELECT id, universite_destination, pays_destination, programme_etude, 
                   niveau_etude, statut, notes, documents_requis, documents_soumis
            FROM clients 
            WHERE universite_destination IS NOT NULL
        `);
        
        if (clients.rows && clients.rows.length > 0) {
            for (const client of clients.rows) {
                await db.query(`
                    INSERT INTO dossiers_etudiants 
                    (client_id, universite_destination, pays_destination, programme_etude, 
                     niveau_etude, statut, notes, documents_requis, documents_soumis)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    client.id,
                    client.universite_destination,
                    client.pays_destination,
                    client.programme_etude,
                    client.niveau_etude,
                    client.statut,
                    client.notes,
                    client.documents_requis,
                    client.documents_soumis
                ]);
            }
        }
        
        // Supprimer les colonnes de la table clients
        await db.query(`
            ALTER TABLE clients 
            DROP COLUMN IF EXISTS universite_destination,
            DROP COLUMN IF EXISTS pays_destination,
            DROP COLUMN IF EXISTS programme_etude,
            DROP COLUMN IF EXISTS niveau_etude,
            DROP COLUMN IF EXISTS statut,
            DROP COLUMN IF EXISTS notes,
            DROP COLUMN IF EXISTS documents_requis,
            DROP COLUMN IF EXISTS documents_soumis,
            DROP COLUMN IF EXISTS payement;
        `);
        
        console.log('✅ Rollback terminé: table dossiers_etudiants recréée et données restaurées');
    }
};
