import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiConfig';

// Nous utilisons apiClient configuré pour toutes les requêtes, plus besoin de définir API_URL ici

const Historique = ({ setIsAuthenticated }: any) => {
  const [userName, setuserName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  const [permissions, setPermissions] = useState({
    factures: false,
    clients: false,
    paiements: false,
    dossiers_voyage: false,
    users: false
  });

  useEffect(() => {
    testApiConnection();
  }, []);

  // Fonction pour vérifier l'état de l'API
  const testApiConnection = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Pas de token d\'authentification trouvé');
        setApiStatus('error');
        return false;
      }

      // Test simple pour vérifier si l'API est accessible
      const response = await apiClient.get('/api/users/permissions');

      setApiStatus('connected');
      return true;
    } catch (err: any) {
      console.error('Erreur lors du test de connexion à l\'API:', err);
      setApiStatus('error');

      if (err.response) {
        if (err.response.status === 401) {
          setError('Problème d\'authentification. Le token est peut-être invalide ou expiré.');
        } else {
          setError(`Erreur API: ${err.response.status} - ${err.response.statusText}`);
        }
      } else if (err.request) {
        setError(`Impossible de contacter le serveur à l'adresse ${apiClient.defaults.baseURL}. Vérifiez que le serveur est bien démarré et accessible.`);
      } else {
        setError(`Erreur de configuration: ${err.message}`);
      }

      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour vérifier si l'utilisateur est bien connecté
  const checkToken = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Pas de token d\'authentification trouvé');
      return false;
    }
    return true;
  };

  const handlePermissionChange = (permission: string, value: boolean) => {
    setPermissions({
      ...permissions,
      [permission]: value
    });
  };

  // Fonction de validation d'email
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const isTokenValid = await checkToken();
      if (!isTokenValid) {
        setLoading(false);
        return;
      }

      // Récupérer le token d'authentification
      const token = localStorage.getItem('authToken');

      // Vérification des données du formulaire
      if (!userName || userName.trim() === '') {
        setError('Le nom d\'utilisateur est obligatoire');
        setLoading(false);
        return;
      }

      if (!email || email.trim() === '') {
        setError('L\'email est obligatoire');
        setLoading(false);
        return;
      }

      if (!isValidEmail(email)) {
        setError('Format d\'email invalide');
        setLoading(false);
        return;
      }

      if (!password || password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        setLoading(false);
        return;
      }

      // Vérifier si au moins une permission est sélectionnée
      const hasPermissions = Object.values(permissions).some(value => value === true);
      if (!hasPermissions) {
        setError('Veuillez sélectionner au moins une permission d\'accès');
        setLoading(false);
        return;
      }

      const selectedPermissions = Object.keys(permissions)
        .filter(key => permissions[key as keyof typeof permissions]);

      console.log('Permissions sélectionnées:', selectedPermissions);

      const userData = {
        username: userName,
        email: email,
        password: password,
        role: 'user',
        is_active: true,
        permissions: selectedPermissions // Envoyer comme tableau natif
      };

      // Vérifier le format des permissions avant envoi
      // console.log('Envoi de données utilisateur:', {
      //   ...userData,
      //   password: '******',
      //   permissions: {
      //     type: typeof selectedPermissions,
      //     isArray: Array.isArray(selectedPermissions),
      //     value: selectedPermissions
      //   }
      // });

      // Appel à l'API pour créer l'utilisateur
      const response = await apiClient.post(
        `/api/users`,
        userData
      );


      if (response.data && response.data.success) {
        // Message de succès avec les détails de l'utilisateur créé
        setSuccessMessage(`Utilisateur "${userData.username}" créé avec succès avec les accès sélectionnés.`);

        // Réinitialiser le formulaire
        setuserName('');
        setPassword('');
        setEmail('');
        setPermissions({
          factures: false,
          clients: false,
          paiements: false,
          dossiers_voyage: false,
          users: false
        });
      } else {
        setError('Erreur inattendue lors de la création de l\'utilisateur');
      }
    } catch (err: any) {
      console.error('Erreur détaillée:', err);

      let errorMsg = 'Erreur lors de la création de l\'utilisateur';

      if (err.response) {
        // La requête a été faite et le serveur a répondu avec un code d'état
        console.error('Réponse d\'erreur:', err.response.data);

        if (err.response.data?.error) {
          errorMsg = `Erreur serveur: ${err.response.data.error}`;
        } else if (err.response.data?.message) {
          errorMsg = `${err.response.data.message}`;
        } else {
          errorMsg = `Erreur ${err.response.status}: ${err.response.statusText}`;
        }

        // Gérer les cas d'erreur spécifiques
        if (err.response.status === 401) {
          errorMsg = 'Problème d\'authentification. Votre session est peut-être expirée.';
        } else if (err.response.status === 400) {
          if (err.response.data?.errors) {
            // Afficher les erreurs de validation détaillées
            const validationErrors = err.response.data.errors;
            errorMsg = "Erreurs de validation: \n";
            Object.keys(validationErrors).forEach(key => {
              errorMsg += `- ${key}: ${validationErrors[key]}\n`;
            });
          } else {
            errorMsg = err.response.data?.message || 'Données invalides';
          }
        } else if (err.response.status === 403) {
          errorMsg = 'Vous n\'avez pas les permissions nécessaires pour créer un utilisateur';
        } else if (err.response.status === 409) {
          errorMsg = 'Cet utilisateur ou cet email existe déjà dans le système';
        }
      } else if (err.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        console.error('Erreur de réseau:', err.request);
        errorMsg = `Impossible de contacter le serveur à ${apiClient.defaults.baseURL}. Vérifiez votre connexion Internet et que le serveur backend est bien démarré.`;
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };



  const [userType, setUserType] = useState<'restrict' | 'admin'>();

  const handleUserTypeChange = (type: 'restrict' | 'admin') => {
    setUserType(type);

    if (type === 'admin') {
      setPermissions({
        factures: true,
        clients: true,
        paiements: true,
        dossiers_voyage: true,
        users: true
      });
    } else {
      setPermissions({
        factures: false,
        clients: true,
        paiements: false,
        dossiers_voyage: true,
        users: false
      });
    }
  };

  <div className='text-center d-flex justify-content-center gap-3 mb-4'>
    <button
      type="button"
      className={`btn ${userType === 'restrict' ? 'btn-primary' : 'btn-outline-primary'}`}
      onClick={() => handleUserTypeChange('restrict')}
    >
      Utilisateur Restreint
    </button>
    <button
      type="button"
      className={`btn ${userType === 'admin' ? 'btn-primary' : 'btn-outline-primary'}`}
      onClick={() => handleUserTypeChange('admin')}
    >
      Administrateur
    </button>
  </div>

  return (
    <div className="d-flex justify-content-center align-items-center bg-light">
      <div className="card shadow-lg p-4" style={{ width: '100%', maxWidth: '500px' }}>
        <div className="text-center">
          <img
            src="/lg.png"
            width="180"
            height="150"
            alt="Logo"
            className="img-fluid"
          />
          <h3 className="fw-bold">Gestion d'accès</h3>
        </div>

        {/* Indicateur d'état de l'API */}
        {/* <div className={`alert ${apiStatus === 'connected' ? 'alert-success' : apiStatus === 'connecting' ? 'alert-warning' : 'alert-danger'} d-flex align-items-center mb-3`}>
          <div className="me-2">
            {apiStatus === 'connected' ? (
              <i className="bi bi-check-circle-fill"></i>
            ) : apiStatus === 'connecting' ? (
              <div className="spinner-border spinner-border-sm" role="status"></div>
            ) : (
              <i className="bi bi-exclamation-triangle-fill"></i>
            )}
          </div>
          <div>
            {apiStatus === 'connected'
              ? `API connectée: ${apiClient.defaults.baseURL}`
              : apiStatus === 'connecting'
                ? 'Vérification de la connexion à l\'API...'
                : `Problème de connexion à l'API: ${apiClient.defaults.baseURL}`
            }
          </div>
          
        </div> */}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="userName" className="form-label">Nom d'utilisateur</label>
            <input
              type="text"
              className="form-control"
              id="userName"
              placeholder="ex: johndoe"
              value={userName}
              onChange={(e) => setuserName(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              id="email"
              placeholder="ex: user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-control"
              id="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <small className="form-text text-muted">Le mot de passe doit contenir au moins 6 caractères.</small>
          </div>

          <h5 className='text-center mb-3'>Type d'utilisateur</h5>
          <div className='text-center d-flex justify-content-center gap-3 mb-4'>
            <button
              type="button"
              className={`btn ${userType === 'restrict' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleUserTypeChange('restrict')}
            >
              Utilisateur Restreint
            </button>
            <button
              type="button"
              className={`btn ${userType === 'admin' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleUserTypeChange('admin')}
            >
              Administrateur
            </button>
          </div>

          {/* <div className=" mb-4">
            <div className="card-header">
              <h6 className="mb-0">Autorisations d'accès</h6>
            </div>
            <div className="card-body">
              <div className="col-12 d-flex justify-content-between mb-2">
                <label className="form-label mb-0">Espace Paiements</label>
                <input
                  type="checkbox"
                  className='form-check-input'
                  checked={permissions.paiements}
                  onChange={(e) => handlePermissionChange('paiements', e.target.checked)}
                />
              </div>

              <div className="col-12 d-flex justify-content-between mb-2">
                <label className="form-label mb-0">Espace Clients</label>
                <input
                  type="checkbox"
                  className='form-check-input'
                  checked={permissions.clients}
                  onChange={(e) => handlePermissionChange('clients', e.target.checked)}
                />
              </div>

              <div className="col-12 d-flex justify-content-between mb-2">
                <label className="form-label mb-0">Espace Voyages</label>
                <input
                  type="checkbox"
                  className='form-check-input'
                  checked={permissions.dossiers_voyage}
                  onChange={(e) => handlePermissionChange('dossiers_voyage', e.target.checked)}
                />
              </div>

              <div className="col-12 d-flex justify-content-between mb-2">
                <label className="form-label mb-0">Espace Factures</label>
                <input
                  type="checkbox"
                  className='form-check-input'
                  checked={permissions.factures}
                  onChange={(e) => handlePermissionChange('factures', e.target.checked)}
                />
              </div>

              <div className="col-12 d-flex justify-content-between mb-2">
                <label className="form-label mb-0">Gestion des Utilisateurs</label>
                <input
                  type="checkbox"
                  className='form-check-input'
                  checked={permissions.users}
                  onChange={(e) => handlePermissionChange('users', e.target.checked)}
                />
              </div>

              <div className="alert alert-info mt-2 small">
                <i className="bi bi-info-circle-fill me-2"></i>
                Ces permissions donnent accès aux différentes sections de l'application.
              </div>
            </div>
          </div> */}

          <div className="row">
            <div className="mb-2 text-center">
              <button
                type="submit"
                className="btn btn-primary w-100 py-2 "
                disabled={loading || apiStatus !== 'connected'}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Création en cours...
                  </>
                ) : (
                  "Créer l'utilisateur"
                )}
              </button>
              {successMessage}
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default Historique;