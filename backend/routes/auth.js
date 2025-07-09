const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Routes publiques (sans authentification)
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);

// Route pour créer le premier administrateur (publique, mais seulement si aucun admin n'existe)
router.post('/create-admin', AuthController.createAdmin);

// Routes protégées (avec authentification)
router.get('/me', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, AuthController.updateProfile);

// Route pour créer un utilisateur (sans authentification)
router.post('/register', AuthController.register);

module.exports = router;
