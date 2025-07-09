const express = require('express');
const FactureController = require('../controllers/factureController');
const { authenticateToken } = require('../middleware/auth');
const { canViewPage, canCreateOnPage, canEditOnPage, canDeleteOnPage } = require('../middleware/pagePermissions');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes pour les factures avec permissions par page

// Créer une nouvelle facture
router.post('/', canCreateOnPage('factures'), FactureController.create);

// Créer une facturation récurrente
router.post('/recurrente', canCreateOnPage('factures'), FactureController.creerFacturationRecurrente);

// Récupérer toutes les factures avec filtres et pagination
router.get('/', canViewPage('factures'), FactureController.getAll);

// Rechercher des factures
router.get('/search', canViewPage('factures'), FactureController.search);

// Obtenir les statistiques des factures
router.get('/statistics', canViewPage('factures'), FactureController.getStatistics);

// Obtenir les factures échues ou proches de l'échéance
router.get('/echues', canViewPage('factures'), FactureController.getFacturesEchues);

// Générer un rapport de facturation
router.get('/rapport', canViewPage('factures'), FactureController.genererRapport);

// Obtenir un template de facture par type
router.get('/template/:type', canViewPage('factures'), FactureController.getTemplate);

// Récupérer une facture par ID
router.get('/:id', canViewPage('factures'), FactureController.getById);

// Récupérer une facture par numéro
router.get('/numero/:numero', canViewPage('factures'), FactureController.getByNumero);

// Récupérer les factures d'un client
router.get('/client/:clientId', canViewPage('factures'), FactureController.getByClient);

// Mettre à jour une facture
router.put('/:id', canEditOnPage('factures'), FactureController.update);

// Changer le statut d'une facture
router.patch('/:id/statut', canEditOnPage('factures'), FactureController.changeStatut);

// Enregistrer un paiement pour une facture
router.post('/:id/paiement', canCreateOnPage('factures'), FactureController.enregistrerPaiement);

// Générer une facture d'acompte
router.post('/:id/acompte', canCreateOnPage('factures'), FactureController.genererAcompte);

// Dupliquer une facture
router.post('/:id/duplicate', canCreateOnPage('factures'), FactureController.duplicate);

// Supprimer une facture
router.delete('/:id', canDeleteOnPage('factures'), FactureController.delete);

// Mettre à jour automatiquement le statut de toutes les factures selon les paiements
router.put('/statuts/update-all', canEditOnPage('factures'), FactureController.updateAllStatuts);

module.exports = router;
