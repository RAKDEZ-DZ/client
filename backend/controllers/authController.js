const User = require('../model/user');
const jwt = require('jsonwebtoken');
const synchronizeUserPermissions = require('../services/permissionSyncService');

class AuthController {
    // POST /api/auth/login - Connexion utilisateur
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validation des champs requis
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email et mot de passe requis'
                });
            }

            // Trouver l'utilisateur par email
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Email ou mot de passe incorrect'
                });
            }

            // Vérifier si l'utilisateur est actif
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Compte désactivé'
                });
            }

            // Vérifier le mot de passe
            const isValidPassword = await user.verifyPassword(password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Email ou mot de passe incorrect'
                });
            }

            // Mettre à jour la dernière connexion
            await user.updateLastLogin();
            
            // Synchroniser les permissions à la connexion pour s'assurer qu'elles sont à jour
            try {
                await synchronizeUserPermissions(user.id);
                console.log(`Permissions synchronisées lors de la connexion pour l'utilisateur ${user.id}`);
            } catch (syncError) {
                console.error('Erreur lors de la synchronisation des permissions à la connexion:', syncError);
                // Ne pas bloquer la connexion si la synchronisation échoue
            }

            // Générer le token JWT avec une durée de vie très longue (10 ans)
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions
                },
                process.env.JWT_SECRET || 'votre_secret_jwt_tres_securise',
                { expiresIn: '10y' } // 10 ans au lieu de 24h
            );

            res.json({
                success: true,
                message: 'Connexion réussie',
                data: {
                    user: user.toJSON(),
                    token
                }
            });
        } catch (error) {
            console.error('Erreur connexion:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la connexion',
                error: error.message
            });
        }
    }

    // POST /api/auth/register - Créer un nouvel utilisateur (admin seulement)
    static async register(req, res) {
        try {
            const { username, email, password, role, permissions } = req.body;

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

            // Validation des permissions
            if (permissions && Array.isArray(permissions)) {
                const invalidPermissions = permissions.filter(p => !User.isValidPermission(p));
                if (invalidPermissions.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Permissions invalides',
                        invalid_permissions: invalidPermissions,
                        valid_permissions: User.getPermissions()
                    });
                }
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
                role: role || 'user',
                permissions: permissions || []
            };

            const user = await User.create(userData);

            res.status(201).json({
                success: true,
                message: 'Utilisateur créé avec succès',
                data: user.toJSON()
            });
        } catch (error) {
            console.error('Erreur création utilisateur:', error);
            if (error.code === '23505') { // Contrainte unique violée
                res.status(409).json({
                    success: false,
                    message: 'Email ou nom d\'utilisateur déjà utilisé'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création de l\'utilisateur',
                    error: error.message
                });
            }
        }
    }

    // GET /api/auth/me - Obtenir les informations de l'utilisateur connecté
    static async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.userId);
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
            console.error('Erreur récupération profil:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération du profil',
                error: error.message
            });
        }
    }

    // PUT /api/auth/profile - Mettre à jour le profil de l'utilisateur connecté
    static async updateProfile(req, res) {
        try {
            const { username, email, current_password, new_password } = req.body;

            const user = await User.findById(req.user.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            const updateData = {};

            // Mettre à jour l'username si fourni
            if (username && username !== user.username) {
                const existingUsername = await User.findByUsername(username);
                if (existingUsername && existingUsername.id !== user.id) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ce nom d\'utilisateur est déjà utilisé'
                    });
                }
                updateData.username = username;
            }

            // Mettre à jour l'email si fourni
            if (email && email !== user.email) {
                const existingEmail = await User.findByEmail(email);
                if (existingEmail && existingEmail.id !== user.id) {
                    return res.status(409).json({
                        success: false,
                        message: 'Cet email est déjà utilisé'
                    });
                }
                updateData.email = email;
            }

            // Changer le mot de passe si demandé
            if (new_password) {
                if (!current_password) {
                    return res.status(400).json({
                        success: false,
                        message: 'Mot de passe actuel requis pour changer le mot de passe'
                    });
                }

                const isValidCurrentPassword = await user.verifyPassword(current_password);
                if (!isValidCurrentPassword) {
                    return res.status(401).json({
                        success: false,
                        message: 'Mot de passe actuel incorrect'
                    });
                }

                updateData.password = new_password;
            }

            // Effectuer la mise à jour
            await user.update(updateData);

            res.json({
                success: true,
                message: 'Profil mis à jour avec succès',
                data: user.toJSON()
            });
        } catch (error) {
            console.error('Erreur mise à jour profil:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour du profil',
                error: error.message
            });
        }
    }

    // POST /api/auth/logout - Déconnexion (pour invalidation côté client)
    static async logout(req, res) {
        res.json({
            success: true,
            message: 'Déconnexion réussie'
        });
    }

    // POST /api/auth/create-admin - Créer le premier administrateur (route publique temporaire)
    static async createAdmin(req, res) {
        try {
            // Vérifier s'il existe déjà un admin
            const existingAdmin = await User.findByRole('admin');
            if (existingAdmin && existingAdmin.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Un administrateur existe déjà. Utilisez la route /auth/register pour créer d\'autres utilisateurs.'
                });
            }

            const { username, email, password } = req.body;

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

            // Validation de la longueur du mot de passe
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Le mot de passe doit contenir au moins 6 caractères'
                });
            }

            // Validation de l'email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Format d\'email invalide'
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

            // Créer l'administrateur
            const userData = {
                username,
                email,
                password,
                role: 'admin',
                permissions: ['read', 'write', 'admin'],
                is_active: true
            };

            const user = await User.create(userData);

            // Générer le token JWT pour connexion automatique avec une durée de vie très longue
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions
                },
                process.env.JWT_SECRET || 'votre_secret_jwt_tres_securise',
                { expiresIn: '10y' } // 10 ans au lieu de 24h
            );

            res.status(201).json({
                success: true,
                message: 'Administrateur créé avec succès',
                data: {
                    user: user.toJSON(),
                    token
                }
            });
        } catch (error) {
            console.error('Erreur création administrateur:', error);
            if (error.code === '23505') { // Contrainte unique violée
                res.status(409).json({
                    success: false,
                    message: 'Email ou nom d\'utilisateur déjà utilisé'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création de l\'administrateur',
                    error: error.message
                });
            }
        }
    }
}

module.exports = AuthController;
