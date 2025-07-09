// Ce fichier doit être intégré à votre backend pour synchroniser
// les permissions des utilisateurs avec le système de pages.

const User = require('../model/user');
const Page = require('../model/page');
const UserPagePermission = require('../model/userPagePermission');

/**
 * Synchronise les permissions d'un utilisateur avec le système de page_permissions
 * @param {number} userId - L'ID de l'utilisateur
 */
const synchronizeUserPermissions = async (userId) => {
  try {
    // 1. Récupérer l'utilisateur et ses permissions
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`Utilisateur avec ID ${userId} non trouvé`);
    }

    // 2. Récupérer toutes les pages actives
    const pages = await Page.getAllActive();
    if (!pages || pages.length === 0) {
      console.warn('Aucune page active trouvée dans le système');
      return;
    }

    // 3. Préparer les données de permissions pour chaque page
    const permissionsToSync = [];

    // Vérifier que les permissions sont un tableau
    if (!Array.isArray(user.permissions)) {
      console.error(`Erreur: les permissions de l'utilisateur ${userId} ne sont pas un tableau:`, {
        type: typeof user.permissions,
        value: user.permissions
      });
      
      // Tenter de réparer les permissions si possible
      try {
        if (typeof user.permissions === 'string') {
          user.permissions = JSON.parse(user.permissions);
        } else if (user.permissions && typeof user.permissions === 'object') {
          user.permissions = Object.keys(user.permissions);
        }
      } catch (e) {
        console.error('Impossible de réparer les permissions:', e);
        user.permissions = [];
      }
    }
    
    console.log(`Permissions de l'utilisateur ${userId} pour synchronisation:`, user.permissions);

    // Pour chaque page, vérifier si l'utilisateur a la permission correspondante
    for (const page of pages) {
      // Si c'est un admin, il a toutes les permissions
      const hasPermission = user.role === 'admin' || 
                            (Array.isArray(user.permissions) && user.permissions.includes(page.name));
      
      if (hasPermission || user.role === 'admin') {
        permissionsToSync.push({
          page_id: page.id,
          can_view: true,
          can_create: user.role === 'admin', // Les admins ont toutes les permissions
          can_edit: user.role === 'admin',
          can_delete: user.role === 'admin',
          can_export: user.role === 'admin'
        });
      }
    }

    // 4. Supprimer toutes les permissions existantes et ajouter les nouvelles
    await UserPagePermission.setUserPermissions(userId, permissionsToSync);
    
    console.log(`Permissions synchronisées pour l'utilisateur ${userId}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de la synchronisation des permissions:', error);
    throw error;
  }
};

module.exports = synchronizeUserPermissions;
