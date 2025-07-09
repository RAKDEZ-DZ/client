const Client = require('../model/client');

class ClientController {
    // GET /api/clients - Récupérer tous les clients
    static async getAllClients(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;
            
            const clients = await Client.findAll(parseInt(limit), parseInt(offset));
            const total = await Client.count();
            
            res.json({
                success: true,
                data: clients,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: total,
                    total_pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des clients',
                error: error.message
            });
        }
    }

    // GET /api/clients/:id - Récupérer un client par ID
    static async getClientById(req, res) {
        try {
            const { id } = req.params;
            const client = await Client.findById(id);
            
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            res.json({
                success: true,
                data: client
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération du client',
                error: error.message
            });
        }
    }

    // POST /api/clients - Créer un nouveau client
    static async createClient(req, res) {
        try {
            console.log("Création de client - Corps de la requête:", req.body);
            console.log("Création de client - Fichiers reçus:", req.files);
            
            const clientData = req.body;
            
            // Validation des champs requis
            const requiredFields = ['nom', 'prenom', 'email'];
            const missingFields = requiredFields.filter(field => !clientData[field]);
            
            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Champs requis manquants',
                    missing_fields: missingFields
                });
            }

            // Vérifier si l'email existe déjà
            const existingClient = await Client.findByEmail(clientData.email);
            if (existingClient) {
                return res.status(409).json({
                    success: false,
                    message: 'Un client avec cet email existe déjà'
                });
            }
            
            const client = await Client.create(clientData);
            
            // Traitement des fichiers si présents
            if (req.files && req.files.length > 0) {
                console.log(`Ajout de ${req.files.length} documents au client`);
                
                // Préparation des informations sur les fichiers
                const filesInfo = req.files.map(file => ({
                    filename: file.filename,
                    originalname: file.originalname,
                    size: file.size,
                    path: `uploads/${file.filename}`
                }));
                
                // Ajout des documents au client
                await client.addMultipleDocuments(filesInfo);
                
                console.log("Documents ajoutés avec succès");
            }
            
            // Récupérer le client mis à jour avec les documents
            const updatedClient = await Client.findById(client.id);
            
            res.status(201).json({
                success: true,
                message: 'Client créé avec succès',
                data: updatedClient
            });
        } catch (error) {
            console.error("Erreur lors de la création du client:", error);
            
            if (error.code === '23505') { // Contrainte unique violée
                res.status(409).json({
                    success: false,
                    message: 'Email ou numéro de passeport déjà utilisé'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création du client',
                    error: error.message
                });
            }
        }
    }

    // PUT /api/clients/:id - Mettre à jour un client
    static async updateClient(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            console.log('PUT /api/clients/:id - Mise à jour du client avec ID:', id);
            console.log('Données reçues pour mise à jour:', updateData);
            console.log('Fichiers reçus:', req.files);
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }

            // Vérifier si l'email est déjà utilisé par un autre client
            if (updateData.email && updateData.email !== client.email) {
                const existingClient = await Client.findByEmail(updateData.email);
                if (existingClient && existingClient.id !== parseInt(id)) {
                    return res.status(409).json({
                        success: false,
                        message: 'Cet email est déjà utilisé par un autre client'
                    });
                }
            }
            
            // Mettre à jour les données de base du client
            const updatedClient = await client.update(updateData);
            
            // Traitement des fichiers si présents
            if (req.files && req.files.length > 0) {
                console.log(`Ajout de ${req.files.length} documents lors de la mise à jour du client`);
                
                // Préparation des informations sur les fichiers
                const filesInfo = req.files.map(file => ({
                    filename: file.filename,
                    originalname: file.originalname,
                    size: file.size,
                    path: `uploads/${file.filename}`,
                    relativePath: file.filename
                }));
                
                console.log("Information des fichiers:", JSON.stringify(filesInfo));
                
                try {
                    // Ajout des documents au client
                    await updatedClient.addMultipleDocuments(filesInfo);
                    console.log("Documents ajoutés avec succès lors de la mise à jour");
                } catch (err) {
                    console.error("Erreur lors de l'ajout des documents:", err);
                }
            }
            
            // Récupérer le client mis à jour avec les documents
            const clientWithDocuments = await Client.findById(id);
            
            res.json({
                success: true,
                message: 'Client mis à jour avec succès',
                data: clientWithDocuments
            });
        } catch (error) {
            if (error.code === '23505') {
                res.status(409).json({
                    success: false,
                    message: 'Email ou numéro de passeport déjà utilisé'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la mise à jour du client',
                    error: error.message
                });
            }
        }
    }

    // DELETE /api/clients/:id - Supprimer un client
    static async deleteClient(req, res) {
        try {
            const { id } = req.params;
            const client = await Client.findById(id);
            
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            await client.delete();
            
            res.json({
                success: true,
                message: 'Client supprimé avec succès'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression du client',
                error: error.message
            });
        }
    }

    // GET /api/clients/search?q=terme - Rechercher des clients
    static async searchClients(req, res) {
        try {
            const { q } = req.query;
            
            if (!q || q.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Le terme de recherche doit contenir au moins 2 caractères'
                });
            }
            
            const clients = await Client.search(q.trim());
            
            res.json({
                success: true,
                data: clients,
                count: clients.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la recherche',
                error: error.message
            });
        }
    }

    // GET /api/clients/email/:email - Récupérer un client par email
    static async getClientByEmail(req, res) {
        try {
            const { email } = req.params;
            const client = await Client.findByEmail(email);
            
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé avec cet email'
                });
            }
            
            res.json({
                success: true,
                data: client
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération du client',
                error: error.message
            });
        }
    }

    // GET /api/clients/visa/:type - Récupérer les clients par type de visa
    static async getClientsByTypeVisa(req, res) {
        try {
            const { type } = req.params;
            const clients = await Client.findByTypeVisa(type);
            
            res.json({
                success: true,
                data: clients,
                count: clients.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des clients',
                error: error.message
            });
        }
    }

    // GET /api/clients/etat/:etat - Récupérer les clients par état du dossier
    static async getClientsByEtatDossier(req, res) {
        try {
            const { etat } = req.params;
            const clients = await Client.findByEtatDossier(etat);
            
            res.json({
                success: true,
                data: clients,
                count: clients.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des clients',
                error: error.message
            });
        }
    }

    // PUT /api/clients/:id/etat - Mettre à jour l'état du dossier
    static async updateEtatDossier(req, res) {
        try {
            const { id } = req.params;
            const { etat_dossier } = req.body;
            
            if (!etat_dossier) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'état du dossier est requis'
                });
            }

            // Valider les états autorisés
            const etatsAutorises = Client.getEtatsDossierValides();
            if (!Client.isEtatDossierValide(etat_dossier)) {
                return res.status(400).json({
                    success: false,
                    message: 'État du dossier invalide',
                    etats_autorises: etatsAutorises
                });
            }
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            const updatedClient = await client.updateEtatDossier(etat_dossier);
            
            res.json({
                success: true,
                message: 'État du dossier mis à jour avec succès',
                data: updatedClient
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour de l\'état',
                error: error.message
            });
        }
    }

    // PUT /api/clients/:id/document - Ajouter/mettre à jour un document PDF
    static async updateDocumentPdf(req, res) {
        try {
            const { id } = req.params;
            const { document_pdf } = req.body;
            
            if (!document_pdf) {
                return res.status(400).json({
                    success: false,
                    message: 'Le chemin du document PDF est requis'
                });
            }
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            const updatedClient = await client.addDocumentPdf(document_pdf);
            
            res.json({
                success: true,
                message: 'Document PDF ajouté avec succès',
                data: updatedClient
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'ajout du document',
                error: error.message
            });
        }
    }

    // POST /api/clients/:id/upload-document - Upload d'un ou plusieurs fichiers PDF
    static async uploadDocumentPdf(req, res) {
        try {
            const { id } = req.params;
            
            // Vérifier s'il y a des fichiers (un seul ou plusieurs)
            const hasMultipleFiles = req.files && req.files.length > 0;
            const hasSingleFile = req.file;
            
            if (!hasMultipleFiles && !hasSingleFile) {
                return res.status(400).json({
                    success: false,
                    message: 'Aucun fichier fourni'
                });
            }
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            let updatedClient;
            let filesInfo;
            
            if (hasMultipleFiles) {
                // Upload de plusieurs fichiers
                filesInfo = req.files.map(file => ({
                    filename: file.filename,
                    originalname: file.originalname,
                    size: file.size,
                    path: `uploads/${file.filename}`
                }));
                
                updatedClient = await client.addMultipleDocuments(filesInfo);
                
                res.json({
                    success: true,
                    message: `${req.files.length} document(s) PDF uploadé(s) avec succès`,
                    data: updatedClient,
                    files_info: filesInfo
                });
            } else {
                // Upload d'un seul fichier
                const filePath = `uploads/${req.file.filename}`;
                updatedClient = await client.addDocumentPdf(filePath);
                
                res.json({
                    success: true,
                    message: 'Document PDF uploadé avec succès',
                    data: updatedClient,
                    file_info: {
                        filename: req.file.filename,
                        original_name: req.file.originalname,
                        size: req.file.size,
                        path: filePath
                    }
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'upload du document',
                error: error.message
            });
        }
    }

    // POST /api/clients/:id/upload-documents - Upload de plusieurs fichiers PDF
    static async uploadMultipleDocuments(req, res) {
        try {
            const { id } = req.params;
            
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Aucun fichier fourni'
                });
            }
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            // Préparer les informations des fichiers
            const filesInfo = req.files.map(file => ({
                filename: file.filename,
                originalname: file.originalname,
                size: file.size,
                path: `uploads/${file.filename}`
            }));
            
            // Sauvegarder les fichiers dans la base de données
            const updatedClient = await client.addMultipleDocuments(filesInfo);
            
            res.json({
                success: true,
                message: `${req.files.length} document(s) PDF uploadé(s) avec succès`,
                data: updatedClient,
                files_info: filesInfo
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'upload des documents',
                error: error.message
            });
        }
    }

    // GET /api/clients/stats/visa - Statistiques par type de visa
    static async getStatsVisa(req, res) {
        try {
            const stats = await Client.getStatsByTypeVisa();
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statistiques',
                error: error.message
            });
        }
    }

    // GET /api/clients/stats/etat - Statistiques par état du dossier
    static async getStatsEtat(req, res) {
        try {
            const stats = await Client.getStatsByEtatDossier();
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statistiques',
                error: error.message
            });
        }
    }

    // GET /api/clients/documents/avec - Clients avec documents
    static async getClientsAvecDocuments(req, res) {
        try {
            const clients = await Client.findClientsWithDocuments();
            
            res.json({
                success: true,
                data: clients,
                count: clients.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des clients',
                error: error.message
            });
        }
    }

    // GET /api/clients/documents/sans - Clients sans documents
    static async getClientsSansDocuments(req, res) {
        try {
            const clients = await Client.findClientsSansDocuments();
            
            res.json({
                success: true,
                data: clients,
                count: clients.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des clients',
                error: error.message
            });
        }
    }

    // GET /api/clients/etats-dossier - Récupérer tous les états de dossier valides
    static async getEtatsDossier(req, res) {
        try {
            const etats = Client.getEtatsDossierValides();
            
            res.json({
                success: true,
                data: etats,
                constants: Client.ETATS_DOSSIER
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des états',
                error: error.message
            });
        }
    }

    // GET /api/clients/statuts-etudiant - Récupérer tous les statuts étudiants valides
    static async getStatutsEtudiant(req, res) {
        try {
            const statuts = Client.getStatutsEtudiantValides();
            
            res.json({
                success: true,
                data: statuts,
                constants: Client.STATUTS_ETUDIANT
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statuts étudiants',
                error: error.message
            });
        }
    }

    // GET /api/clients/statut/:statut - Récupérer les clients par statut étudiant
    static async getClientsByStatutEtudiant(req, res) {
        try {
            const { statut } = req.params;
            
            if (!Client.isStatutEtudiantValide(statut)) {
                return res.status(400).json({
                    success: false,
                    message: 'Statut étudiant invalide',
                    statuts_valides: Client.getStatutsEtudiantValides()
                });
            }
            
            const clients = await Client.findByStatutEtudiant(statut);
            
            res.json({
                success: true,
                data: clients,
                count: clients.length,
                statut: statut
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des clients',
                error: error.message
            });
        }
    }

    // PUT /api/clients/:id/statut-etudiant - Mettre à jour le statut étudiant d'un client
    static async updateStatutEtudiant(req, res) {
        try {
            const { id } = req.params;
            const { statut } = req.body;
            
            if (!statut) {
                return res.status(400).json({
                    success: false,
                    message: 'Le statut est requis'
                });
            }
            
            if (!Client.isStatutEtudiantValide(statut)) {
                return res.status(400).json({
                    success: false,
                    message: 'Statut étudiant invalide',
                    statuts_valides: Client.getStatutsEtudiantValides()
                });
            }
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            await client.updateStatutEtudiant(statut);
            
            res.json({
                success: true,
                message: 'Statut étudiant mis à jour avec succès',
                data: client
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour du statut',
                error: error.message
            });
        }
    }

    // PUT /api/clients/:id/dossier-etudiant - Mettre à jour les informations du dossier étudiant
    static async updateDossierEtudiant(req, res) {
        try {
            const { id } = req.params;
            const dossierData = req.body;
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            // Valider le statut si fourni
            if (dossierData.statut && !Client.isStatutEtudiantValide(dossierData.statut)) {
                return res.status(400).json({
                    success: false,
                    message: 'Statut étudiant invalide',
                    statuts_valides: Client.getStatutsEtudiantValides()
                });
            }
            
            await client.updateDossierEtudiant(dossierData);
            
            res.json({
                success: true,
                message: 'Dossier étudiant mis à jour avec succès',
                data: client
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour du dossier étudiant',
                error: error.message
            });
        }
    }

    // GET /api/clients/stats/statuts-etudiant - Statistiques par statut étudiant
    static async getStatsStatutsEtudiant(req, res) {
        try {
            const stats = await Client.getStatsByStatutEtudiant();
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statistiques',
                error: error.message
            });
        }
    }

    // GET /api/clients/statuts-payement - Récupérer tous les statuts de payement valides
    static async getStatutsPayement(req, res) {
        try {
            const statuts = Client.getStatutsPayementValides();
            
            res.json({
                success: true,
                data: statuts,
                constants: Client.STATUTS_PAYEMENT
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statuts de payement',
                error: error.message
            });
        }
    }

    // GET /api/clients/payement/:statut - Récupérer les clients par statut de payement
    static async getClientsByStatutPayement(req, res) {
        try {
            const { statut } = req.params;
            
            if (!Client.isStatutPayementValide(statut)) {
                return res.status(400).json({
                    success: false,
                    message: 'Statut de payement invalide',
                    statuts_valides: Client.getStatutsPayementValides()
                });
            }
            
            const clients = await Client.findByStatutPayement(statut);
            
            res.json({
                success: true,
                data: clients,
                count: clients.length,
                statut_payement: statut
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des clients',
                error: error.message
            });
        }
    }

    // PUT /api/clients/:id/statut-payement - Mettre à jour le statut de payement d'un client
    static async updateStatutPayement(req, res) {
        try {
            const { id } = req.params;
            const { statut } = req.body;
            
            if (!statut) {
                return res.status(400).json({
                    success: false,
                    message: 'Le statut de payement est requis'
                });
            }
            
            if (!Client.isStatutPayementValide(statut)) {
                return res.status(400).json({
                    success: false,
                    message: 'Statut de payement invalide',
                    statuts_valides: Client.getStatutsPayementValides()
                });
            }
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            await client.updateStatutPayement(statut);
            
            res.json({
                success: true,
                message: 'Statut de payement mis à jour avec succès',
                data: client
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour du statut de payement',
                error: error.message
            });
        }
    }

    // GET /api/clients/stats/payements - Statistiques par statut de payement
    static async getStatsPayements(req, res) {
        try {
            const stats = await Client.getStatsByStatutPayement();
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statistiques de payement',
                error: error.message
            });
        }
    }

    // POST /api/clients/:id/upload-document - Ajouter un document à un client
    static async addDocument(req, res) {
        try {
            const { id } = req.params;
            const documentInfo = req.body;
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            await client.addDocument(documentInfo);
            
            res.json({
                success: true,
                message: 'Document ajouté avec succès',
                data: client
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'ajout du document',
                error: error.message
            });
        }
    }

    // DELETE /api/clients/:id/documents/:documentId - Supprimer un document
    static async removeDocument(req, res) {
        try {
            const { id, documentId } = req.params;
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            await client.removeDocument(documentId);
            
            res.json({
                success: true,
                message: 'Document supprimé avec succès',
                data: client
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression du document',
                error: error.message
            });
        }
    }

    // GET /api/clients/:id/documents - Récupérer les documents d'un client
    static async getClientDocuments(req, res) {
        try {
            const { id } = req.params;
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            const documents = client.getDocuments();
            
            res.json({
                success: true,
                data: documents,
                count: documents.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des documents',
                error: error.message
            });
        }
    }

    // GET /api/clients/:id/documents/:documentId/download - Télécharger un document spécifique
    static async downloadDocument(req, res) {
        try {
            const { id, documentId } = req.params;
            
            console.log(`Demande de téléchargement du document ${documentId} pour le client ${id}`);
            
            const client = await Client.findById(id);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client non trouvé'
                });
            }
            
            const documents = client.getDocuments();
            const document = documents.find(doc => doc.id === parseInt(documentId) || doc.id === documentId);
            
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Document non trouvé'
                });
            }
            
            console.log('Document trouvé:', document);
            
            const fs = require('fs');
            const path = require('path');
            
            // Construire le chemin complet vers le fichier
            let filePath;
            if (document.path && document.path.startsWith('/')) {
                // Chemin absolu
                filePath = document.path;
            } else if (document.path) {
                // Chemin relatif - résoudre par rapport à la racine du projet
                filePath = path.resolve(process.cwd(), document.path);
            } else if (document.relativePath) {
                // Utiliser le chemin relatif s'il est disponible
                filePath = path.resolve(process.cwd(), 'uploads', document.relativePath);
            } else if (document.filename) {
                // Utiliser juste le nom du fichier s'il est disponible
                filePath = path.resolve(process.cwd(), 'uploads', document.filename);
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Informations de chemin insuffisantes pour le document'
                });
            }
            
            console.log('Chemin du fichier à télécharger:', filePath);
            
            // Vérifier si le fichier existe
            if (!fs.existsSync(filePath)) {
                console.error('Fichier non trouvé:', filePath);
                return res.status(404).json({
                    success: false,
                    message: 'Fichier physique non trouvé sur le serveur'
                });
            }
            
            // Définir le nom du fichier à télécharger
            const downloadFilename = document.originalname || document.name || document.filename || 'document.pdf';
            
            // Définir les en-têtes pour le téléchargement
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFilename)}"`);
            
            console.log(`Streaming du fichier ${filePath} vers le client avec le nom ${downloadFilename}`);
            
            // Streaming du fichier vers le client
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            
        } catch (error) {
            console.error('Erreur lors du téléchargement du document:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors du téléchargement du document',
                error: error.message
            });
        }
    }
}

module.exports = ClientController;
