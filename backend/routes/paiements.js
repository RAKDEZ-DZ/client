const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { canViewPage, canCreateOnPage, canEditOnPage, canDeleteOnPage } = require('../middleware/pagePermissions');
const {
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
} = require('../controllers/paiementController');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes de base
router.post('/', canCreateOnPage('paiements'), createPaiement);                          // POST /api/paiements - Créer un paiement
router.get('/', canViewPage('paiements'), getAllPaiements);                          // GET /api/paiements - Récupérer tous les paiements
router.get('/:id', canViewPage('paiements'), getPaiementById);                       // GET /api/paiements/:id - Récupérer un paiement par ID
router.put('/:id', canEditOnPage('paiements'), updatePaiement);                        // PUT /api/paiements/:id - Mettre à jour un paiement
router.delete('/:id', canDeleteOnPage('paiements'), deletePaiement);                     // DELETE /api/paiements/:id - Supprimer un paiement

// Routes par entité
router.get('/client/:clientId', canViewPage('paiements'), getPaiementsByClient);     // GET /api/paiements/client/:clientId - Paiements d'un client
router.get('/voyage/:dossierVoyageId', canViewPage('paiements'), getPaiementsByDossierVoyage);     // GET /api/paiements/voyage/:dossierVoyageId - Paiements d'un dossier voyage
router.get('/etudiant/:dossierEtudiantId', canViewPage('paiements'), getPaiementsByDossierEtudiant); // GET /api/paiements/etudiant/:dossierEtudiantId - Paiements d'un dossier étudiant

// Routes par statut
router.get('/statut/:statut', canViewPage('paiements'), getPaiementsByStatut);       // GET /api/paiements/statut/:statut - Paiements par statut

// Actions sur les paiements
router.patch('/:id/confirmer', canEditOnPage('paiements'), confirmerPaiement);         // PATCH /api/paiements/:id/confirmer - Confirmer un paiement
router.patch('/:id/annuler', canEditOnPage('paiements'), annulerPaiement);             // PATCH /api/paiements/:id/annuler - Annuler un paiement

// Routes pour les statistiques et rapports
router.get('/stats/chiffre-affaires', canViewPage('paiements'), getChiffreAffairesByPeriode);  // GET /api/paiements/stats/chiffre-affaires?dateDebut=&dateFin= - Chiffre d'affaires par période
router.get('/stats/mois/:annee', canViewPage('paiements'), getStatsByMois);          // GET /api/paiements/stats/mois/:annee - Statistiques par mois
router.get('/stats/en-attente', getPaiementsEnAttente);    // GET /api/paiements/stats/en-attente - Paiements en attente
router.get('/stats/impayes', getImpayesParClient);         // GET /api/paiements/stats/impayes - Impayés par client

module.exports = router;
