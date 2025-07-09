const db = require('../config/database');

class Paiement {
    constructor(data) {
        this.id = data.id;
        this.client_id = data.client_id;
        this.dossier_voyage_id = data.dossier_voyage_id;
        this.dossier_etudiant_id = data.dossier_etudiant_id;
        this.montant = data.montant;
        this.methode_paiement = data.methode_paiement;
        this.statut = data.statut;
        this.reference_transaction = data.reference_transaction;
        this.date_paiement = data.date_paiement;
        this.notes = data.notes;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Créer un nouveau paiement
    static async create(paiementData) {
        const query = `
            INSERT INTO paiements (
                client_id, dossier_voyage_id, dossier_etudiant_id, montant,
                methode_paiement, statut, reference_transaction, date_paiement, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const values = [
            paiementData.client_id,
            paiementData.dossier_voyage_id || null,
            paiementData.dossier_etudiant_id || null,
            paiementData.montant,
            paiementData.methode_paiement,
            paiementData.statut || 'en_attente',
            paiementData.reference_transaction,
            paiementData.date_paiement || new Date(),
            paiementData.notes
        ];
        
        const result = await db.query(query, values);
        return new Paiement(result.rows[0]);
    }

    // Trouver un paiement par ID
    static async findById(id) {
        const query = `
            SELECT p.*, c.nom, c.prenom, c.email
            FROM paiements p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = $1
        `;
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const paiement = new Paiement(result.rows[0]);
        paiement.client = {
            nom: result.rows[0].nom,
            prenom: result.rows[0].prenom,
            email: result.rows[0].email
        };
        
        return paiement;
    }

    // Trouver tous les paiements d'un client
    static async findByClientId(clientId) {
        const query = 'SELECT * FROM paiements WHERE client_id = $1 ORDER BY date_paiement DESC';
        const result = await db.query(query, [clientId]);
        
        return result.rows.map(row => new Paiement(row));
    }

    // Trouver les paiements pour un dossier voyage
    static async findByDossierVoyage(dossierVoyageId) {
        const query = `
            SELECT p.*, c.nom, c.prenom
            FROM paiements p
            JOIN clients c ON p.client_id = c.id
            WHERE p.dossier_voyage_id = $1
            ORDER BY p.date_paiement DESC
        `;
        const result = await db.query(query, [dossierVoyageId]);
        
        return result.rows.map(row => {
            const paiement = new Paiement(row);
            paiement.client = {
                nom: row.nom,
                prenom: row.prenom
            };
            return paiement;
        });
    }

    // Trouver les paiements pour un dossier étudiant
    static async findByDossierEtudiant(dossierEtudiantId) {
        const query = `
            SELECT p.*, c.nom, c.prenom
            FROM paiements p
            JOIN clients c ON p.client_id = c.id
            WHERE p.dossier_etudiant_id = $1
            ORDER BY p.date_paiement DESC
        `;
        const result = await db.query(query, [dossierEtudiantId]);
        
        return result.rows.map(row => {
            const paiement = new Paiement(row);
            paiement.client = {
                nom: row.nom,
                prenom: row.prenom
            };
            return paiement;
        });
    }

    // Récupérer tous les paiements avec pagination
    static async findAll(limit = 50, offset = 0) {
        const query = `
            SELECT p.*, c.nom, c.prenom, c.email
            FROM paiements p
            JOIN clients c ON p.client_id = c.id
            ORDER BY p.date_paiement DESC 
            LIMIT $1 OFFSET $2
        `;
        const result = await db.query(query, [limit, offset]);
        
        return result.rows.map(row => {
            const paiement = new Paiement(row);
            paiement.client = {
                nom: row.nom,
                prenom: row.prenom,
                email: row.email
            };
            return paiement;
        });
    }

    // Trouver les paiements par statut
    static async findByStatut(statut) {
        const query = `
            SELECT p.*, c.nom, c.prenom, c.email
            FROM paiements p
            JOIN clients c ON p.client_id = c.id
            WHERE p.statut = $1
            ORDER BY p.date_paiement DESC
        `;
        const result = await db.query(query, [statut]);
        
        return result.rows.map(row => {
            const paiement = new Paiement(row);
            paiement.client = {
                nom: row.nom,
                prenom: row.prenom,
                email: row.email
            };
            return paiement;
        });
    }

    // Mettre à jour un paiement
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramCounter = 1;

        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                fields.push(`${key} = $${paramCounter}`);
                values.push(updateData[key]);
                paramCounter++;
            }
        });

        if (fields.length === 0) {
            throw new Error('Aucun champ à mettre à jour');
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(this.id);

        const query = `
            UPDATE paiements 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCounter}
            RETURNING *
        `;

        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            throw new Error('Paiement non trouvé');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Confirmer un paiement
    async confirmer() {
        return await this.update({
            statut: 'confirme',
            date_paiement: new Date()
        });
    }

    // Annuler un paiement
    async annuler() {
        return await this.update({
            statut: 'annule'
        });
    }

    // Supprimer un paiement
    async delete() {
        const query = 'DELETE FROM paiements WHERE id = $1 RETURNING *';
        const result = await db.query(query, [this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Paiement non trouvé');
        }
        
        return true;
    }

    // Calculer le chiffre d'affaires par période
    static async getChiffreAffairesByPeriode(dateDebut, dateFin) {
        const query = `
            SELECT 
                SUM(montant) as chiffre_affaires,
                COUNT(*) as nombre_paiements,
                methode_paiement
            FROM paiements 
            WHERE date_paiement BETWEEN $1 AND $2 
                AND statut = 'confirme'
            GROUP BY methode_paiement
            ORDER BY chiffre_affaires DESC
        `;
        const result = await db.query(query, [dateDebut, dateFin]);
        return result.rows;
    }

    // Statistiques des paiements par mois
    static async getStatsByMois(annee) {
        const query = `
            SELECT 
                EXTRACT(MONTH FROM date_paiement) as mois,
                SUM(montant) as total_paiements,
                COUNT(*) as nombre_paiements,
                AVG(montant) as montant_moyen
            FROM paiements 
            WHERE EXTRACT(YEAR FROM date_paiement) = $1 
                AND statut = 'confirme'
            GROUP BY EXTRACT(MONTH FROM date_paiement)
            ORDER BY mois
        `;
        const result = await db.query(query, [annee]);
        return result.rows;
    }

    // Paiements en attente
    static async getPaiementsEnAttente() {
        const query = `
            SELECT p.*, c.nom, c.prenom, c.telephone, c.email
            FROM paiements p
            JOIN clients c ON p.client_id = c.id
            WHERE p.statut = 'en_attente'
            ORDER BY p.created_at ASC
        `;
        const result = await db.query(query);
        
        return result.rows.map(row => {
            const paiement = new Paiement(row);
            paiement.client = {
                nom: row.nom,
                prenom: row.prenom,
                telephone: row.telephone,
                email: row.email
            };
            return paiement;
        });
    }

    // Total des impayés par client
    static async getImpayesParClient() {
        const query = `
            SELECT 
                c.id,
                c.nom,
                c.prenom,
                c.email,
                SUM(p.montant) as total_impaye,
                COUNT(p.id) as nombre_paiements_attente
            FROM clients c
            JOIN paiements p ON c.id = p.client_id
            WHERE p.statut = 'en_attente'
            GROUP BY c.id, c.nom, c.prenom, c.email
            ORDER BY total_impaye DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }
}

module.exports = Paiement;