const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { canViewPage, canCreateOnPage, canEditOnPage, canDeleteOnPage } = require('../middleware/pagePermissions');
const {
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
} = require('../controllers/dossierVoyageController');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes principales
router.post('/', canCreateOnPage('dossiers_voyage'), createDossierVoyage);                    // POST /api/dossiers-voyage
router.get('/', canViewPage('dossiers_voyage'), getAllDossiersVoyage);                    // GET /api/dossiers-voyage
router.get('/by-date-range', canViewPage('dossiers_voyage'), getDossiersVoyageByDateRange); // GET /api/dossiers-voyage/by-date-range?dateDebut=2025-01-01&dateFin=2025-12-31
router.get('/stats/chiffre-affaires', canViewPage('dossiers_voyage'), getChiffreAffairesByMois); // GET /api/dossiers-voyage/stats/chiffre-affaires?annee=2025
router.get('/stats/destinations', canViewPage('dossiers_voyage'), getStatsByDestination);  // GET /api/dossiers-voyage/stats/destinations
router.get('/voyages-a-venir', canViewPage('dossiers_voyage'), getVoyagesAVenir);         // GET /api/dossiers-voyage/voyages-a-venir?nombreJours=30
router.get('/statut/:statut', canViewPage('dossiers_voyage'), getDossiersVoyageByStatut);  // GET /api/dossiers-voyage/statut/confirme
router.get('/client/:clientId', canViewPage('dossiers_voyage'), getDossiersVoyageByClient); // GET /api/dossiers-voyage/client/1
router.get('/:id', canViewPage('dossiers_voyage'), getDossierVoyageById);                 // GET /api/dossiers-voyage/1
router.put('/:id', canEditOnPage('dossiers_voyage'), updateDossierVoyage);                  // PUT /api/dossiers-voyage/1
router.delete('/:id', canDeleteOnPage('dossiers_voyage'), deleteDossierVoyage);               // DELETE /api/dossiers-voyage/1

module.exports = router;
