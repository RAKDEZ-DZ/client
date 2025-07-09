const UserPagePermission = require('../model/userPagePermission');
const User = require('../model/user');

// Middleware pour vérifier si l'utilisateur a accès à une page spécifique
const checkPagePermission = (pageName, permissionType = 'can_view') => {
    return async (req, res, next) => {
        try {
            // Vérifier si l'utilisateur est authentifié
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentification requise'
                });
            }

            // Les admins ont accès à tout
            if (req.user.role === 'admin') {
                return next();
            }

            // Vérifier la permission spécifique
            const hasPermission = await UserPagePermission.hasPermission(
                req.user.userId,
                pageName,
                permissionType
            );

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Accès refusé. Permission '${permissionType}' requise pour la page '${pageName}'`
                });
            }

            next();
        } catch (error) {
            console.error('Erreur lors de la vérification des permissions:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la vérification des permissions',
                error: error.message
            });
        }
    };
};

// Middleware pour vérifier l'accès en lecture à une page
const canViewPage = (pageName) => checkPagePermission(pageName, 'can_view');

// Middleware pour vérifier l'accès en création à une page
const canCreateOnPage = (pageName) => checkPagePermission(pageName, 'can_create');

// Middleware pour vérifier l'accès en modification à une page
const canEditOnPage = (pageName) => checkPagePermission(pageName, 'can_edit');

// Middleware pour vérifier l'accès en suppression à une page
const canDeleteOnPage = (pageName) => checkPagePermission(pageName, 'can_delete');

// Middleware pour vérifier l'accès en export à une page
const canExportFromPage = (pageName) => checkPagePermission(pageName, 'can_export');

// Middleware pour vérifier si l'utilisateur est admin
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Accès refusé. Droits d\'administrateur requis.'
        });
    }
    next();
};

// Middleware pour récupérer toutes les permissions d'un utilisateur et les ajouter au req
const loadUserPermissions = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return next();
        }

        // Charger les permissions de l'utilisateur
        const permissions = await UserPagePermission.findByUserId(req.user.userId);
        
        // Convertir en objet pour un accès facile
        req.userPermissions = {};
        permissions.forEach(perm => {
            req.userPermissions[perm.page_name] = {
                can_view: perm.can_view,
                can_create: perm.can_create,
                can_edit: perm.can_edit,
                can_delete: perm.can_delete,
                can_export: perm.can_export
            };
        });

        next();
    } catch (error) {
        console.error('Erreur lors du chargement des permissions:', error);
        next(); // Continuer même en cas d'erreur
    }
};

// Helper pour vérifier une permission depuis req.userPermissions
const hasPagePermission = (req, pageName, permissionType = 'can_view') => {
    if (req.user && req.user.role === 'admin') {
        return true;
    }
    
    return req.userPermissions && 
           req.userPermissions[pageName] && 
           req.userPermissions[pageName][permissionType];
};

module.exports = {
    checkPagePermission,
    canViewPage,
    canCreateOnPage,
    canEditOnPage,
    canDeleteOnPage,
    canExportFromPage,
    requireAdmin,
    loadUserPermissions,
    hasPagePermission
};
