const express = require('express');
const PermissionController = require('../controllers/permissionController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/pagePermissions');

const router = express.Router();

// Routes protégées (avec authentification)
router.use(authenticateToken);

// Routes pour les permissions (admin seulement)
router.get('/pages', requireAdmin, PermissionController.getAllPages);
router.post('/pages', requireAdmin, PermissionController.createPage);
router.get('/overview', requireAdmin, PermissionController.getPermissionsOverview);
router.get('/user/:userId', requireAdmin, PermissionController.getUserPermissions);
router.post('/user/:userId', requireAdmin, PermissionController.setUserPermissions);
router.delete('/user/:userId', requireAdmin, PermissionController.removeUserPermissions);
router.get('/debug/:userId', requireAdmin, PermissionController.debugUserPermissions);

// Route simplifiée pour définir une permission individuelle
router.post('/', requireAdmin, PermissionController.setPagePermission);

// Route pour que l'utilisateur consulte ses propres permissions
router.get('/my-permissions', PermissionController.getMyPermissions);

module.exports = router;
