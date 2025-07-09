const Paiement = require('../model/paiement');

// Créer un nouveau paiement
const createPaiement = async (req, res) => {
    try {
        const paiementData = req.body;
        
        // Validation des champs requis
        if (!paiementData.client_id || !paiementData.montant || !paiementData.methode_paiement) {
            return res.status(400).json({
                success: false,
                message: 'Les champs client_id, montant et methode_paiement sont requis'
            });
        }

        // Validation du montant
        if (paiementData.montant <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Le montant doit être supérieur à 0'
            });
        }

        // Validation de la méthode de paiement
        const methodesValides = ['especes', 'carte_bancaire', 'cheque', 'virement', 'paypal', 'autre'];
        if (!methodesValides.includes(paiementData.methode_paiement)) {
            return res.status(400).json({
                success: false,
                message: 'Méthode de paiement non valide'
            });
        }

        const paiement = await Paiement.create(paiementData);
        
        res.status(201).json({
            success: true,
            message: 'Paiement créé avec succès',
            data: paiement
        });
    } catch (error) {
        console.error('Erreur lors de la création du paiement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Récupérer un paiement par ID
const getPaiementById = async (req, res) => {
    try {
        const { id } = req.params;
        const paiement = await Paiement.findById(id);
        
        if (!paiement) {
            return res.status(404).json({
                success: false,
                message: 'Paiement non trouvé'
            });
        }
        
        res.json({
            success: true,
            data: paiement
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du paiement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Récupérer tous les paiements avec pagination
const getAllPaiements = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        
        const paiements = await Paiement.findAll(limit, offset);
        
        res.json({
            success: true,
            data: paiements,
            pagination: {
                page,
                limit,
                total: paiements.length
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des paiements:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Récupérer les paiements d'un client
const getPaiementsByClient = async (req, res) => {
    try {
        const { clientId } = req.params;
        const paiements = await Paiement.findByClientId(clientId);
        
        res.json({
            success: true,
            data: paiements
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des paiements du client:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Récupérer les paiements d'un dossier voyage
const getPaiementsByDossierVoyage = async (req, res) => {
    try {
        const { dossierVoyageId } = req.params;
        const paiements = await Paiement.findByDossierVoyage(dossierVoyageId);
        
        res.json({
            success: true,
            data: paiements
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des paiements du dossier voyage:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Récupérer les paiements d'un dossier étudiant
const getPaiementsByDossierEtudiant = async (req, res) => {
    try {
        const { dossierEtudiantId } = req.params;
        const paiements = await Paiement.findByDossierEtudiant(dossierEtudiantId);
        
        res.json({
            success: true,
            data: paiements
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des paiements du dossier étudiant:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Récupérer les paiements par statut
const getPaiementsByStatut = async (req, res) => {
    try {
        const { statut } = req.params;
        
        const statutsValides = ['en_attente', 'confirme', 'annule', 'rembourse'];
        if (!statutsValides.includes(statut)) {
            return res.status(400).json({
                success: false,
                message: 'Statut non valide'
            });
        }
        
        const paiements = await Paiement.findByStatut(statut);
        
        res.json({
            success: true,
            data: paiements
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des paiements par statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Mettre à jour un paiement
const updatePaiement = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const paiement = await Paiement.findById(id);
        if (!paiement) {
            return res.status(404).json({
                success: false,
                message: 'Paiement non trouvé'
            });
        }
        
        // Validation de la méthode de paiement si fournie
        if (updateData.methode_paiement) {
            const methodesValides = ['especes', 'carte_bancaire', 'cheque', 'virement', 'paypal', 'autre'];
            if (!methodesValides.includes(updateData.methode_paiement)) {
                return res.status(400).json({
                    success: false,
                    message: 'Méthode de paiement non valide'
                });
            }
        }
        
        // Validation du statut si fourni
        if (updateData.statut) {
            const statutsValides = ['en_attente', 'confirme', 'annule', 'rembourse'];
            if (!statutsValides.includes(updateData.statut)) {
                return res.status(400).json({
                    success: false,
                    message: 'Statut non valide'
                });
            }
        }
        
        // Validation du montant si fourni
        if (updateData.montant && updateData.montant <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Le montant doit être supérieur à 0'
            });
        }
        
        const paiementUpdated = await paiement.update(updateData);
        
        res.json({
            success: true,
            message: 'Paiement mis à jour avec succès',
            data: paiementUpdated
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du paiement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Confirmer un paiement
const confirmerPaiement = async (req, res) => {
    try {
        const { id } = req.params;
        
        const paiement = await Paiement.findById(id);
        if (!paiement) {
            return res.status(404).json({
                success: false,
                message: 'Paiement non trouvé'
            });
        }
        
        if (paiement.statut === 'confirme') {
            return res.status(400).json({
                success: false,
                message: 'Le paiement est déjà confirmé'
            });
        }
        
        const paiementConfirme = await paiement.confirmer();
        
        res.json({
            success: true,
            message: 'Paiement confirmé avec succès',
            data: paiementConfirme
        });
    } catch (error) {
        console.error('Erreur lors de la confirmation du paiement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Annuler un paiement
const annulerPaiement = async (req, res) => {
    try {
        const { id } = req.params;
        
        const paiement = await Paiement.findById(id);
        if (!paiement) {
            return res.status(404).json({
                success: false,
                message: 'Paiement non trouvé'
            });
        }
        
        if (paiement.statut === 'annule') {
            return res.status(400).json({
                success: false,
                message: 'Le paiement est déjà annulé'
            });
        }
        
        const paiementAnnule = await paiement.annuler();
        
        res.json({
            success: true,
            message: 'Paiement annulé avec succès',
            data: paiementAnnule
        });
    } catch (error) {
        console.error('Erreur lors de l\'annulation du paiement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Supprimer un paiement
const deletePaiement = async (req, res) => {
    try {
        const { id } = req.params;
        
        const paiement = await Paiement.findById(id);
        if (!paiement) {
            return res.status(404).json({
                success: false,
                message: 'Paiement non trouvé'
            });
        }
        
        await paiement.delete();
        
        res.json({
            success: true,
            message: 'Paiement supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du paiement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Statistiques - Chiffre d'affaires par période
const getChiffreAffairesByPeriode = async (req, res) => {
    try {
        const { dateDebut, dateFin } = req.query;
        
        if (!dateDebut || !dateFin) {
            return res.status(400).json({
                success: false,
                message: 'Les paramètres dateDebut et dateFin sont requis'
            });
        }
        
        const stats = await Paiement.getChiffreAffairesByPeriode(dateDebut, dateFin);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du chiffre d\'affaires:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Statistiques - Paiements par mois
const getStatsByMois = async (req, res) => {
    try {
        const { annee } = req.params;
        
        if (!annee || isNaN(annee)) {
            return res.status(400).json({
                success: false,
                message: 'L\'année doit être un nombre valide'
            });
        }
        
        const stats = await Paiement.getStatsByMois(parseInt(annee));
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques par mois:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Récupérer les paiements en attente
const getPaiementsEnAttente = async (req, res) => {
    try {
        const paiements = await Paiement.getPaiementsEnAttente();
        
        res.json({
            success: true,
            data: paiements
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des paiements en attente:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// Récupérer les impayés par client
const getImpayesParClient = async (req, res) => {
    try {
        const impayes = await Paiement.getImpayesParClient();
        
        res.json({
            success: true,
            data: impayes
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des impayés par client:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

module.exports = {
    createPaiement,
    getPaiementById,
    getAllPaiements,
    getPaiementsByClient,
    getPaiementsByDossierVoyage,
    getPaiementsByDossierEtudiant,
    getPaiementsByStatut,
    updatePaiement,
    confirmerPaiement,
    annulerPaiement,
    deletePaiement,
    getChiffreAffairesByPeriode,
    getStatsByMois,
    getPaiementsEnAttente,
    getImpayesParClient
};
