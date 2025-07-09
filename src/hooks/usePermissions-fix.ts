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
              console.log('Permissions chargées:', userPerms);
            }
          } catch (parseError) {
            console.error('Erreur de parsing JSON des permissions:', parseError);
          }
        }

        const userStr = localStorage.getItem('user');
        if (userStr && !role) {
          try {
            const user = JSON.parse(userStr);
            setRole(user?.role || '');
          } catch (parseError) {
            console.error('Erreur de parsing JSON user:', parseError);
          }
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
    if (role === 'admin') return true;
    
    // Pour les utilisateurs normaux, vérifier les permissions
    const pagePermission = permissionsMap[pageName];
    return pagePermission ? pagePermission.can_view : false;
  };

  return {
    canViewPage,
    isAdmin: role === 'admin',
    permissions: permissionsMap,
    loaded
  };
}
