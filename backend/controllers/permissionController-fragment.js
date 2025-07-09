/**
 * Script pour ajouter le contrôleur pour que les utilisateurs puissent voir leurs permissions
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');

// Ajouter cette méthode au PermissionController existant
module.exports = {
  // GET /api/permissions/my-permissions - Récupérer les permissions de l'utilisateur connecté
  getMyPermissions: async (req, res) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      const UserPagePermission = require('../model/userPagePermission');
      
      // Récupérer les permissions de l'utilisateur
      const permissions = await UserPagePermission.findByUserId(req.user.userId);
      
      res.json({
        success: true,
        message: 'Permissions récupérées avec succès',
        data: permissions
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des permissions',
        error: error.message
      });
    }
  }
};
