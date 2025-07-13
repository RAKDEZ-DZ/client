/**
 * Hook de gestion des permissions pour les composants React
 */
import { useEffect, useState } from 'react';

// Interface pour la structure des permissions
interface PermissionsMap {
  [page_name: string]: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_export: boolean;
  };
}

interface UserPermissions {
  user_id: number;
  role: string;
  permissions: PermissionsMap;
}

export interface UserRole {
  role: 'admin' | 'user';
}

/**
 * Hook pour vérifier si l'utilisateur a accès à une page spécifique
 * @returns Object avec des méthodes pour vérifier les permissions
 */
export function usePermissions() {
  const [permissionsMap, setPermissionsMap] = useState<PermissionsMap>({});
  const [role, setRole] = useState<string>('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Charger les permissions depuis le localStorage
    const loadPermissions = () => {
      try {
        const permissionsStr = localStorage.getItem('userPermissions');
        
        if (permissionsStr) {
          try {
            const userPerms = JSON.parse(permissionsStr) as UserPermissions;
            
            if (userPerms && userPerms.permissions) {
              setPermissionsMap(userPerms.permissions);
              setRole(userPerms.role || '');
            } else {
              console.warn('Format de permissions invalide ou manquant:', userPerms);
            }
          } catch (parseError) {
            console.error('Erreur de parsing JSON des permissions:', parseError);
          }
        } else {
          console.warn('Aucune permission trouvée dans localStorage');
        }

        // Charger le role depuis user si nécessaire
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);            
            if (!role && user?.role) {
              setRole(user.role);            }
          } catch (parseError) {
            console.error('Erreur de parsing JSON user:', parseError);
          }
        } else {
          console.warn('Aucune info utilisateur trouvée dans localStorage');
        }
      } catch (error) {
        console.error('Erreur lors du chargement des permissions:', error);
      } finally {
        setLoaded(true);
      }
    };

    loadPermissions();
  }, []);

  // Vérifier si l'utilisateur peut voir une page
  const canViewPage = (pageName: string): boolean => {
    // Les admins ont accès à tout
    if (role === 'admin') {
      return true;
    }
    
    // Pour les utilisateurs normaux, vérifier les permissions
    const pagePermission = permissionsMap[pageName];
    const hasAccess = pagePermission ? pagePermission.can_view : false;
    // console.log(`Vérification d'accès à ${pageName}: ${hasAccess}`, { 
    //   pagePermission, 
    //   permissionsMap 
    // });
    
    return hasAccess;
  };

  return {
    canViewPage,
    isAdmin: role === 'admin',
    permissions: permissionsMap,
    loaded
  };
}
