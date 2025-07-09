const db = require('../config/database');

class Facture {
    constructor(data) {
        this.id = data.id;
        this.numero_facture = data.numero_facture;
        this.client_id = data.client_id;
        this.nom = data.nom;
        this.prenom = data.prenom;
        this.dossier_voyage_id = data.dossier_voyage_id;
        this.titre = data.titre;
        this.description = data.description;
        this.montant_ht = parseFloat(data.montant_ht) || 0;
        this.montant_paye = parseFloat(data.montant_paye) || 0;
        this.montant_restant = parseFloat(data.montant_restant) || 0;
        this.type_facture = data.type_facture || 'standard';
        this.date_creation = data.date_creation;
        this.date_envoi = data.date_envoi;
        this.conditions_paiement = data.conditions_paiement;
        this.statut = data.statut || 'brouillon'; // Ajout du champ statut
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Créer une nouvelle facture
    static async create(factureData) {
        // Générer le numéro de facture
        const numeroFacture = await Facture.genererNumeroFacture();
        
        // Créer la facture
        const query = `
            INSERT INTO factures (
                numero_facture, client_id, nom, prenom, dossier_voyage_id, titre, description, 
                montant_ht, montant_paye, montant_restant, type_facture, 
                date_creation, date_envoi, conditions_paiement
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;
        
        const values = [
            numeroFacture,
            parseInt(factureData.client_id),
            factureData.nom,
            factureData.prenom,
            factureData.dossier_voyage_id ? parseInt(factureData.dossier_voyage_id) : null,
            factureData.titre,
            factureData.description || null,
            parseFloat(factureData.montant_ht) || 0,
            parseFloat(factureData.montant_paye) || 0,
            parseFloat(factureData.montant_restant) || 0,
            factureData.type_facture || 'standard',
            factureData.date_creation || new Date().toISOString().split('T')[0],
            factureData.date_envoi || null,
            factureData.conditions_paiement || 'Paiement à 30 jours'
        ];

        const result = await db.query(query, values);
        return new Facture(result.rows[0]);
    }

    // Ajouter des lignes à la facture
    async addLignes(lignes) {
        for (let i = 0; i < lignes.length; i++) {
            const ligne = lignes[i];
            const quantite = parseFloat(ligne.quantite) || 1;
            const prixUnitaireHT = parseFloat(ligne.prix_unitaire_ht);
            const tauxTVA = parseFloat(ligne.taux_tva) || this.taux_tva;
            
            const montantHT = quantite * prixUnitaireHT;
            const montantTVA = montantHT * tauxTVA / 100;
            const montantTTC = montantHT + montantTVA;

            const query = `
                INSERT INTO factures_lignes (
                    facture_id, designation, description, quantite, prix_unitaire_ht,
                    montant_ht, taux_tva, montant_tva, montant_ttc, ordre
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `;

            const values = [
                this.id,
                ligne.designation,
                ligne.description || null,
                quantite,
                prixUnitaireHT,
                montantHT,
                tauxTVA,
                montantTVA,
                montantTTC,
                ligne.ordre || (i + 1)
            ];

            await db.query(query, values);
        }

        // Recalculer les totaux de la facture
        await this.recalculerTotaux();
    }

    // Trouver une facture par ID
    static async findById(id) {
        const query = `
            SELECT f.*, c.nom, c.prenom, c.email, c.telephone
            FROM factures f
            JOIN clients c ON f.client_id = c.id
            WHERE f.id = $1
        `;
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const facture = new Facture(result.rows[0]);
        facture.client = {
            nom: result.rows[0].nom,
            prenom: result.rows[0].prenom,
            email: result.rows[0].email,
            telephone: result.rows[0].telephone
        };

        return facture;
    }

    // Trouver par numéro de facture
    static async findByNumero(numeroFacture) {
        const query = `
            SELECT f.*, c.nom, c.prenom, c.email, c.telephone
            FROM factures f
            JOIN clients c ON f.client_id = c.id
            WHERE f.numero_facture = $1
        `;
        const result = await db.query(query, [numeroFacture]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const facture = new Facture(result.rows[0]);
        facture.client = {
            nom: result.rows[0].nom,
            prenom: result.rows[0].prenom,
            email: result.rows[0].email,
            telephone: result.rows[0].telephone
        };

        return facture;
    }

    // Récupérer toutes les factures d'un client
    static async findByClientId(clientId) {
        const query = `
            SELECT f.*, c.nom, c.prenom, c.email
            FROM factures f
            JOIN clients c ON f.client_id = c.id
            WHERE f.client_id = $1
            ORDER BY f.created_at DESC
        `;
        const result = await db.query(query, [clientId]);
        
        return result.rows.map(row => {
            const facture = new Facture(row);
            facture.client = {
                nom: row.nom,
                prenom: row.prenom,
                email: row.email
            };
            return facture;
        });
    }

    // Récupérer toutes les factures avec pagination
    static async findAll(limit = 50, offset = 0, filters = {}) {
        let whereClause = '';
        let values = [limit, offset];
        let paramCount = 2;

        if (filters.statut) {
            paramCount++;
            whereClause += ` AND f.statut = $${paramCount}`;
            values.push(filters.statut);
        }

        if (filters.type_facture) {
            paramCount++;
            whereClause += ` AND f.type_facture = $${paramCount}`;
            values.push(filters.type_facture);
        }

        if (filters.client_id) {
            paramCount++;
            whereClause += ` AND f.client_id = $${paramCount}`;
            values.push(filters.client_id);
        }

        if (filters.date_debut) {
            paramCount++;
            whereClause += ` AND f.date_creation >= $${paramCount}`;
            values.push(filters.date_debut);
        }

        if (filters.date_fin) {
            paramCount++;
            whereClause += ` AND f.date_creation <= $${paramCount}`;
            values.push(filters.date_fin);
        }

        if (filters.echeance_proche) {
            paramCount++;
            whereClause += ` AND f.date_echeance <= $${paramCount} AND f.statut NOT IN ('payee', 'annulee')`;
            values.push(new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]); // 7 jours
        }

        const query = `
            SELECT f.*, c.nom, c.prenom, c.email,
                   (SELECT COUNT(*) FROM factures_lignes fl WHERE fl.facture_id = f.id) as nb_lignes
            FROM factures f
            JOIN clients c ON f.client_id = c.id
            WHERE 1=1 ${whereClause}
            ORDER BY f.created_at DESC 
            LIMIT $1 OFFSET $2
        `;

        const result = await db.query(query, values);
        
        return result.rows.map(row => {
            const facture = new Facture(row);
            facture.client = {
                nom: row.nom,
                prenom: row.prenom,
                email: row.email
            };
            facture.nb_lignes = parseInt(row.nb_lignes);
            return facture;
        });
    }

    // Mettre à jour une facture
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramCounter = 1;

        const allowedFields = [
            'nom', 'prenom', 'titre', 'description', 'montant_ht', 'montant_paye', 'montant_restant',
            'type_facture', 'date_creation', 'date_envoi', 'conditions_paiement', 'statut'
        ];

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = $${paramCounter}`);
                if (field.includes('montant')) {
                    values.push(parseFloat(updateData[field]));
                } else {
                    values.push(updateData[field]);
                }
                paramCounter++;
            }
        });

        if (fields.length === 0) {
            throw new Error('Aucun champ à mettre à jour');
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(this.id);

        const query = `
            UPDATE factures 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCounter}
            RETURNING *
        `;

        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            throw new Error('Facture non trouvée');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Changer le statut de la facture
    async changerStatut(nouveauStatut) {
        const statutsValides = ['brouillon', 'envoyee', 'payee_partiellement', 'payee', 'annulee'];
        
        if (!statutsValides.includes(nouveauStatut)) {
            throw new Error('Statut invalide');
        }

        const updateData = { statut: nouveauStatut };

        if (nouveauStatut === 'envoyee' && !this.date_envoi) {
            updateData.date_envoi = new Date().toISOString().split('T')[0];
        }

        if (nouveauStatut === 'payee' && !this.date_paiement_complet) {
            updateData.date_paiement_complet = new Date().toISOString().split('T')[0];
        }

        return await this.update(updateData);
    }

    // Enregistrer un paiement
    async enregistrerPaiement(montantPaye, methodePaiement, referenceTransaction = null, notes = null) {
        const client = await db.query('BEGIN');
        
        try {
            // Créer le paiement dans la table paiements
            const paiementQuery = `
                INSERT INTO paiements (
                    client_id, dossier_voyage_id, dossier_etudiant_id, montant, 
                    methode_paiement, statut, reference_transaction, date_paiement, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
                RETURNING *
            `;

            const paiementValues = [
                this.client_id,
                this.dossier_voyage_id,
                this.dossier_etudiant_id,
                montantPaye,
                methodePaiement,
                'confirme', // Utiliser 'confirme' pour marquer le paiement comme effectué
                referenceTransaction || `FAC-${this.numero_facture}-${Date.now()}`,
                notes
            ];

            await db.query(paiementQuery, paiementValues);

            // Mettre à jour les montants de la facture
            const nouveauMontantPaye = this.montant_paye + parseFloat(montantPaye);
            const nouveauMontantRestant = this.montant_final - nouveauMontantPaye;

            const updateQuery = `
                UPDATE factures 
                SET montant_paye = $1, 
                    montant_restant = $2, 
                    date_paiement_complet = CASE WHEN $1 >= montant_final THEN CURRENT_DATE ELSE date_paiement_complet END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

            const result = await db.query(updateQuery, [
                nouveauMontantPaye,
                nouveauMontantRestant,
                this.id
            ]);

            Object.assign(this, result.rows[0]);

            // Appliquer la règle métier pour mettre à jour le statut automatiquement
            await this.mettreAJourStatutSelonPaiements();

            await db.query('COMMIT');
            return this;
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }

    // Générer facture d'acompte
    async genererFactureAcompte(pourcentageAcompte) {
        if (this.type_facture !== 'standard') {
            throw new Error('Seules les factures standard peuvent générer un acompte');
        }

        const montantAcompte = this.montant_final * (pourcentageAcompte / 100);

        const factureAcompteData = {
            client_id: this.client_id,
            dossier_voyage_id: this.dossier_voyage_id,
            dossier_etudiant_id: this.dossier_etudiant_id,
            titre: `Acompte ${pourcentageAcompte}% - ${this.titre}`,
            description: `Acompte de ${pourcentageAcompte}% sur la facture ${this.numero_facture}`,
            type_facture: 'acompte',
            conditions_paiement: 'Paiement immédiat',
            lignes: [{
                designation: `Acompte ${pourcentageAcompte}%`,
                description: `Acompte de ${pourcentageAcompte}% sur ${this.titre}`,
                quantite: 1,
                prix_unitaire_ht: montantAcompte / (1 + this.taux_tva / 100),
                taux_tva: this.taux_tva
            }]
        };

        return await Facture.create(factureAcompteData);
    }

    // Dupliquer une facture
    async duplicate() {
        const client = await db.query('BEGIN');
        
        try {
            // Créer la nouvelle facture
            const query = `
                INSERT INTO factures (
                    client_id, dossier_voyage_id, dossier_etudiant_id, titre, description,
                    taux_tva, remise_pourcentage, type_facture, conditions_paiement, penalites_retard, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `;
            
            const values = [
                this.client_id,
                this.dossier_voyage_id,
                this.dossier_etudiant_id,
                `${this.titre} (Copie)`,
                this.description,
                this.taux_tva,
                this.remise_pourcentage,
                this.type_facture,
                this.conditions_paiement,
                this.penalites_retard,
                this.notes
            ];

            const result = await db.query(query, values);
            const nouvelleFacture = new Facture(result.rows[0]);

            // Copier les lignes
            const lignesQuery = `
                INSERT INTO factures_lignes (
                    facture_id, designation, description, quantite, prix_unitaire_ht,
                    montant_ht, taux_tva, montant_tva, montant_ttc, ordre
                )
                SELECT $1, designation, description, quantite, prix_unitaire_ht,
                       montant_ht, taux_tva, montant_tva, montant_ttc, ordre
                FROM factures_lignes
                WHERE facture_id = $2
            `;

            await db.query(lignesQuery, [nouvelleFacture.id, this.id]);

            await db.query('COMMIT');
            return await Facture.findById(nouvelleFacture.id);
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }

    // Supprimer une facture
    async delete() {
        if (this.statut !== 'brouillon') {
            throw new Error('Seules les factures en brouillon peuvent être supprimées');
        }

        const query = 'DELETE FROM factures WHERE id = $1 RETURNING *';
        const result = await db.query(query, [this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Facture non trouvée');
        }
        
        return true;
    }

    // Statistiques
    static async getStatistics() {
        const queries = {
            total: 'SELECT COUNT(*) as count FROM factures',
            brouillon: "SELECT COUNT(*) as count FROM factures WHERE statut = 'brouillon'",
            envoyee: "SELECT COUNT(*) as count FROM factures WHERE statut = 'envoyee'",
            payee_partiellement: "SELECT COUNT(*) as count FROM factures WHERE statut = 'payee_partiellement'",
            payee: "SELECT COUNT(*) as count FROM factures WHERE statut = 'payee'",
            annulee: "SELECT COUNT(*) as count FROM factures WHERE statut = 'annulee'",
            enRetard: `SELECT COUNT(*) as count FROM factures 
                      WHERE date_echeance < CURRENT_DATE 
                      AND statut NOT IN ('payee', 'annulee')`,
            chiffreAffaires: "SELECT COALESCE(SUM(montant_final), 0) as total FROM factures WHERE statut IN ('payee', 'payee_partiellement')",
            montantEnAttente: "SELECT COALESCE(SUM(montant_restant), 0) as total FROM factures WHERE statut IN ('envoyee', 'payee_partiellement')",
            montantMoyenFacture: 'SELECT COALESCE(AVG(montant_final), 0) as moyenne FROM factures WHERE statut != \'annulee\''
        };

        const results = {};
        
        for (const [key, query] of Object.entries(queries)) {
            const result = await db.query(query);
            results[key] = key.includes('montant') || key.includes('chiffre') ? 
                parseFloat(result.rows[0].total || result.rows[0].moyenne || 0) : 
                parseInt(result.rows[0].count);
        }

        // Taux de recouvrement
        const totalEmis = await db.query("SELECT COALESCE(SUM(montant_final), 0) as total FROM factures WHERE statut != 'annulee'");
        results.tauxRecouvrement = totalEmis.rows[0].total > 0 ? 
            (results.chiffreAffaires / parseFloat(totalEmis.rows[0].total) * 100) : 0;

        return results;
    }

    // Recherche
    static async search(terme, limit = 20) {
        const query = `
            SELECT f.*, c.nom, c.prenom, c.email
            FROM factures f
            JOIN clients c ON f.client_id = c.id
            WHERE f.numero_facture ILIKE $1 
               OR f.titre ILIKE $1 
               OR c.nom ILIKE $1 
               OR c.prenom ILIKE $1 
               OR c.email ILIKE $1
            ORDER BY f.created_at DESC
            LIMIT $2
        `;

        const result = await db.query(query, [`%${terme}%`, limit]);
        
        return result.rows.map(row => {
            const facture = new Facture(row);
            facture.client = {
                nom: row.nom,
                prenom: row.prenom,
                email: row.email
            };
            return facture;
        });
    }

    // Facturation récurrente (pour contrats de formation longue durée)
    static async creerFacturationRecurrente(clientId, dossierId, typeService, parametres) {
        const factures = [];
        const { 
            montantTotal, 
            nombreEcheances, 
            dateDebut, 
            frequence, // mensuel, trimestriel, etc.
            titre
        } = parametres;

        const montantParEcheance = montantTotal / nombreEcheances;
        const dateDebutObj = new Date(dateDebut);

        for (let i = 0; i < nombreEcheances; i++) {
            const dateEcheance = new Date(dateDebutObj);
            
            if (frequence === 'mensuel') {
                dateEcheance.setMonth(dateEcheance.getMonth() + i);
            } else if (frequence === 'trimestriel') {
                dateEcheance.setMonth(dateEcheance.getMonth() + (i * 3));
            }

            const factureData = {
                client_id: clientId,
                dossier_voyage_id: typeService === 'voyage' ? dossierId : null,
                dossier_etudiant_id: typeService === 'etudiant' ? dossierId : null,
                titre: `${titre} - Échéance ${i + 1}/${nombreEcheances}`,
                description: `Échéance ${i + 1} sur ${nombreEcheances} - ${frequence}`,
                type_facture: i === 0 ? 'acompte' : (i === nombreEcheances - 1 ? 'solde' : 'standard'),
                date_echeance: dateEcheance.toISOString().split('T')[0],
                lignes: [{
                    designation: `Échéance ${i + 1}/${nombreEcheances}`,
                    description: `Paiement ${frequence} - ${titre}`,
                    quantite: 1,
                    prix_unitaire_ht: montantParEcheance / 1.20, // Supposant 20% de TVA
                    taux_tva: 20
                }]
            };

            const facture = await Facture.create(factureData);
            factures.push(facture);
        }

        return factures;
    }

    // Recalculer les totaux de la facture
    async recalculerTotaux() {
        // Récupérer toutes les lignes de la facture
        const lignesQuery = `
            SELECT SUM(montant_ht) as total_ht, 
                   SUM(montant_tva) as total_tva, 
                   SUM(montant_ttc) as total_ttc
            FROM factures_lignes 
            WHERE facture_id = $1
        `;
        
        const result = await db.query(lignesQuery, [this.id]);
        const totaux = result.rows[0];
        
        const montantHT = parseFloat(totaux.total_ht) || 0;
        const montantTVA = parseFloat(totaux.total_tva) || 0;
        const montantTTC = parseFloat(totaux.total_ttc) || 0;
        
        // Calculer la remise
        const montantRemise = montantHT * (this.remise_pourcentage / 100);
        const montantFinal = montantTTC - montantRemise;
        const montantRestant = montantFinal - (this.montant_paye || 0);
        
        // Mettre à jour la facture
        const updateQuery = `
            UPDATE factures 
            SET montant_ht = $1, 
                montant_tva = $2, 
                montant_ttc = $3, 
                montant_remise = $4, 
                montant_final = $5,
                montant_restant = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `;
        
        const updateResult = await db.query(updateQuery, [
            montantHT, montantTVA, montantTTC, 
            montantRemise, montantFinal, montantRestant, 
            this.id
        ]);
        
        if (updateResult.rows.length > 0) {
            Object.assign(this, updateResult.rows[0]);
        }
        
        return this;
    }

    // Templates pour différents types de services
    static getTemplate(type) {
        const templates = {
            voyage: {
                titre: 'Devis - Voyage organisé',
                type_facture: 'devis',
                lignes: [
                    {
                        designation: 'Billets d\'avion',
                        description: 'Billets aller-retour',
                        quantite: 1,
                        prix_unitaire_ht: 500,
                        taux_tva: 20
                    },
                    {
                        designation: 'Hébergement',
                        description: 'Hôtel 3 étoiles - 7 nuits',
                        quantite: 7,
                        prix_unitaire_ht: 80,
                        taux_tva: 20
                    },
                    {
                        designation: 'Assurance voyage',
                        description: 'Assurance complète',
                        quantite: 1,
                        prix_unitaire_ht: 50,
                        taux_tva: 20
                    }
                ],
                conditions_paiement: 'Devis valable 30 jours. Acompte de 30% à la réservation.'
            },
            etudiant: {
                titre: 'Devis - Dossier étudiant',
                type_facture: 'devis',
                lignes: [
                    {
                        designation: 'Frais de dossier',
                        description: 'Constitution du dossier administratif',
                        quantite: 1,
                        prix_unitaire_ht: 200,
                        taux_tva: 20
                    },
                    {
                        designation: 'Traduction documents',
                        description: 'Traduction certifiée des documents',
                        quantite: 5,
                        prix_unitaire_ht: 30,
                        taux_tva: 20
                    },
                    {
                        designation: 'Accompagnement visa',
                        description: 'Accompagnement pour la demande de visa',
                        quantite: 1,
                        prix_unitaire_ht: 150,
                        taux_tva: 20
                    }
                ],
                conditions_paiement: 'Devis valable 30 jours. Paiement à la signature du contrat.'
            },
            visa: {
                titre: 'Devis - Demande de visa',
                type_facture: 'devis',
                lignes: [
                    {
                        designation: 'Frais consulaires',
                        description: 'Frais officiels du consulat',
                        quantite: 1,
                        prix_unitaire_ht: 60,
                        taux_tva: 0
                    },
                    {
                        designation: 'Frais de service',
                        description: 'Accompagnement et suivi du dossier',
                        quantite: 1,
                        prix_unitaire_ht: 100,
                        taux_tva: 20
                    }
                ],
                conditions_paiement: 'Devis valable 15 jours. Les frais consulaires sont non remboursables.'
            }
        };

        return templates[type] || null;
    }

    // Générer un numéro de facture automatique
    static async genererNumeroFacture() {
        const annee = new Date().getFullYear();
        const query = `
            SELECT COALESCE(MAX(CAST(SUBSTRING(numero_facture FROM '[0-9]+$') AS INTEGER)), 0) + 1 as prochain_numero
            FROM factures 
            WHERE numero_facture LIKE 'FAC-${annee}-%'
        `;
        
        try {
            const result = await db.query(query);
            const prochainNumero = result.rows[0].prochain_numero;
            return `FAC-${annee}-${prochainNumero.toString().padStart(4, '0')}`;
        } catch (error) {
            // En cas d'erreur, utiliser un numéro basé sur timestamp
            const timestamp = Date.now();
            return `FAC-${annee}-${timestamp.toString().slice(-4)}`;
        }
    }

    // Mettre à jour automatiquement le statut selon les paiements (Règle métier)
    async mettreAJourStatutSelonPaiements() {
        try {
            // Vérifier s'il existe au moins un paiement confirmé pour cette facture
            const paiementQuery = `
                SELECT COUNT(*) as nb_paiements_confirmes
                FROM paiements p
                WHERE (
                    (p.dossier_voyage_id = $1 AND $1 IS NOT NULL) 
                    OR (p.dossier_etudiant_id = $2 AND $2 IS NOT NULL)
                    OR p.reference_transaction LIKE $3
                ) 
                AND p.statut = 'confirme'
            `;
            
            const result = await db.query(paiementQuery, [
                this.dossier_voyage_id,
                this.dossier_etudiant_id,
                `%${this.numero_facture}%`
            ]);
            
            const nbPaiementsConfirmes = parseInt(result.rows[0].nb_paiements_confirmes);
            
            // Appliquer la règle métier
            const nouveauStatut = nbPaiementsConfirmes > 0 ? 'payee' : 'non_payee';
            
            // Mettre à jour uniquement si le statut change
            if (this.statut !== nouveauStatut) {
                const updateQuery = `
                    UPDATE factures 
                    SET statut = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                    RETURNING *
                `;
                
                const updateResult = await db.query(updateQuery, [nouveauStatut, this.id]);
                
                if (updateResult.rows.length > 0) {
                    this.statut = nouveauStatut;
                    this.updated_at = updateResult.rows[0].updated_at;
                    
                    console.log(`✅ Statut facture ${this.numero_facture} mis à jour: ${nouveauStatut}`);
                }
            }
            
            return this.statut;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut de la facture:', error);
            throw error;
        }
    }

    // Mettre à jour le statut de toutes les factures selon leurs paiements
    static async mettreAJourTousLesStatuts() {
        try {
            const factures = await db.query('SELECT * FROM factures');
            let compteurMisAJour = 0;
            
            for (const factureData of factures.rows) {
                const facture = new Facture(factureData);
                const ancienStatut = facture.statut;
                await facture.mettreAJourStatutSelonPaiements();
                
                if (ancienStatut !== facture.statut) {
                    compteurMisAJour++;
                }
            }
            
            console.log(`✅ ${compteurMisAJour} factures ont eu leur statut mis à jour`);
            return compteurMisAJour;
        } catch (error) {
            console.error('Erreur lors de la mise à jour globale des statuts:', error);
            throw error;
        }
    }
}

module.exports = Facture;
