const express = require('express');
const UserController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { canViewPage, canCreateOnPage, canEditOnPage, canDeleteOnPage, requireAdmin } = require('../middleware/pagePermissions');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes avec permissions par page (users)
router.post('/', canCreateOnPage('users'), UserController.createUser); // Ajout de cette route pour créer un utilisateur
router.get('/', canViewPage('users'), UserController.getAllUsers);
router.get('/search', canViewPage('users'), UserController.searchUsers);
router.get('/permissions', canViewPage('users'), UserController.getPermissions);
router.get('/:id', canViewPage('users'), UserController.getUserById);
router.put('/:id', canEditOnPage('users'), UserController.updateUser);
router.delete('/:id', canDeleteOnPage('users'), UserController.deleteUser);
router.put('/:id/activate', canEditOnPage('users'), UserController.activateUser);
router.put('/:id/deactivate', canEditOnPage('users'), UserController.deactivateUser);

module.exports = router;
