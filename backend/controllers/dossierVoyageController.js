const DossierVoyage = require('../model/dossiervoyage');

// Créer un nouveau dossier voyage
const createDossierVoyage = async (req, res) => {
    try {
        console.log('📝 Création d\'un dossier voyage avec les données:', JSON.stringify(req.body, null, 2));
        
        // Validation des champs requis
        const requiredFields = ['client_id', 'destination', 'type_voyage', 'date_depart', 'motif_voyage'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            console.error('❌ Champs manquants:', missingFields);
            return res.status(400).json({
                success: false,
                message: 'Champs obligatoires manquants',
                missing_fields: missingFields
            });
        }
        
        const dossier = await DossierVoyage.create(req.body);
        console.log('✅ Dossier voyage créé avec succès:', JSON.stringify(dossier, null, 2));
        
        res.status(201).json({
            success: true,
            message: 'Dossier voyage créé avec succès',
            data: dossier
        });
    } catch (error) {
        console.error('❌ Erreur lors de la création du dossier voyage:', error);
        
        // Fournir plus de détails en cas d'erreur SQL
        let errorDetails = error.message;
        if (error.code) {
            if (error.code === '23503') {
                errorDetails = 'Erreur de contrainte de clé étrangère. Vérifiez que le client_id existe.';
            } else if (error.code === '23505') {
                errorDetails = 'Un dossier similaire existe déjà (violation de contrainte unique).';
            } else if (error.code === '22P02') {
                errorDetails = 'Erreur de format de données. Vérifiez les types des champs (dates, nombres, etc.).';
            }
        }
        
        res.status(400).json({
            success: false,
            message: 'Erreur lors de la création du dossier voyage',
            error: errorDetails,
            original_error: error.message
        });
    }
};

// Récupérer tous les dossiers voyage
const getAllDossiersVoyage = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const dossiers = await DossierVoyage.findAll(parseInt(limit), parseInt(offset));
        res.status(200).json({
            success: true,
            message: 'Dossiers voyage récupérés avec succès',
            data: dossiers,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des dossiers voyage',
            error: error.message
        });
    }
};

// Récupérer un dossier voyage par ID
const getDossierVoyageById = async (req, res) => {
    try {
        const { id } = req.params;
        const dossier = await DossierVoyage.findById(id);
        
        if (!dossier) {
            return res.status(404).json({
                success: false,
                message: 'Dossier voyage non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Dossier voyage récupéré avec succès',
            data: dossier
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du dossier voyage',
            error: error.message
        });
    }
};

// Récupérer les dossiers voyage d'un client
const getDossiersVoyageByClient = async (req, res) => {
    try {
        const { clientId } = req.params;
        const dossiers = await DossierVoyage.findByClientId(clientId);
        
        res.status(200).json({
            success: true,
            message: 'Dossiers voyage du client récupérés avec succès',
            data: dossiers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des dossiers voyage du client',
            error: error.message
        });
    }
};

// Récupérer les dossiers voyage par statut
const getDossiersVoyageByStatut = async (req, res) => {
    try {
        const { statut } = req.params;
        const dossiers = await DossierVoyage.findByStatut(statut);
        
        res.status(200).json({
            success: true,
            message: `Dossiers voyage avec le statut "${statut}" récupérés avec succès`,
            data: dossiers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des dossiers voyage par statut',
            error: error.message
        });
    }
};

// Récupérer les dossiers voyage par période
const getDossiersVoyageByDateRange = async (req, res) => {
    try {
        const { dateDebut, dateFin } = req.query;
        
        if (!dateDebut || !dateFin) {
            return res.status(400).json({
                success: false,
                message: 'Les paramètres dateDebut et dateFin sont requis'
            });
        }

        const dossiers = await DossierVoyage.findByDateRange(dateDebut, dateFin);
        
        res.status(200).json({
            success: true,
            message: 'Dossiers voyage par période récupérés avec succès',
            data: dossiers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des dossiers voyage par période',
            error: error.message
        });
    }
};

// Mettre à jour un dossier voyage
const updateDossierVoyage = async (req, res) => {
    try {
        const { id } = req.params;
        const dossier = await DossierVoyage.findById(id);
        
        if (!dossier) {
            return res.status(404).json({
                success: false,
                message: 'Dossier voyage non trouvé'
            });
        }

        const updatedDossier = await dossier.update(req.body);
        
        res.status(200).json({
            success: true,
            message: 'Dossier voyage mis à jour avec succès',
            data: updatedDossier
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Erreur lors de la mise à jour du dossier voyage',
            error: error.message
        });
    }
};

// Supprimer un dossier voyage
const deleteDossierVoyage = async (req, res) => {
    try {
        const { id } = req.params;
        const dossier = await DossierVoyage.findById(id);
        
        if (!dossier) {
            return res.status(404).json({
                success: false,
                message: 'Dossier voyage non trouvé'
            });
        }

        await dossier.delete();
        
        res.status(200).json({
            success: true,
            message: 'Dossier voyage supprimé avec succès'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du dossier voyage',
            error: error.message
        });
    }
};

// Obtenir les statistiques de chiffre d'affaires par mois
const getChiffreAffairesByMois = async (req, res) => {
    try {
        const { annee = new Date().getFullYear() } = req.query;
        const stats = await DossierVoyage.getChiffreAffairesByMois(parseInt(annee));
        
        res.status(200).json({
            success: true,
            message: `Chiffre d'affaires par mois pour l'année ${annee}`,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du chiffre d\'affaires',
            error: error.message
        });
    }
};

// Obtenir les statistiques par destination
const getStatsByDestination = async (req, res) => {
    try {
        const stats = await DossierVoyage.getStatsByDestination();
        
        res.status(200).json({
            success: true,
            message: 'Statistiques par destination récupérées avec succès',
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques par destination',
            error: error.message
        });
    }
};

// Obtenir les voyages à venir
const getVoyagesAVenir = async (req, res) => {
    try {
        const { nombreJours = 30 } = req.query;
        const voyages = await DossierVoyage.getVoyagesAVenir(parseInt(nombreJours));
        
        res.status(200).json({
            success: true,
            message: `Voyages à venir dans les ${nombreJours} prochains jours`,
            data: voyages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des voyages à venir',
            error: error.message
        });
    }
};

module.exports = {
    createDossierVoyage,
    getAllDossiersVoyage,
    getDossierVoyageById,
    getDossiersVoyageByClient,
    getDossiersVoyageByStatut,
    getDossiersVoyageByDateRange,
    updateDossierVoyage,
    deleteDossierVoyage,
    getChiffreAffairesByMois,
    getStatsByDestination,
    getVoyagesAVenir
};
