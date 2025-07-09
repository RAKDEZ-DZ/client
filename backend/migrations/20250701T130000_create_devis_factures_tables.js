// Migration: create_devis_factures_tables
// Créée le: 2025-07-01T13:00:00.000Z

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        // Table des devis
        await db.query(`
            CREATE TABLE devis (
                id SERIAL PRIMARY KEY,
                numero_devis VARCHAR(50) UNIQUE NOT NULL,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                dossier_voyage_id INTEGER REFERENCES dossiers_voyage(id) ON DELETE SET NULL,
                dossier_etudiant_id INTEGER REFERENCES dossiers_etudiants(id) ON DELETE SET NULL,
                titre VARCHAR(255) NOT NULL,
                description TEXT,
                montant_ht DECIMAL(10,2) NOT NULL DEFAULT 0,
                taux_tva DECIMAL(5,2) DEFAULT 20.00,
                montant_tva DECIMAL(10,2) NOT NULL DEFAULT 0,
                montant_ttc DECIMAL(10,2) NOT NULL DEFAULT 0,
                remise_pourcentage DECIMAL(5,2) DEFAULT 0,
                montant_remise DECIMAL(10,2) DEFAULT 0,
                montant_final DECIMAL(10,2) NOT NULL DEFAULT 0,
                statut VARCHAR(50) DEFAULT 'brouillon', -- brouillon, envoye, accepte, refuse, expire
                date_creation DATE DEFAULT CURRENT_DATE,
                date_envoi DATE,
                date_expiration DATE,
                date_acceptation DATE,
                conditions_generales TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT check_devis_dossier CHECK (
                    (dossier_voyage_id IS NOT NULL AND dossier_etudiant_id IS NULL) OR
                    (dossier_voyage_id IS NULL AND dossier_etudiant_id IS NOT NULL) OR
                    (dossier_voyage_id IS NULL AND dossier_etudiant_id IS NULL)
                )
            );
        `);

        // Table des lignes de devis
        await db.query(`
            CREATE TABLE devis_lignes (
                id SERIAL PRIMARY KEY,
                devis_id INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
                designation VARCHAR(255) NOT NULL,
                description TEXT,
                quantite DECIMAL(10,2) NOT NULL DEFAULT 1,
                prix_unitaire_ht DECIMAL(10,2) NOT NULL,
                montant_ht DECIMAL(10,2) NOT NULL,
                taux_tva DECIMAL(5,2) DEFAULT 20.00,
                montant_tva DECIMAL(10,2) NOT NULL,
                montant_ttc DECIMAL(10,2) NOT NULL,
                ordre INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Table des factures
        await db.query(`
            CREATE TABLE factures (
                id SERIAL PRIMARY KEY,
                numero_facture VARCHAR(50) UNIQUE NOT NULL,
                devis_id INTEGER REFERENCES devis(id) ON DELETE SET NULL,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                dossier_voyage_id INTEGER REFERENCES dossiers_voyage(id) ON DELETE SET NULL,
                dossier_etudiant_id INTEGER REFERENCES dossiers_etudiants(id) ON DELETE SET NULL,
                titre VARCHAR(255) NOT NULL,
                description TEXT,
                montant_ht DECIMAL(10,2) NOT NULL DEFAULT 0,
                taux_tva DECIMAL(5,2) DEFAULT 20.00,
                montant_tva DECIMAL(10,2) NOT NULL DEFAULT 0,
                montant_ttc DECIMAL(10,2) NOT NULL DEFAULT 0,
                remise_pourcentage DECIMAL(5,2) DEFAULT 0,
                montant_remise DECIMAL(10,2) DEFAULT 0,
                montant_final DECIMAL(10,2) NOT NULL DEFAULT 0,
                montant_paye DECIMAL(10,2) DEFAULT 0,
                montant_restant DECIMAL(10,2) NOT NULL DEFAULT 0,
                statut VARCHAR(50) DEFAULT 'brouillon', -- brouillon, envoyee, payee_partiellement, payee, annulee
                type_facture VARCHAR(50) DEFAULT 'standard', -- standard, acompte, solde
                date_creation DATE DEFAULT CURRENT_DATE,
                date_envoi DATE,
                date_echeance DATE,
                date_paiement_complet DATE,
                conditions_paiement TEXT DEFAULT 'Paiement à 30 jours',
                penalites_retard TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT check_facture_dossier CHECK (
                    (dossier_voyage_id IS NOT NULL AND dossier_etudiant_id IS NULL) OR
                    (dossier_voyage_id IS NULL AND dossier_etudiant_id IS NOT NULL) OR
                    (dossier_voyage_id IS NULL AND dossier_etudiant_id IS NULL)
                )
            );
        `);

        // Table des lignes de factures
        await db.query(`
            CREATE TABLE factures_lignes (
                id SERIAL PRIMARY KEY,
                facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
                designation VARCHAR(255) NOT NULL,
                description TEXT,
                quantite DECIMAL(10,2) NOT NULL DEFAULT 1,
                prix_unitaire_ht DECIMAL(10,2) NOT NULL,
                montant_ht DECIMAL(10,2) NOT NULL,
                taux_tva DECIMAL(5,2) DEFAULT 20.00,
                montant_tva DECIMAL(10,2) NOT NULL,
                montant_ttc DECIMAL(10,2) NOT NULL,
                ordre INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Séquences pour la numérotation automatique
        await db.query(`
            CREATE SEQUENCE seq_numero_devis START 1;
        `);

        await db.query(`
            CREATE SEQUENCE seq_numero_facture START 1;
        `);

        // Index pour optimiser les recherches
        await db.query(`CREATE INDEX idx_devis_client_id ON devis(client_id);`);
        await db.query(`CREATE INDEX idx_devis_statut ON devis(statut);`);
        await db.query(`CREATE INDEX idx_devis_date_creation ON devis(date_creation);`);
        await db.query(`CREATE INDEX idx_devis_numero ON devis(numero_devis);`);
        
        await db.query(`CREATE INDEX idx_factures_client_id ON factures(client_id);`);
        await db.query(`CREATE INDEX idx_factures_statut ON factures(statut);`);
        await db.query(`CREATE INDEX idx_factures_date_creation ON factures(date_creation);`);
        await db.query(`CREATE INDEX idx_factures_numero ON factures(numero_facture);`);
        await db.query(`CREATE INDEX idx_factures_devis_id ON factures(devis_id);`);

        await db.query(`CREATE INDEX idx_devis_lignes_devis_id ON devis_lignes(devis_id);`);
        await db.query(`CREATE INDEX idx_factures_lignes_facture_id ON factures_lignes(facture_id);`);

        // Fonctions pour la numérotation automatique
        await db.query(`
            CREATE OR REPLACE FUNCTION generate_numero_devis()
            RETURNS TEXT AS $$
            DECLARE
                next_val INTEGER;
                current_year TEXT;
            BEGIN
                SELECT EXTRACT(YEAR FROM CURRENT_DATE)::TEXT INTO current_year;
                SELECT nextval('seq_numero_devis') INTO next_val;
                RETURN 'DEV-' || current_year || '-' || LPAD(next_val::TEXT, 4, '0');
            END;
            $$ LANGUAGE plpgsql;
        `);

        await db.query(`
            CREATE OR REPLACE FUNCTION generate_numero_facture()
            RETURNS TEXT AS $$
            DECLARE
                next_val INTEGER;
                current_year TEXT;
            BEGIN
                SELECT EXTRACT(YEAR FROM CURRENT_DATE)::TEXT INTO current_year;
                SELECT nextval('seq_numero_facture') INTO next_val;
                RETURN 'FAC-' || current_year || '-' || LPAD(next_val::TEXT, 4, '0');
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Triggers pour la numérotation automatique
        await db.query(`
            CREATE OR REPLACE FUNCTION set_numero_devis()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.numero_devis IS NULL OR NEW.numero_devis = '' THEN
                    NEW.numero_devis := generate_numero_devis();
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await db.query(`
            CREATE TRIGGER trigger_set_numero_devis
                BEFORE INSERT ON devis
                FOR EACH ROW
                EXECUTE FUNCTION set_numero_devis();
        `);

        await db.query(`
            CREATE OR REPLACE FUNCTION set_numero_facture()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.numero_facture IS NULL OR NEW.numero_facture = '' THEN
                    NEW.numero_facture := generate_numero_facture();
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await db.query(`
            CREATE TRIGGER trigger_set_numero_facture
                BEFORE INSERT ON factures
                FOR EACH ROW
                EXECUTE FUNCTION set_numero_facture();
        `);

        // Trigger pour mise à jour automatique des montants
        await db.query(`
            CREATE OR REPLACE FUNCTION update_devis_montants()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE devis SET
                    montant_ht = (
                        SELECT COALESCE(SUM(montant_ht), 0) 
                        FROM devis_lignes 
                        WHERE devis_id = COALESCE(NEW.devis_id, OLD.devis_id)
                    ),
                    montant_tva = (
                        SELECT COALESCE(SUM(montant_tva), 0) 
                        FROM devis_lignes 
                        WHERE devis_id = COALESCE(NEW.devis_id, OLD.devis_id)
                    ),
                    montant_ttc = (
                        SELECT COALESCE(SUM(montant_ttc), 0) 
                        FROM devis_lignes 
                        WHERE devis_id = COALESCE(NEW.devis_id, OLD.devis_id)
                    ),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = COALESCE(NEW.devis_id, OLD.devis_id);

                -- Calculer montant final avec remise
                UPDATE devis SET
                    montant_remise = (montant_ttc * remise_pourcentage / 100),
                    montant_final = (montant_ttc - (montant_ttc * remise_pourcentage / 100))
                WHERE id = COALESCE(NEW.devis_id, OLD.devis_id);

                RETURN COALESCE(NEW, OLD);
            END;
            $$ LANGUAGE plpgsql;
        `);

        await db.query(`
            CREATE TRIGGER trigger_update_devis_montants
                AFTER INSERT OR UPDATE OR DELETE ON devis_lignes
                FOR EACH ROW
                EXECUTE FUNCTION update_devis_montants();
        `);

        await db.query(`
            CREATE OR REPLACE FUNCTION update_facture_montants()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE factures SET
                    montant_ht = (
                        SELECT COALESCE(SUM(montant_ht), 0) 
                        FROM factures_lignes 
                        WHERE facture_id = COALESCE(NEW.facture_id, OLD.facture_id)
                    ),
                    montant_tva = (
                        SELECT COALESCE(SUM(montant_tva), 0) 
                        FROM factures_lignes 
                        WHERE facture_id = COALESCE(NEW.facture_id, OLD.facture_id)
                    ),
                    montant_ttc = (
                        SELECT COALESCE(SUM(montant_ttc), 0) 
                        FROM factures_lignes 
                        WHERE facture_id = COALESCE(NEW.facture_id, OLD.facture_id)
                    ),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = COALESCE(NEW.facture_id, OLD.facture_id);

                -- Calculer montant final avec remise et montant restant
                UPDATE factures SET
                    montant_remise = (montant_ttc * remise_pourcentage / 100),
                    montant_final = (montant_ttc - (montant_ttc * remise_pourcentage / 100)),
                    montant_restant = (montant_ttc - (montant_ttc * remise_pourcentage / 100) - montant_paye)
                WHERE id = COALESCE(NEW.facture_id, OLD.facture_id);

                RETURN COALESCE(NEW, OLD);
            END;
            $$ LANGUAGE plpgsql;
        `);

        await db.query(`
            CREATE TRIGGER trigger_update_facture_montants
                AFTER INSERT OR UPDATE OR DELETE ON factures_lignes
                FOR EACH ROW
                EXECUTE FUNCTION update_facture_montants();
        `);

        console.log('✅ Tables devis et factures créées avec succès');
    },

    // Fonction de rollback de la migration
    down: async (db) => {
        await db.query('DROP TABLE IF EXISTS factures_lignes CASCADE;');
        await db.query('DROP TABLE IF EXISTS devis_lignes CASCADE;');
        await db.query('DROP TABLE IF EXISTS factures CASCADE;');
        await db.query('DROP TABLE IF EXISTS devis CASCADE;');
        await db.query('DROP SEQUENCE IF EXISTS seq_numero_devis CASCADE;');
        await db.query('DROP SEQUENCE IF EXISTS seq_numero_facture CASCADE;');
        await db.query('DROP FUNCTION IF EXISTS generate_numero_devis() CASCADE;');
        await db.query('DROP FUNCTION IF EXISTS generate_numero_facture() CASCADE;');
        await db.query('DROP FUNCTION IF EXISTS set_numero_devis() CASCADE;');
        await db.query('DROP FUNCTION IF EXISTS set_numero_facture() CASCADE;');
        await db.query('DROP FUNCTION IF EXISTS update_devis_montants() CASCADE;');
        await db.query('DROP FUNCTION IF EXISTS update_facture_montants() CASCADE;');
        console.log('✅ Tables devis et factures supprimées');
    }
};
