const User = require('../model/user');
const Page = require('../model/page');
const UserPagePermission = require('../model/userPagePermission');

class PermissionController {
    // GET /api/permissions/pages - Récupérer toutes les pages disponibles
    static async getAllPages(req, res) {
        try {
            const pages = await Page.findAll();
            
            res.json({
                success: true,
                data: pages.map(page => page.toJSON())
            });
        } catch (error) {
            console.error('Erreur récupération pages:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des pages',
                error: error.message
            });
        }
    }

    // GET /api/permissions/user/:userId - Récupérer les permissions d'un utilisateur
    static async getUserPermissions(req, res) {
        try {
            const { userId } = req.params;

            // Vérifier que l'utilisateur existe
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            const permissions = await UserPagePermission.findByUserId(userId);
            
            res.json({
                success: true,
                data: {
                    user: user.toJSON(),
                    permissions: permissions.map(perm => perm.toJSON())
                }
            });
        } catch (error) {
            console.error('Erreur récupération permissions utilisateur:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des permissions',
                error: error.message
            });
        }
    }

    // POST /api/permissions/user/:userId - Définir les permissions d'un utilisateur
    static async setUserPermissions(req, res) {
        try {
            const { userId } = req.params;
            const { permissions } = req.body;

            // Vérifier que l'utilisateur existe
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            // Valider le format des permissions
            if (!Array.isArray(permissions)) {
                return res.status(400).json({
                    success: false,
                    message: 'Les permissions doivent être un tableau'
                });
            }

            // Valider chaque permission
            for (const perm of permissions) {
                if (!perm.page_id || typeof perm.page_id !== 'number') {
                    return res.status(400).json({
                        success: false,
                        message: 'Chaque permission doit avoir un page_id valide'
                    });
                }

                // Vérifier que la page existe
                const page = await Page.findById(perm.page_id);
                if (!page) {
                    return res.status(400).json({
                        success: false,
                        message: `Page avec l'ID ${perm.page_id} non trouvée`
                    });
                }
            }

            // Définir les permissions
            const updatedPermissions = await UserPagePermission.setUserPermissions(userId, permissions);
            
            res.json({
                success: true,
                message: 'Permissions mises à jour avec succès',
                data: {
                    user: user.toJSON(),
                    permissions: updatedPermissions.map(perm => perm.toJSON())
                }
            });
        } catch (error) {
            console.error('Erreur mise à jour permissions:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour des permissions',
                error: error.message
            });
        }
    }

    // GET /api/permissions/overview - Vue d'ensemble de tous les utilisateurs et leurs permissions
    static async getPermissionsOverview(req, res) {
        try {
            const overview = await UserPagePermission.findAllWithUsers();
            
            res.json({
                success: true,
                data: overview
            });
        } catch (error) {
            console.error('Erreur vue d\'ensemble permissions:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de la vue d\'ensemble',
                error: error.message
            });
        }
    }

    // GET /api/permissions/my-permissions - Récupérer les permissions de l'utilisateur connecté
    static async getMyPermissions(req, res) {
        try {
            const userId = req.user.userId;
            console.log(`Récupération des permissions pour l'utilisateur ${userId} avec le rôle ${req.user.role}`);
            
            // Si c'est un admin, retourner toutes les permissions
            if (req.user.role === 'admin') {
                console.log('Admin détecté - attribution de toutes les permissions');
                // Récupérer toutes les pages actives
                const pages = await Page.findAll();
                
                // Créer un objet de permissions avec accès complet
                const permissionsMap = {};
                pages.forEach(page => {
                    permissionsMap[page.name] = {
                        can_view: true,
                        can_create: true,
                        can_edit: true,
                        can_delete: true,
                        can_export: true
                    };
                });
                
                return res.json({
                    success: true,
                    data: {
                        user_id: userId,
                        role: 'admin',
                        permissions: permissionsMap
                    }
                });
            }
            
            // Pour les utilisateurs normaux, récupérer leurs permissions spécifiques
            const permissions = await UserPagePermission.findByUserId(userId);
            console.log(`${permissions.length} permissions trouvées pour l'utilisateur`);
            
            // Formater pour le frontend
            const permissionsMap = {};
            permissions.forEach(perm => {
                permissionsMap[perm.page_name] = {
                    can_view: perm.can_view,
                    can_create: perm.can_create,
                    can_edit: perm.can_edit,
                    can_delete: perm.can_delete,
                    can_export: perm.can_export
                };
                
                console.log(`Page ${perm.page_name}: view=${perm.can_view}, create=${perm.can_create}, edit=${perm.can_edit}, delete=${perm.can_delete}`);
            });
            
            const responseData = {
                user_id: userId,
                role: req.user.role || 'user',
                permissions: permissionsMap
            };
            
            console.log(`Envoi des permissions au frontend:`, responseData);
            
            res.json({
                success: true,
                data: responseData
            });
        } catch (error) {
            console.error('Erreur récupération mes permissions:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de vos permissions',
                error: error.message
            });
        }
    }

    // DELETE /api/permissions/user/:userId - Supprimer toutes les permissions d'un utilisateur
    static async removeUserPermissions(req, res) {
        try {
            const { userId } = req.params;

            // Vérifier que l'utilisateur existe
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            await UserPagePermission.removeAllUserPermissions(userId);
            
            res.json({
                success: true,
                message: 'Toutes les permissions de l\'utilisateur ont été supprimées'
            });
        } catch (error) {
            console.error('Erreur suppression permissions:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression des permissions',
                error: error.message
            });
        }
    }

    // POST /api/permissions/pages - Créer une nouvelle page (admin seulement)
    static async createPage(req, res) {
        try {
            const { name, display_name, description, route_pattern } = req.body;

            // Validation
            if (!name || !display_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom et le nom d\'affichage sont requis'
                });
            }

            const page = await Page.create({
                name,
                display_name,
                description,
                route_pattern
            });
            
            res.status(201).json({
                success: true,
                message: 'Page créée avec succès',
                data: page.toJSON()
            });
        } catch (error) {
            console.error('Erreur création page:', error);
            if (error.code === '23505') { // Contrainte unique violée
                res.status(409).json({
                    success: false,
                    message: 'Une page avec ce nom existe déjà'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création de la page',
                    error: error.message
                });
            }
        }
    }

    // POST /api/permissions - Définir une permission individuelle pour un utilisateur et une page
    static async setPagePermission(req, res) {
        try {
            const { userId, pageName, canView, canCreate, canEdit, canDelete, canExport } = req.body;

            // Validation des champs requis
            if (!userId || !pageName) {
                return res.status(400).json({
                    success: false,
                    message: 'userId et pageName sont requis'
                });
            }

            // Vérifier que l'utilisateur existe
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            // Vérifier que la page existe
            const page = await Page.findByName(pageName);
            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'Page non trouvée'
                });
            }

            // Créer ou mettre à jour la permission
            const permission = await UserPagePermission.setPagePermission(
                userId,
                page.id,
                {
                    can_view: canView !== undefined ? canView : true,
                    can_create: canCreate !== undefined ? canCreate : false,
                    can_edit: canEdit !== undefined ? canEdit : false,
                    can_delete: canDelete !== undefined ? canDelete : false,
                    can_export: canExport !== undefined ? canExport : false
                }
            );

            res.json({
                success: true,
                message: 'Permission mise à jour avec succès',
                data: permission.toJSON()
            });
        } catch (error) {
            console.error('Erreur définition permission individuelle:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la définition de la permission',
                error: error.message
            });
        }
    }

    // GET /api/permissions/debug/:userId - Récupérer les permissions formatées d'un utilisateur (pour débogage)
    static async debugUserPermissions(req, res) {
        try {
            const { userId } = req.params;

            // Vérifier que l'utilisateur existe
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            // Récupérer les permissions de base de l'utilisateur
            const userPermissionsArray = user.permissions || [];
            
            // Récupérer les permissions détaillées de la table user_page_permissions
            const permissions = await UserPagePermission.findByUserId(userId);
            
            // Formater pour le frontend (comme dans getMyPermissions)
            const permissionsMap = {};
            permissions.forEach(perm => {
                permissionsMap[perm.page_name] = {
                    can_view: perm.can_view,
                    can_create: perm.can_create,
                    can_edit: perm.can_edit,
                    can_delete: perm.can_delete,
                    can_export: perm.can_export
                };
            });
            
            const responseData = {
                user_id: parseInt(userId),
                username: user.username,
                email: user.email,
                role: user.role || 'user',
                rawPermissionsArray: userPermissionsArray,
                detailedPermissions: permissions.map(p => p.toJSON()),
                formattedPermissions: permissionsMap
            };
            
            res.json({
                success: true,
                data: responseData
            });
        } catch (error) {
            console.error('Erreur debug permissions:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors du débogage des permissions',
                error: error.message
            });
        }
    }
}

module.exports = PermissionController;
