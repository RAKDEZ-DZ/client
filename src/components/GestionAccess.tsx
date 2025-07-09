import React, { useState, useEffect } from 'react';
import apiClient, { testApiConnection } from '../api/apiConfig';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface Page {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  route_pattern: string | null;
}

interface Permission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}

interface UserPermission {
  user_id: number;
  page_id: number;
  page_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}

const GestionAccess = ({ setIsAuthenticated }: any) => {
  const [users, setUsers] = useState<User[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Nouvel état pour la création d'utilisateur
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    is_active: true,
  });
  
  // État pour afficher/masquer le formulaire de création
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  
  // État pour les permissions du nouvel utilisateur
  const [newUserPermissions, setNewUserPermissions] = useState<{[key: string]: boolean}>({});

  // Charger les utilisateurs et les pages au chargement du composant
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Vous devez être connecté pour accéder à cette page');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        
        // Récupérer les utilisateurs
        const usersResponse = await apiClient.get('/api/users', { headers });
        setUsers(usersResponse.data.data);
        
        // Récupérer les pages disponibles
        const pagesResponse = await apiClient.get('/api/permissions/pages', { headers });
        setPages(pagesResponse.data.data);
        
      } catch (err: any) {
        setError(err.response?.data?.message || 'Une erreur est survenue');
        if (err.response?.status === 401) {
          setIsAuthenticated(false);
          localStorage.removeItem('authToken');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setIsAuthenticated]);

  // Charger les permissions d'un utilisateur spécifique
  const loadUserPermissions = async (userId: number) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Vous devez être connecté pour accéder à cette page');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await apiClient.get(`/api/permissions/user/${userId}`, { headers });
      
      setUserPermissions(response.data.data.permissions);
      setSelectedUserId(userId);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors du chargement des permissions');
      if (err.response?.status === 401) {
        setIsAuthenticated(false);
        localStorage.removeItem('authToken');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mise à jour des permissions utilisateur
  const handlePermissionChange = (pageId: number, permission: keyof Permission, value: boolean) => {
    setUserPermissions(prev => 
      prev.map(p => 
        p.page_id === pageId 
          ? { ...p, [permission]: value } 
          : p
      )
    );
  };

  // Enregistrer les modifications
  const savePermissions = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      if (!selectedUserId) {
        setError('Aucun utilisateur sélectionné');
        return;
      }

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Vous devez être connecté pour accéder à cette page');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Formater les permissions pour l'API
      const permissions = userPermissions.map(p => ({
        page_id: p.page_id,
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        can_export: p.can_export
      }));
      
      await apiClient.post(`/api/permissions/user/${selectedUserId}`, { permissions }, { headers });
      
      setSuccessMessage('Permissions mises à jour avec succès');
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de l\'enregistrement des permissions');
      if (err.response?.status === 401) {
        setIsAuthenticated(false);
        localStorage.removeItem('authToken');
      }
    } finally {
      setLoading(false);
    }
  };

  // Soumettre le formulaire de création d'utilisateur
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Vous devez être connecté pour accéder à cette page');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Transformer les permissions au format attendu par le backend
      // Convertir les permissions par page en liste de noms de pages
      // Extraire uniquement les noms des pages pour lesquelles l'utilisateur a des permissions
      const permissionsByPage: {[key: string]: boolean} = {};
      Object.keys(newUserPermissions).forEach(key => {
        if (newUserPermissions[key]) {
          const [pageId, permType] = key.split('-');
          // Trouver le nom de la page correspondant à cet ID
          const page = pages.find(p => p.id === parseInt(pageId));
          if (page) {
            permissionsByPage[page.name] = true;
          }
        }
      });
      
      const formattedPermissions = Object.keys(permissionsByPage);
      
      console.log('Permissions formatées:', formattedPermissions);
      
      // Créer l'utilisateur avec les permissions formatées correctement
      const response = await apiClient.post('/api/users', { 
        ...newUser, 
        permissions: formattedPermissions
      }, { headers });
      
      setSuccessMessage('Utilisateur créé avec succès');
      
      // Réinitialiser le formulaire
      setNewUser({
        username: '',
        email: '',
        password: '',
        role: 'user',
        is_active: true,
      });
      setNewUserPermissions({});
      
      // Recharger la liste des utilisateurs
      const usersResponse = await apiClient.get('/api/users', { headers });
      setUsers(usersResponse.data.data);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de la création de l\'utilisateur');
      if (err.response?.status === 401) {
        setIsAuthenticated(false);
        localStorage.removeItem('authToken');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-3">Gestion des accès utilisateurs</h2>
          
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="alert alert-success" role="alert">
              {successMessage}
            </div>
          )}
          
          {loading && (
            <div className="text-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="card-title mb-0">Liste des utilisateurs</h5>
            </div>
            <div className="card-body">
              <div className="list-group">
                {users.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    className={`list-group-item list-group-item-action ${selectedUserId === user.id ? 'active' : ''}`}
                    onClick={() => loadUserPermissions(user.id)}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{user.username}</strong>
                        <br />
                        <small className="text-muted">{user.email}</small>
                      </div>
                      <span className={`badge ${user.role === 'admin' ? 'bg-danger' : 'bg-info'} rounded-pill`}>
                        {user.role}
                      </span>
                    </div>
                  </button>
                ))}
                {users.length === 0 && !loading && (
                  <div className="text-center p-3">
                    <p className="text-muted">Aucun utilisateur trouvé</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="card-title mb-0">Permissions</h5>
            </div>
            <div className="card-body">
              {selectedUserId ? (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead>
                        <tr>
                          <th>Module / Page</th>
                          <th className="text-center">Consulter</th>
                          <th className="text-center">Créer</th>
                          <th className="text-center">Modifier</th>
                          <th className="text-center">Supprimer</th>
                          <th className="text-center">Exporter</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pages.map(page => {
                          const userPerm = userPermissions.find(p => p.page_id === page.id) || {
                            user_id: selectedUserId,
                            page_id: page.id,
                            page_name: page.name,
                            can_view: false,
                            can_create: false,
                            can_edit: false,
                            can_delete: false,
                            can_export: false
                          };
                          
                          return (
                            <tr key={page.id}>
                              <td>
                                <strong>{page.display_name}</strong>
                                {page.description && (
                                  <p className="text-muted small mb-0">{page.description}</p>
                                )}
                              </td>
                              <td className="text-center">
                                <div className="form-check form-switch d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={userPerm.can_view}
                                    onChange={e => handlePermissionChange(page.id, 'can_view', e.target.checked)}
                                  />
                                </div>
                              </td>
                              <td className="text-center">
                                <div className="form-check form-switch d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={userPerm.can_create}
                                    onChange={e => handlePermissionChange(page.id, 'can_create', e.target.checked)}
                                  />
                                </div>
                              </td>
                              <td className="text-center">
                                <div className="form-check form-switch d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={userPerm.can_edit}
                                    onChange={e => handlePermissionChange(page.id, 'can_edit', e.target.checked)}
                                  />
                                </div>
                              </td>
                              <td className="text-center">
                                <div className="form-check form-switch d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={userPerm.can_delete}
                                    onChange={e => handlePermissionChange(page.id, 'can_delete', e.target.checked)}
                                  />
                                </div>
                              </td>
                              <td className="text-center">
                                <div className="form-check form-switch d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={userPerm.can_export}
                                    onChange={e => handlePermissionChange(page.id, 'can_export', e.target.checked)}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 text-end">
                    <button 
                      className="btn btn-primary"
                      onClick={savePermissions}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Enregistrement...
                        </>
                      ) : (
                        'Enregistrer les modifications'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-5">
                  <p className="text-muted">Sélectionnez un utilisateur pour gérer ses permissions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col">
          <div className="card shadow-sm">
            <div className="card-header bg-success text-white">
              <h5 className="card-title mb-0">Créer un nouvel utilisateur</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateUser}>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">Nom d'utilisateur</label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Adresse e-mail</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Mot de passe</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="role" className="form-label">Rôle</label>
                  <select
                    className="form-select"
                    id="role"
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="user">Utilisateur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="is_active" className="form-label">Actif</label>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="is_active"
                      checked={newUser.is_active}
                      onChange={e => setNewUser({ ...newUser, is_active: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="is_active">
                      L'utilisateur peut se connecter
                    </label>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h6>Permissions</h6>
                  {pages.map(page => (
                    <div key={page.id} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`permission-view-${page.id}`}
                        checked={newUserPermissions[`${page.id}-view`] || false}
                        onChange={e => {
                          const updatedPermissions = { ...newUserPermissions };
                          updatedPermissions[`${page.id}-view`] = e.target.checked;
                          setNewUserPermissions(updatedPermissions);
                          console.log('Permissions mises à jour:', updatedPermissions);
                        }}
                      />
                      <label className="form-check-label" htmlFor={`permission-view-${page.id}`}>
                        {`Consulter ${page.display_name}`}
                      </label>
                    </div>
                  ))}
                </div>
                
                <div className="text-end">
                  <button 
                    type="submit" 
                    className="btn btn-success"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Création...
                      </>
                    ) : (
                      'Créer l\'utilisateur'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestionAccess;