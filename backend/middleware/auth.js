const jwt = require('jsonwebtoken');
const User = require('../model/user');

// Middleware d'authentification JWT
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token d\'accès requis'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt_tres_securise');
        
        // Vérifier que l'utilisateur existe toujours et est actif
        const user = await User.findById(decoded.userId);
        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Token invalide ou utilisateur inactif'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expiré'
            });
        }
        
        return res.status(403).json({
            success: false,
            message: 'Token invalide'
        });
    }
};

// Middleware pour vérifier si l'utilisateur est admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Accès admin requis'
        });
    }
    next();
};

// Middleware pour vérifier les permissions spécifiques
const requirePermission = (permission) => {
    return (req, res, next) => {
        // Les admins ont toutes les permissions
        if (req.user.role === 'admin') {
            return next();
        }

        // Vérifier si l'utilisateur a la permission requise
        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                message: `Permission '${permission}' requise`,
                user_permissions: req.user.permissions
            });
        }

        next();
    };
};

// Middleware pour vérifier plusieurs permissions (l'utilisateur doit avoir au moins une des permissions)
const requireAnyPermission = (permissions) => {
    return (req, res, next) => {
        // Les admins ont toutes les permissions
        if (req.user.role === 'admin') {
            return next();
        }

        // Vérifier si l'utilisateur a au moins une des permissions requises
        const hasPermission = permissions.some(permission => 
            req.user.permissions && req.user.permissions.includes(permission)
        );

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: `Une des permissions suivantes est requise: ${permissions.join(', ')}`,
                user_permissions: req.user.permissions
            });
        }

        next();
    };
};

// Middleware pour vérifier toutes les permissions (l'utilisateur doit avoir toutes les permissions)
const requireAllPermissions = (permissions) => {
    return (req, res, next) => {
        // Les admins ont toutes les permissions
        if (req.user.role === 'admin') {
            return next();
        }

        // Vérifier si l'utilisateur a toutes les permissions requises
        const hasAllPermissions = permissions.every(permission => 
            req.user.permissions && req.user.permissions.includes(permission)
        );

        if (!hasAllPermissions) {
            const missingPermissions = permissions.filter(permission =>
                !req.user.permissions || !req.user.permissions.includes(permission)
            );

            return res.status(403).json({
                success: false,
                message: `Permissions manquantes: ${missingPermissions.join(', ')}`,
                user_permissions: req.user.permissions
            });
        }

        next();
    };
};

// Middleware pour permettre l'accès au propriétaire ou à l'admin
const requireOwnerOrAdmin = (userIdParam = 'id') => {
    return (req, res, next) => {
        const resourceUserId = parseInt(req.params[userIdParam]);
        
        // Vérifier si c'est l'admin ou le propriétaire
        if (req.user.role === 'admin' || req.user.userId === resourceUserId) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Accès refusé: vous ne pouvez accéder qu\'à vos propres ressources'
        });
    };
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    requireOwnerOrAdmin
};
