const express = require('express');
const path = require('path');
require('dotenv').config();

// Importer la configuration de la base de données
const db = require('./config/database');
const MigrationManager = require('./config/migrations');

// Importer les routes
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour parser JSON
app.use(express.json());

// Servir les fichiers statiques (pour l'interface web)
app.use(express.static(path.join(__dirname, 'public')));

// Servir les fichiers du dossier uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware CORS pour Postman
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Initialiser les migrations au démarrage
async function initializeDatabase() {
    try {
        const migrationManager = new MigrationManager();
        await migrationManager.runMigrations();
        console.log('🎉 Base de données initialisée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
        process.exit(1);
    }
}

// Routes API
app.use('/api', apiRoutes);

// Route de base
app.get('/', (req, res) => {
    // Récupérer l'adresse IP pour l'afficher dans la documentation
    const serverIP = process.env.SERVER_IP || '192.168.0.47';
    const serverPort = PORT;

    res.json({
        message: 'Bienvenue sur l\'API Oussama Travel',
        status: 'Serveur en marche!',
        database: 'PostgreSQL connecté',
        apiBaseUrl: `http://${serverIP}:${serverPort}/api`,
        frontendUrl: `http://${serverIP}:5173`,
        documentation: `http://${serverIP}:${serverPort}/api`,
        endpoints: {
            'Test DB': 'GET /test-db',
            'API Base': 'GET /api',
            'Auth': {
                'Login': 'POST /api/auth/login',
                'Refresh': 'POST /api/auth/refresh',
                'Verify': 'POST /api/auth/verify'
            },
            'Users': {
                'Liste': 'GET /api/users',
                'Détail': 'GET /api/users/:id',
                'Créer': 'POST /api/users',
                'Modifier': 'PUT /api/users/:id',
                'Supprimer': 'DELETE /api/users/:id',
                'Permissions': 'GET /api/users/permissions'
            },
            'Clients': {
                'Liste': 'GET /api/clients',
                'Détail': 'GET /api/clients/:id',
                'Créer': 'POST /api/clients',
                'Modifier': 'PUT /api/clients/:id',
                'Supprimer': 'DELETE /api/clients/:id',
                'Recherche': 'GET /api/clients/search?q=terme',
                'Par email': 'GET /api/clients/email/:email'
            },
            'Factures': {
                'Liste': 'GET /api/factures',
                'Détail': 'GET /api/factures/:id',
                'Créer': 'POST /api/factures',
                'Modifier': 'PUT /api/factures/:id',
                'Supprimer': 'DELETE /api/factures/:id'
            },
            'Paiements': {
                'Liste': 'GET /api/paiements',
                'Détail': 'GET /api/paiements/:id',
                'Créer': 'POST /api/paiements',
                'Modifier': 'PUT /api/paiements/:id',
                'Supprimer': 'DELETE /api/paiements/:id'
            },
            'Dossiers Voyage': {
                'Liste': 'GET /api/dossiers-voyage',
                'Détail': 'GET /api/dossiers-voyage/:id',
                'Créer': 'POST /api/dossiers-voyage',
                'Modifier': 'PUT /api/dossiers-voyage/:id',
                'Supprimer': 'DELETE /api/dossiers-voyage/:id'
            },
            'Permissions': {
                'Pages': 'GET /api/permissions/pages',
                'User': 'GET /api/permissions/user/:userId',
                'My Permissions': 'GET /api/permissions/my-permissions'
            }
        }
    });
});

// Route de test de la base de données
app.get('/test-db', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW() as current_time, COUNT(*) as nb_clients FROM clients');
        res.json({
            message: 'Connexion PostgreSQL réussie',
            timestamp: result.rows[0].current_time,
            nombre_clients: result.rows[0].nb_clients
        });
    } catch (error) {
        res.status(500).json({
            error: 'Erreur de connexion à la base de données',
            details: error.message
        });
    }
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
    console.error('❌ Erreur:', err);
    res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur s\'est produite'
    });
});

// Route 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvée',
        available_endpoints: 'Visitez GET / pour voir les endpoints disponibles'
    });
});

// Démarrer le serveur
async function startServer() {
    try {
        // Initialiser la base de données d'abord
        await initializeDatabase();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Serveur démarré sur le port ${PORT}`);
            console.log(`📱 Visitez: http://192.168.0.47:${PORT}`);
            console.log(`🔍 Test DB: http://192.168.0.47:${PORT}/test-db`);
            console.log(`📋 API Clients: http://192.168.0.47:${PORT}/api/clients`);
            console.log(`📖 Documentation: http://192.168.0.47:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
}

startServer();
