const express = require('express');
const ClientController = require('../controllers/clientController');
const { authenticateToken } = require('../middleware/auth');
const { canViewPage, canCreateOnPage, canEditOnPage, canDeleteOnPage } = require('../middleware/pagePermissions');
const { handleUpload, handleMultipleUpload, handleMultipleClientUpload } = require('../middleware/upload');

const router = express.Router();

// Appliquer l'authentification à toutes les routes
router.use(authenticateToken);

// Routes de recherche (doivent être avant les routes avec paramètres)
router.get('/search', canViewPage('clients'), ClientController.searchClients);        // GET /api/clients/search?q=terme

// Routes avec vérification des permissions par page
router.get('/', canViewPage('clients'), ClientController.getAllClients);
router.get('/:id', canViewPage('clients'), ClientController.getClientById);
router.post('/', canCreateOnPage('clients'), handleMultipleClientUpload, ClientController.createClient);
router.put('/:id', canEditOnPage('clients'), handleMultipleClientUpload, ClientController.updateClient);
router.delete('/:id', canDeleteOnPage('clients'), ClientController.deleteClient);

// Route pour les états de dossier
router.get('/etats-dossier', canViewPage('clients'), ClientController.getEtatsDossier); // GET /api/clients/etats-dossier

// Route pour les statuts étudiants
router.get('/statuts-etudiant', canViewPage('clients'), ClientController.getStatutsEtudiant); // GET /api/clients/statuts-etudiant

// Route pour les statuts de payement
router.get('/statuts-payement', canViewPage('clients'), ClientController.getStatutsPayement); // GET /api/clients/statuts-payement

// Routes pour les statistiques
router.get('/stats/visa', canViewPage('clients'), ClientController.getStatsVisa);     // GET /api/clients/stats/visa
router.get('/stats/etat', canViewPage('clients'), ClientController.getStatsEtat);     // GET /api/clients/stats/etat
router.get('/stats/statuts-etudiant', canViewPage('clients'), ClientController.getStatsStatutsEtudiant); // GET /api/clients/stats/statuts-etudiant
router.get('/stats/payements', canViewPage('clients'), ClientController.getStatsPayements); // GET /api/clients/stats/payements

// Routes pour les documents
router.get('/documents/avec', canViewPage('clients'), ClientController.getClientsAvecDocuments);   // GET /api/clients/documents/avec
router.get('/documents/sans', canViewPage('clients'), ClientController.getClientsSansDocuments);   // GET /api/clients/documents/sans

// Routes par critères
router.get('/visa/:type', canViewPage('clients'), ClientController.getClientsByTypeVisa);          // GET /api/clients/visa/:type
router.get('/etat/:etat', canViewPage('clients'), ClientController.getClientsByEtatDossier);       // GET /api/clients/etat/:etat
router.get('/statut/:statut', canViewPage('clients'), ClientController.getClientsByStatutEtudiant); // GET /api/clients/statut/:statut
router.get('/payement/:statut', canViewPage('clients'), ClientController.getClientsByStatutPayement); // GET /api/clients/payement/:statut
router.get('/email/:email', canViewPage('clients'), ClientController.getClientByEmail);            // GET /api/clients/email/:email

// Les routes suivantes sont déjà définies plus haut avec les permissions appropriées
// router.get('/:id', canViewPage('clients'), ClientController.getClientById);           // GET /api/clients/:id
// router.put('/:id', canEditOnPage('clients'), ClientController.updateClient);            // PUT /api/clients/:id
// router.delete('/:id', canDeleteOnPage('clients'), ClientController.deleteClient);         // DELETE /api/clients/:id

// Routes spécifiques pour mettre à jour des champs particuliers
router.put('/:id/etat', canEditOnPage('clients'), ClientController.updateEtatDossier);              // PUT /api/clients/:id/etat
router.put('/:id/statut-etudiant', canEditOnPage('clients'), ClientController.updateStatutEtudiant); // PUT /api/clients/:id/statut-etudiant
router.put('/:id/statut-payement', canEditOnPage('clients'), ClientController.updateStatutPayement); // PUT /api/clients/:id/statut-payement
router.put('/:id/dossier-etudiant', canEditOnPage('clients'), ClientController.updateDossierEtudiant); // PUT /api/clients/:id/dossier-etudiant
router.put('/:id/document', canEditOnPage('clients'), ClientController.updateDocumentPdf);          // PUT /api/clients/:id/document

// Routes pour l'upload de documents
router.post('/:id/upload-document', canEditOnPage('clients'), handleUpload, ClientController.uploadDocumentPdf); // POST /api/clients/:id/upload-document (un seul fichier avec "document_pdf")
router.post('/:id/upload-multiple-documents', canEditOnPage('clients'), handleMultipleClientUpload, ClientController.uploadMultipleDocuments); // POST /api/clients/:id/upload-multiple-documents (plusieurs fichiers avec "documents")
router.post('/:id/upload-documents', canEditOnPage('clients'), handleMultipleUpload, ClientController.uploadMultipleDocuments); // POST /api/clients/:id/upload-documents (plusieurs fichiers pour dossiers étudiants)

// Routes pour la gestion des documents d'un client
router.get('/:id/documents', canViewPage('clients'), ClientController.getClientDocuments); // GET /api/clients/:id/documents
router.get('/:id/documents/:documentId/download', canViewPage('clients'), ClientController.downloadDocument); // GET /api/clients/:id/documents/:documentId/download

module.exports = router;
