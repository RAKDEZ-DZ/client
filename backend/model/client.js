const db = require('../config/database');

// Constantes pour les états de dossier
const ETATS_DOSSIER = {
    DOSSIER_SOUMIS: 'Dossier soumis',
    EN_COURS_TRAITEMENT: 'En cours de traitement',
    TRAITE_EN_COURS_REPONSE: 'traite en cours de reponse',
    PASSEPORT_PRET: 'Passeport prêt à être retiré'
};

// Constantes pour les statuts de dossier étudiant
const STATUTS_ETUDIANT = {
    NOUVEAU: 'nouveau',
    INSCRIT: 'inscrit',
    EN_COURS: 'en_cours',
    INCOMPLET: 'incomplet',
    ADMISSION_RECU: 'admission_recu',
    REFUS: 'refus',
    ACCEPTER: 'accepter',
    PARTIE_VISA: 'partie_visa',
    TERMINER: 'terminer'
};

// Constantes pour les statuts de payement
const STATUTS_PAYEMENT = {
    PAYER: 'payer',
    PAS_PAYER: 'pas_payer',
    PARTIELLE: 'partielle'
};

class Client {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.prenom = data.prenom;
        this.email = data.email;
        this.telephone = data.telephone;
        this.type_visa = data.type_visa;
        this.etat_dossier = data.etat_dossier;
        // Nouveaux champs pour connexion client
        this.email_creer = data.email_creer;
        this.mot_de_passe = data.mot_de_passe;
        // Nouveaux attributs du dossier étudiant
        this.universite_destination = data.universite_destination;
        this.pays_destination = data.pays_destination;
        this.programme_etude = data.programme_etude;
        this.niveau_etude = data.niveau_etude;
        this.statut = data.statut;
        this.notes = data.notes;
        this.documents_requis = data.documents_requis;
        this.documents_soumis = data.documents_soumis;
        this.payement = data.payement;
        // Support pour documents multiples
        this.documents = data.documents;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Créer un nouveau client
    static async create(clientData) {
        const query = `
            INSERT INTO clients (nom, prenom, email, telephone, type_visa, etat_dossier, email_creer, mot_de_passe, universite_destination, pays_destination, programme_etude, niveau_etude, statut, notes, documents_requis, documents_soumis, payement, documents)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb, $17, $18::jsonb)
            RETURNING *
        `;
        
        // Préparation des documents avec validation
        let documentsJson = '[]';
        if (clientData.documents) {
            if (typeof clientData.documents === 'string') {
                try {
                    // Vérifier que c'est un JSON valide
                    JSON.parse(clientData.documents);
                    documentsJson = clientData.documents;
                } catch (e) {
                    console.error('Documents JSON invalide:', e);
                    documentsJson = '[]';
                }
            } else {
                // Si c'est déjà un objet, le convertir en JSON
                documentsJson = JSON.stringify(clientData.documents);
            }
        }
        
        // Préparation des documents_requis avec validation
        let documentsRequisJson = null;
        if (clientData.documents_requis) {
            if (typeof clientData.documents_requis === 'string') {
                try {
                    // Vérifier que c'est un JSON valide
                    JSON.parse(clientData.documents_requis);
                    documentsRequisJson = clientData.documents_requis;
                } catch (e) {
                    console.error('Documents requis JSON invalide:', e);
                    documentsRequisJson = null;
                }
            } else {
                // Si c'est déjà un objet, le convertir en JSON
                documentsRequisJson = JSON.stringify(clientData.documents_requis);
            }
        }
        
        // Préparation des documents_soumis avec validation
        let documentsSoumisJson = null;
        if (clientData.documents_soumis) {
            if (typeof clientData.documents_soumis === 'string') {
                try {
                    // Vérifier que c'est un JSON valide
                    JSON.parse(clientData.documents_soumis);
                    documentsSoumisJson = clientData.documents_soumis;
                } catch (e) {
                    console.error('Documents soumis JSON invalide:', e);
                    documentsSoumisJson = null;
                }
            } else {
                // Si c'est déjà un objet, le convertir en JSON
                documentsSoumisJson = JSON.stringify(clientData.documents_soumis);
            }
        }
        
        console.log('Documents à insérer:', documentsJson);
        
        const values = [
            clientData.nom,
            clientData.prenom,
            clientData.email,
            clientData.telephone,
            clientData.type_visa,
            clientData.etat_dossier || ETATS_DOSSIER.DOSSIER_SOUMIS,
            clientData.email_creer,
            clientData.mot_de_passe,
            clientData.universite_destination,
            clientData.pays_destination,
            clientData.programme_etude,
            clientData.niveau_etude,
            clientData.statut || STATUTS_ETUDIANT.NOUVEAU,
            clientData.notes,
            documentsRequisJson,
            documentsSoumisJson,
            clientData.payement || STATUTS_PAYEMENT.PAS_PAYER,
            documentsJson
        ];
        
        const result = await db.query(query, values);
        return new Client(result.rows[0]);
    }

    // Trouver un client par ID
    static async findById(id) {
        const query = 'SELECT * FROM clients WHERE id = $1';
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new Client(result.rows[0]);
    }

    // Trouver un client par email
    static async findByEmail(email) {
        const query = 'SELECT * FROM clients WHERE email = $1';
        const result = await db.query(query, [email]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new Client(result.rows[0]);
    }

    // Trouver un client par email_creer
    static async findByEmailCreer(email_creer) {
        const query = 'SELECT * FROM clients WHERE email_creer = $1';
        const result = await db.query(query, [email_creer]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new Client(result.rows[0]);
    }

    // Récupérer tous les clients
    static async findAll(limit = 50, offset = 0) {
        const query = 'SELECT * FROM clients ORDER BY created_at DESC LIMIT $1 OFFSET $2';
        const result = await db.query(query, [limit, offset]);
        
        return result.rows.map(row => new Client(row));
    }

    // Mettre à jour un client
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramCounter = 1;

        // Liste des champs qui sont stockés en JSON/JSONB
        const jsonFields = ['documents', 'documents_requis', 'documents_soumis'];

        // Construire dynamiquement la requête de mise à jour
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                // Traitement spécial pour les champs JSON
                if (jsonFields.includes(key)) {
                    // Convertir en chaîne JSON si ce n'est pas déjà le cas
                    let jsonValue = updateData[key];
                    if (typeof jsonValue !== 'string') {
                        jsonValue = JSON.stringify(jsonValue);
                    }
                    // Ajouter un cast explicite vers JSONB
                    fields.push(`${key} = $${paramCounter}::jsonb`);
                    values.push(jsonValue);
                } else {
                    fields.push(`${key} = $${paramCounter}`);
                    values.push(updateData[key]);
                }
                paramCounter++;
            }
        });

        if (fields.length === 0) {
            throw new Error('Aucun champ à mettre à jour');
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(this.id);

        console.log('Fields to update:', fields.join(', '));
        console.log('Values for update:', values);

        const query = `
            UPDATE clients 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCounter}
            RETURNING *
        `;

        console.log('Update query:', query);
        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            throw new Error('Client non trouvé');
        }

        // Mettre à jour les propriétés de l'instance
        Object.assign(this, result.rows[0]);
        return this;
    }

    // Supprimer un client
    async delete() {
        const query = 'DELETE FROM clients WHERE id = $1 RETURNING *';
        const result = await db.query(query, [this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Client non trouvé');
        }
        
        return true;
    }

    // Rechercher des clients
    static async search(searchTerm, limit = 20) {
        const query = `
            SELECT * FROM clients 
            WHERE nom ILIKE $1 OR prenom ILIKE $1 OR email ILIKE $1 
            ORDER BY created_at DESC 
            LIMIT $2
        `;
        const result = await db.query(query, [`%${searchTerm}%`, limit]);
        
        return result.rows.map(row => new Client(row));
    }

    // Compter le nombre total de clients
    static async count() {
        const query = 'SELECT COUNT(*) as total FROM clients';
        const result = await db.query(query);
        return parseInt(result.rows[0].total);
    }

    // Trouver les clients par type de visa
    static async findByTypeVisa(typeVisa) {
        const query = 'SELECT * FROM clients WHERE type_visa = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [typeVisa]);
        
        return result.rows.map(row => new Client(row));
    }

    // Trouver les clients par état du dossier
    static async findByEtatDossier(etatDossier) {
        const query = 'SELECT * FROM clients WHERE etat_dossier = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [etatDossier]);
        
        return result.rows.map(row => new Client(row));
    }

    // Mettre à jour l'état du dossier
    async updateEtatDossier(nouvelEtat) {
        const query = `
            UPDATE clients 
            SET etat_dossier = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [nouvelEtat, this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Client non trouvé');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Vérifier le mot de passe (comparaison simple, non crypté)
    verifyPassword(password) {
        return this.mot_de_passe === password;
    }

    // Statistiques par type de visa
    static async getStatsByTypeVisa() {
        const query = `
            SELECT 
                type_visa,
                COUNT(*) as nombre_clients,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as pourcentage
            FROM clients 
            WHERE type_visa IS NOT NULL
            GROUP BY type_visa
            ORDER BY nombre_clients DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    // Statistiques par état du dossier
    static async getStatsByEtatDossier() {
        const query = `
            SELECT 
                etat_dossier,
                COUNT(*) as nombre_clients,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as pourcentage
            FROM clients 
            GROUP BY etat_dossier
            ORDER BY nombre_clients DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    // Méthode pour obtenir tous les états de dossier valides
    static getEtatsDossierValides() {
        return Object.values(ETATS_DOSSIER);
    }

    // Méthode pour valider un état de dossier
    static isEtatDossierValide(etat) {
        return Object.values(ETATS_DOSSIER).includes(etat);
    }

    // Trouver les clients par statut étudiant
    static async findByStatutEtudiant(statut) {
        const query = 'SELECT * FROM clients WHERE statut = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [statut]);
        
        return result.rows.map(row => new Client(row));
    }

    // Mettre à jour le statut étudiant
    async updateStatutEtudiant(nouveauStatut) {
        const query = `
            UPDATE clients 
            SET statut = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [nouveauStatut, this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Client non trouvé');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Statistiques par statut étudiant
    static async getStatsByStatutEtudiant() {
        const query = `
            SELECT 
                statut,
                COUNT(*) as nombre_clients,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as pourcentage
            FROM clients 
            WHERE statut IS NOT NULL
            GROUP BY statut
            ORDER BY nombre_clients DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    // Mettre à jour les informations du dossier étudiant
    async updateDossierEtudiant(dossierData) {
        const fields = [];
        const values = [];
        let paramCounter = 1;

        // Champs spécifiques au dossier étudiant
        const champsEtudiant = [
            'universite_destination', 'pays_destination', 'programme_etude', 
            'niveau_etude', 'statut', 'notes', 'documents_requis', 'documents_soumis', 'payement', 'documents'
        ];

        champsEtudiant.forEach(key => {
            if (dossierData[key] !== undefined) {
                if (key === 'documents_requis' || key === 'documents_soumis' || key === 'documents') {
                    fields.push(`${key} = $${paramCounter}`);
                    values.push(JSON.stringify(dossierData[key]));
                } else {
                    fields.push(`${key} = $${paramCounter}`);
                    values.push(dossierData[key]);
                }
                paramCounter++;
            }
        });

        if (fields.length === 0) {
            throw new Error('Aucun champ de dossier étudiant à mettre à jour');
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(this.id);

        const query = `
            UPDATE clients 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCounter}
            RETURNING *
        `;

        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            throw new Error('Client non trouvé');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Méthode pour obtenir tous les statuts étudiants valides
    static getStatutsEtudiantValides() {
        return Object.values(STATUTS_ETUDIANT);
    }

    // Méthode pour valider un statut étudiant
    static isStatutEtudiantValide(statut) {
        return Object.values(STATUTS_ETUDIANT).includes(statut);
    }

    // Trouver les clients par statut de payement
    static async findByStatutPayement(statutPayement) {
        const query = 'SELECT * FROM clients WHERE payement = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [statutPayement]);
        
        return result.rows.map(row => new Client(row));
    }

    // Mettre à jour le statut de payement
    async updateStatutPayement(nouveauStatut) {
        const query = `
            UPDATE clients 
            SET payement = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [nouveauStatut, this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Client non trouvé');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Statistiques par statut de payement
    static async getStatsByStatutPayement() {
        const query = `
            SELECT 
                payement,
                COUNT(*) as nombre_clients,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as pourcentage
            FROM clients 
            WHERE payement IS NOT NULL
            GROUP BY payement
            ORDER BY nombre_clients DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    // Méthode pour obtenir tous les statuts de payement valides
    static getStatutsPayementValides() {
        return Object.values(STATUTS_PAYEMENT);
    }

    // Méthode pour valider un statut de payement
    static isStatutPayementValide(statut) {
        return Object.values(STATUTS_PAYEMENT).includes(statut);
    }

    // Ajouter un document à la liste des documents
    async addDocument(documentInfo) {
        const currentDocuments = this.documents || [];
        const newDocument = {
            id: Date.now().toString(),
            nom: documentInfo.nom,
            chemin: documentInfo.chemin,
            type: documentInfo.type,
            taille: documentInfo.taille,
            date_upload: new Date().toISOString()
        };
        
        currentDocuments.push(newDocument);
        
        const query = `
            UPDATE clients 
            SET documents = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [JSON.stringify(currentDocuments), this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Client non trouvé');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Supprimer un document de la liste
    async removeDocument(documentId) {
        const currentDocuments = this.documents || [];
        const updatedDocuments = currentDocuments.filter(doc => doc.id !== documentId);
        
        const query = `
            UPDATE clients 
            SET documents = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [JSON.stringify(updatedDocuments), this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Client non trouvé');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Récupérer la liste des documents d'un client
    getDocuments() {
        return this.documents || [];
    }

    // Clients avec documents
    static async findClientsWithDocuments() {
        const query = `
            SELECT * FROM clients 
            WHERE documents IS NOT NULL AND jsonb_array_length(documents) > 0
            ORDER BY updated_at DESC
        `;
        const result = await db.query(query);
        
        return result.rows.map(row => new Client(row));
    }

    // Clients sans documents
    static async findClientsSansDocuments() {
        const query = `
            SELECT * FROM clients 
            WHERE documents IS NULL OR jsonb_array_length(documents) = 0
            ORDER BY created_at DESC
        `;
        const result = await db.query(query);
        
        return result.rows.map(row => new Client(row));
    }

    // Ajouter un document PDF (rétrocompatibilité)
    async addDocumentPdf(filePath) {
        const newDocument = {
            id: Date.now(),
            filename: filePath.split('/').pop(),
            path: filePath,
            originalName: filePath.split('/').pop(),
            type: 'document_pdf',
            uploadDate: new Date().toISOString()
        };

        const currentDocuments = this.documents || [];
        currentDocuments.push(newDocument);

        const query = `
            UPDATE clients 
            SET documents = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [JSON.stringify(currentDocuments), this.id]);

        if (result.rows.length === 0) {
            throw new Error('Client non trouvé');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Ajouter plusieurs documents d'un coup
    async addMultipleDocuments(documentsInfo) {
        // S'assurer que documents est un tableau, même s'il est null ou undefined
        const currentDocuments = this.documents || [];
        const currentDocumentsArray = Array.isArray(currentDocuments) ? currentDocuments : [];

        // S'assurer que documentsInfo est un tableau
        const docsToAdd = Array.isArray(documentsInfo) ? documentsInfo : [documentsInfo];
        
        // Créer les nouveaux objets document avec un format unifié
        const newDocuments = docsToAdd.map(doc => ({
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
            name: doc.originalname || doc.filename,
            originalName: doc.originalname,
            filename: doc.filename,
            path: doc.path,
            relativePath: doc.path.replace(/^uploads[\/\\]/, ''),
            size: doc.size,
            date_upload: new Date().toISOString()
        }));
        
        console.log('Documents actuels:', JSON.stringify(currentDocumentsArray));
        console.log('Nouveaux documents à ajouter:', JSON.stringify(newDocuments));
        
        // Ajouter les nouveaux documents à la liste existante
        const updatedDocuments = [...currentDocumentsArray, ...newDocuments];
        
        console.log('Documents mis à jour (avant JSON.stringify):', updatedDocuments);
        
        // Convertir en JSON pour PostgreSQL
        const jsonbValue = JSON.stringify(updatedDocuments);
        console.log('Documents mis à jour (après JSON.stringify):', jsonbValue);
        
        const query = `
            UPDATE clients 
            SET documents = $1::jsonb, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [jsonbValue, this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Client non trouvé');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }
}

// Exporter la classe et les constantes
Client.ETATS_DOSSIER = ETATS_DOSSIER;
Client.STATUTS_ETUDIANT = STATUTS_ETUDIANT;
Client.STATUTS_PAYEMENT = STATUTS_PAYEMENT;
module.exports = Client;