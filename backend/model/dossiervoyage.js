const db = require('../config/database');

class DossierVoyage {
    constructor(data) {
        this.id = data.id;
        this.client_id = data.client_id;
        this.type_voyage = data.type_voyage;
        this.destination = data.destination;
        this.date_depart = data.date_depart;
        this.date_retour = data.date_retour;
        this.nombre_personnes = data.nombre_personnes;
        this.motif_voyage = data.motif_voyage;
        this.statut = data.statut;
        this.prix_total = data.prix_total;
        this.acompte_verse = data.acompte_verse;
        this.reste_a_payer = data.reste_a_payer;
        this.notes = data.notes;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Créer un nouveau dossier voyage
    static async create(voyageData) {
        try {
            console.log('📊 Traitement des données du voyage pour la base de données');
            
            // Validation de base
            if (!voyageData.client_id) {
                throw new Error('client_id est requis');
            }
            
            // Formatage des données
            const prix_total = voyageData.prix_total !== undefined ? 
                parseFloat(voyageData.prix_total) : null;
                
            const acompte_verse = voyageData.acompte_verse !== undefined ? 
                parseFloat(voyageData.acompte_verse) : 0;
                
            let reste_a_payer = voyageData.reste_a_payer;
            // Calcul automatique du reste à payer si non fourni
            if (reste_a_payer === undefined && prix_total !== null) {
                reste_a_payer = prix_total - acompte_verse;
            } else if (reste_a_payer !== undefined) {
                reste_a_payer = parseFloat(reste_a_payer);
            }
            
            // Formatage des dates
            let date_depart = voyageData.date_depart;
            let date_retour = voyageData.date_retour || null;
            
            // S'assurer que les dates sont au bon format
            if (typeof date_depart === 'string' && date_depart.length === 10) {
                // Format YYYY-MM-DD - pas besoin de changer
            } else if (date_depart instanceof Date) {
                date_depart = date_depart.toISOString().split('T')[0];
            }
            
            if (date_retour) {
                if (typeof date_retour === 'string' && date_retour.length === 10) {
                    // Format YYYY-MM-DD - pas besoin de changer
                } else if (date_retour instanceof Date) {
                    date_retour = date_retour.toISOString().split('T')[0];
                }
            }
            
            // Log des valeurs formatées
            console.log('📊 Valeurs formatées:', {
                client_id: voyageData.client_id,
                date_depart: date_depart,
                date_retour: date_retour,
                prix_total: prix_total,
                acompte_verse: acompte_verse,
                reste_a_payer: reste_a_payer
            });
            
            const query = `
                INSERT INTO dossiers_voyage (
                    client_id, type_voyage, destination, date_depart, date_retour,
                    nombre_personnes, motif_voyage, statut, prix_total, acompte_verse, 
                    reste_a_payer, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `;
            const values = [
                voyageData.client_id,
                voyageData.type_voyage,
                voyageData.destination,
                date_depart,
                date_retour,
                voyageData.nombre_personnes || 1,
                voyageData.motif_voyage,
                voyageData.statut || 'en_cours',
                prix_total,
                acompte_verse,
                reste_a_payer,
                voyageData.notes || ''
            ];
            
            console.log('🔍 Requête SQL préparée, paramètres:', values);
            const result = await db.query(query, values);
            
            console.log('✅ Voyage inséré avec succès, ID:', result.rows[0].id);
            return new DossierVoyage(result.rows[0]);
        } catch (error) {
            console.error('❌ Erreur dans la méthode create:', error);
            throw error;
        }
    }

    // Trouver un dossier par ID
    static async findById(id) {
        const query = `
            SELECT dv.*, c.nom, c.prenom, c.email, c.telephone
            FROM dossiers_voyage dv
            JOIN clients c ON dv.client_id = c.id
            WHERE dv.id = $1
        `;
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const dossier = new DossierVoyage(result.rows[0]);
        dossier.client = {
            nom: result.rows[0].nom,
            prenom: result.rows[0].prenom,
            email: result.rows[0].email,
            telephone: result.rows[0].telephone
        };
        
        return dossier;
    }

    // Trouver tous les dossiers d'un client
    static async findByClientId(clientId) {
        const query = 'SELECT * FROM dossiers_voyage WHERE client_id = $1 ORDER BY date_depart DESC';
        const result = await db.query(query, [clientId]);
        
        return result.rows.map(row => new DossierVoyage(row));
    }

    // Récupérer tous les dossiers avec pagination
    static async findAll(limit = 50, offset = 0) {
        const query = `
            SELECT dv.*, c.nom, c.prenom, c.email
            FROM dossiers_voyage dv
            JOIN clients c ON dv.client_id = c.id
            ORDER BY dv.date_depart DESC 
            LIMIT $1 OFFSET $2
        `;
        const result = await db.query(query, [limit, offset]);
        
        return result.rows.map(row => {
            const dossier = new DossierVoyage(row);
            dossier.client = {
                nom: row.nom,
                prenom: row.prenom,
                email: row.email
            };
            return dossier;
        });
    }

    // Trouver les voyages par période
    static async findByDateRange(dateDebut, dateFin) {
        const query = `
            SELECT dv.*, c.nom, c.prenom
            FROM dossiers_voyage dv
            JOIN clients c ON dv.client_id = c.id
            WHERE dv.date_depart BETWEEN $1 AND $2
            ORDER BY dv.date_depart ASC
        `;
        const result = await db.query(query, [dateDebut, dateFin]);
        
        return result.rows.map(row => {
            const dossier = new DossierVoyage(row);
            dossier.client = {
                nom: row.nom,
                prenom: row.prenom
            };
            return dossier;
        });
    }

    // Trouver les dossiers par statut
    static async findByStatut(statut) {
        const query = `
            SELECT dv.*, c.nom, c.prenom, c.email
            FROM dossiers_voyage dv
            JOIN clients c ON dv.client_id = c.id
            WHERE dv.statut = $1
            ORDER BY dv.date_depart DESC
        `;
        const result = await db.query(query, [statut]);
        
        return result.rows.map(row => {
            const dossier = new DossierVoyage(row);
            dossier.client = {
                nom: row.nom,
                prenom: row.prenom,
                email: row.email
            };
            return dossier;
        });
    }

    // Mettre à jour un dossier voyage
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
            UPDATE dossiers_voyage 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCounter}
            RETURNING *
        `;

        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            throw new Error('Dossier voyage non trouvé');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Supprimer un dossier
    async delete() {
        const query = 'DELETE FROM dossiers_voyage WHERE id = $1 RETURNING *';
        const result = await db.query(query, [this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Dossier voyage non trouvé');
        }
        
        return true;
    }

    // Calculer le chiffre d'affaires par mois
    static async getChiffreAffairesByMois(annee) {
        const query = `
            SELECT 
                EXTRACT(MONTH FROM date_depart) as mois,
                SUM(prix_total) as chiffre_affaires,
                COUNT(*) as nombre_voyages
            FROM dossiers_voyage 
            WHERE EXTRACT(YEAR FROM date_depart) = $1 
                AND statut IN ('confirme', 'termine')
            GROUP BY EXTRACT(MONTH FROM date_depart)
            ORDER BY mois
        `;
        const result = await db.query(query, [annee]);
        return result.rows;
    }

    // Statistiques par destination
    static async getStatsByDestination() {
        const query = `
            SELECT destination, COUNT(*) as nombre_voyages, SUM(prix_total) as chiffre_affaires
            FROM dossiers_voyage 
            WHERE statut IN ('confirme', 'termine')
            GROUP BY destination
            ORDER BY nombre_voyages DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    // Voyages à venir
    static async getVoyagesAVenir(nombreJours = 30) {
        const query = `
            SELECT dv.*, c.nom, c.prenom, c.telephone
            FROM dossiers_voyage dv
            JOIN clients c ON dv.client_id = c.id
            WHERE dv.date_depart BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${nombreJours} days'
                AND dv.statut = 'confirme'
            ORDER BY dv.date_depart ASC
        `;
        const result = await db.query(query);
        
        return result.rows.map(row => {
            const dossier = new DossierVoyage(row);
            dossier.client = {
                nom: row.nom,
                prenom: row.prenom,
                telephone: row.telephone
            };
            return dossier;
        });
    }
}

module.exports = DossierVoyage;