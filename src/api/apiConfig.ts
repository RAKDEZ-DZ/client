import axios from 'axios';

// Configuration de l'URL de base pour les appels API
// Priorité à la variable d'environnement, sinon utilise l'IP du réseau
const API_URL = import.meta.env?.VITE_API_URL || 'http://192.168.0.171:3000';

// Création d'un client axios configuré
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,  // 15 secondes de timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token à chaque requête
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs de réponse
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Gestion centralisée des erreurs
    console.error('Erreur API:', error);
    
    // Si le serveur ne répond pas ou erreur réseau
    if (!error.response) {
      console.error('Erreur réseau ou serveur indisponible');
      
      // Afficher une notification pour l'utilisateur
      if (document) {
        const alertDiv = document.createElement('div');
        alertDiv.style.position = 'fixed';
        alertDiv.style.bottom = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.padding = '15px';
        alertDiv.style.backgroundColor = '#f8d7da';
        alertDiv.style.color = '#721c24';
        alertDiv.style.borderRadius = '5px';
        alertDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
          <div><strong>Erreur de connexion au serveur</strong></div>
          <div>Le serveur à l'adresse ${apiClient.defaults.baseURL} n'est pas accessible.</div>
          <div style="margin-top: 10px">
            <small>Vérifiez que le backend est bien démarré.</small>
          </div>
        `;
        document.body.appendChild(alertDiv);
        
        // Supprimer l'alerte après 10 secondes
        setTimeout(() => {
          try {
            document.body.removeChild(alertDiv);
          } catch (e) {
            // Ignorer si déjà supprimé
          }
        }, 10000);
      }
    } 
    // Si erreur 401 (non autorisé)
    else if (error.response.status === 401) {
      console.error('Session expirée ou non authentifiée');
      // Déconnexion possible ici
      localStorage.removeItem('authToken');
      // Redirection à la page de login si nécessaire
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Fonction utilitaire pour vérifier la connexion au serveur
export const testApiConnection = async () => {
  try {
    const response = await apiClient.get('/', { timeout: 5000 });
    console.log('Connexion à l\'API réussie:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Erreur de connexion à l\'API:', error);
    return { 
      success: false, 
      error: error.response ? error.response.data : 'Serveur inaccessible'
    };
  }
};

export default apiClient;
