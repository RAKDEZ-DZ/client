const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const clientRoutes = require('./clients');
const dossierVoyageRoutes = require('./dossiersVoyage');
const paiementRoutes = require('./paiements');
const factureRoutes = require('./factures');
const permissionRoutes = require('./permissions');
const documentRoutes = require('./documents'); // Ajouter cette ligne

const router = express.Router();

// Routes d'authentification (publiques)
router.use('/auth', authRoutes);

// Routes de gestion des permissions (admin seulement)
router.use('/permissions', permissionRoutes);

// Routes des utilisateurs (admin seulement)
router.use('/users', userRoutes);

// Routes API protégées
router.use('/clients', clientRoutes);
router.use('/dossiers-voyage', dossierVoyageRoutes);
router.use('/paiements', paiementRoutes);
router.use('/factures', factureRoutes);
router.use('/documents', documentRoutes); // Ajouter cette ligne

// Route de base de l'API
router.get('/', (req, res) => {
    res.json({
        message: 'API Oussama Travel',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            clients: '/api/clients',
            dossiersVoyage: '/api/dossiers-voyage',
            paiements: '/api/paiements',
            factures: '/api/factures',
            documents: '/api/documents' // Ajouter cette ligne
        }
    });
});

module.exports = router;
