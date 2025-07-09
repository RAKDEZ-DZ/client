const User = require('../model/user');
const synchronizeUserPermissions = require('../services/permissionSyncService');

class UserController {
    // POST /api/users - Créer un nouvel utilisateur (admin seulement)
    static async createUser(req, res) {
        try {
            const { username, email, password, role, is_active, permissions } = req.body;
            
            console.log('Création utilisateur - données reçues:', {
                username,
                email,
                role,
                is_active,
                permissions: {
                    type: typeof permissions,
                    value: permissions,
                    isArray: Array.isArray(permissions)
                }
            });

            // Validation des champs requis
            const requiredFields = ['username', 'email', 'password'];
            const missingFields = requiredFields.filter(field => !req.body[field]);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Champs requis manquants',
                    missing_fields: missingFields
                });
            }

            // Validation du rôle
            if (role && !User.isValidRole(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Rôle invalide',
                    valid_roles: User.getRoles()
                });
            }

            // Vérifier si l'email ou le username existe déjà
            const existingEmail = await User.findByEmail(email);
            if (existingEmail) {
                return res.status(409).json({
                    success: false,
                    message: 'Un utilisateur avec cet email existe déjà'
                });
            }

            const existingUsername = await User.findByUsername(username);
            if (existingUsername) {
                return res.status(409).json({
                    success: false,
                    message: 'Un utilisateur avec ce nom d\'utilisateur existe déjà'
                });
            }

            // Créer l'utilisateur
            const userData = {
                username,
                email,
                password,
                role: role || User.ROLES.USER,
                permissions: permissions || [],
                is_active: is_active !== undefined ? is_active : true,
                created_by: req.user.userId // L'ID de l'administrateur qui crée l'utilisateur
            };

            const user = await User.create(userData);

            // Synchroniser les permissions avec le système de page_permissions
            try {
                await synchronizeUserPermissions(user.id);
                console.log(`Permissions synchronisées pour l'utilisateur ${user.id}`);
            } catch (syncError) {
                console.error('Erreur lors de la synchronisation des permissions:', syncError);
                // Ne pas échouer la création de l'utilisateur si la synchronisation échoue
            }

            res.status(201).json({
                success: true,
                message: 'Utilisateur créé avec succès',
                data: user.toJSON()
            });
        } catch (error) {
            console.error('Erreur création utilisateur:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la création de l\'utilisateur',
                error: error.message
            });
        }
    }

    // GET /api/users - Récupérer tous les utilisateurs (admin seulement)
    static async getAllUsers(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const users = await User.findAll(parseInt(limit), parseInt(offset));
            const total = await User.count();

            res.json({
                success: true,
                data: users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Erreur récupération utilisateurs:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des utilisateurs',
                error: error.message
            });
        }
    }

    // GET /api/users/:id - Récupérer un utilisateur par ID (admin seulement)
    static async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findById(id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            res.json({
                success: true,
                data: user.toJSON()
            });
        } catch (error) {
            console.error('Erreur récupération utilisateur:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de l\'utilisateur',
                error: error.message
            });
        }
    }

    // PUT /api/users/:id - Mettre à jour un utilisateur (admin seulement)
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            // Empêcher la modification du dernier admin
            if (user.role === User.ROLES.ADMIN && updateData.role !== User.ROLES.ADMIN) {
                const adminCount = await User.count();
                if (adminCount <= 1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Impossible de modifier le rôle du dernier administrateur'
                    });
                }
            }

            // Validation du rôle
            if (updateData.role && !User.isValidRole(updateData.role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Rôle invalide',
                    valid_roles: User.getRoles()
                });
            }

            // Validation des permissions
            if (updateData.permissions && Array.isArray(updateData.permissions)) {
                const invalidPermissions = updateData.permissions.filter(p => !User.isValidPermission(p));
                if (invalidPermissions.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Permissions invalides',
                        invalid_permissions: invalidPermissions,
                        valid_permissions: User.getPermissions()
                    });
                }
            }

            // Vérifier l'unicité de l'email et du username
            if (updateData.email && updateData.email !== user.email) {
                const existingEmail = await User.findByEmail(updateData.email);
                if (existingEmail && existingEmail.id !== parseInt(id)) {
                    return res.status(409).json({
                        success: false,
                        message: 'Cet email est déjà utilisé par un autre utilisateur'
                    });
                }
            }

            if (updateData.username && updateData.username !== user.username) {
                const existingUsername = await User.findByUsername(updateData.username);
                if (existingUsername && existingUsername.id !== parseInt(id)) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ce nom d\'utilisateur est déjà utilisé'
                    });
                }
            }

            const updatedUser = await user.update(updateData);

            // Synchroniser les permissions après la mise à jour si les permissions ont été modifiées
            if (updateData.permissions) {
                try {
                    await synchronizeUserPermissions(user.id);
                    console.log(`Permissions synchronisées pour l'utilisateur ${user.id} après mise à jour`);
                } catch (syncError) {
                    console.error('Erreur lors de la synchronisation des permissions après mise à jour:', syncError);
                    // Ne pas échouer la mise à jour de l'utilisateur si la synchronisation échoue
                }
            }

            res.json({
                success: true,
                message: 'Utilisateur mis à jour avec succès',
                data: updatedUser.toJSON()
            });
        } catch (error) {
            console.error('Erreur mise à jour utilisateur:', error);
            if (error.code === '23505') {
                res.status(409).json({
                    success: false,
                    message: 'Email ou nom d\'utilisateur déjà utilisé'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la mise à jour de l\'utilisateur',
                    error: error.message
                });
            }
        }
    }

    // DELETE /api/users/:id - Supprimer un utilisateur (admin seulement)
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            // Empêcher la suppression du dernier admin
            if (user.role === User.ROLES.ADMIN) {
                const adminCount = await User.count();
                if (adminCount <= 1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Impossible de supprimer le dernier administrateur'
                    });
                }
            }

            // Empêcher l'auto-suppression
            if (parseInt(id) === req.user.userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Impossible de supprimer votre propre compte'
                });
            }

            await user.delete();

            res.json({
                success: true,
                message: 'Utilisateur supprimé avec succès'
            });
        } catch (error) {
            console.error('Erreur suppression utilisateur:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression de l\'utilisateur',
                error: error.message
            });
        }
    }

    // PUT /api/users/:id/activate - Activer un utilisateur (admin seulement)
    static async activateUser(req, res) {
        try {
            const { id } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            await user.activate();

            res.json({
                success: true,
                message: 'Utilisateur activé avec succès',
                data: user.toJSON()
            });
        } catch (error) {
            console.error('Erreur activation utilisateur:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'activation de l\'utilisateur',
                error: error.message
            });
        }
    }

    // PUT /api/users/:id/deactivate - Désactiver un utilisateur (admin seulement)
    static async deactivateUser(req, res) {
        try {
            const { id } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            // Empêcher la désactivation du dernier admin
            if (user.role === User.ROLES.ADMIN) {
                const adminCount = await User.count();
                if (adminCount <= 1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Impossible de désactiver le dernier administrateur'
                    });
                }
            }

            // Empêcher l'auto-désactivation
            if (parseInt(id) === req.user.userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Impossible de désactiver votre propre compte'
                });
            }

            await user.deactivate();

            res.json({
                success: true,
                message: 'Utilisateur désactivé avec succès',
                data: user.toJSON()
            });
        } catch (error) {
            console.error('Erreur désactivation utilisateur:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la désactivation de l\'utilisateur',
                error: error.message
            });
        }
    }

    // GET /api/users/search - Rechercher des utilisateurs (admin seulement)
    static async searchUsers(req, res) {
        try {
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Terme de recherche requis'
                });
            }

            const users = await User.search(q);

            res.json({
                success: true,
                data: users,
                count: users.length
            });
        } catch (error) {
            console.error('Erreur recherche utilisateurs:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la recherche d\'utilisateurs',
                error: error.message
            });
        }
    }

    // GET /api/users/permissions - Obtenir la liste des permissions disponibles
    static async getPermissions(req, res) {
        try {
            res.json({
                success: true,
                data: {
                    permissions: User.getPermissions(),
                    roles: User.getRoles(),
                    permission_descriptions: {
                        [User.PERMISSIONS.FACTURES]: 'Gestion des factures',
                        [User.PERMISSIONS.CLIENTS]: 'Gestion des clients',
                        [User.PERMISSIONS.PAIEMENTS]: 'Gestion des paiements',
                        [User.PERMISSIONS.DOSSIERS_VOYAGE]: 'Gestion des dossiers de voyage',
                        [User.PERMISSIONS.USERS]: 'Gestion des utilisateurs'
                    }
                }
            });
        } catch (error) {
            console.error('Erreur récupération permissions:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des permissions',
                error: error.message
            });
        }
    }
}

module.exports = UserController;
