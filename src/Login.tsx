import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env?.VITE_API_URL || 'https://backend1-lz19.onrender.com';

const API = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const checkAuthToken = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    const headers = {
      'Authorization': `Bearer ${token}`
    };

    const response = await API.get('/api/auth/me', { headers });
    return response.data.success;
  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error);
    localStorage.removeItem('authToken');
    return false;
  }
};

export const getUserPermissions = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    const headers = {
      'Authorization': `Bearer ${token}`
    };

    const response = await API.get('/api/permissions/my-permissions', { headers });
    if (response.data && response.data.success) {
      
      if (!response.data.data || !response.data.data.permissions) {
        return null;
      }
      
      localStorage.setItem('userPermissions', JSON.stringify(response.data.data));
      
      return response.data.data;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    return null;
  }
};

export default function Login({setIsAuthenticated}: any) {
    const [email, setemail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
  
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: any) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      
      try {
        const response = await API.post('/api/auth/login', {
          email,
          password
        });
                
        if (response.data && response.data.data && response.data.data.token) {
          if (localStorage.getItem('authToken')) {
           return alert('Vous allez être déconnecté(e) de la session précédente.');
          }          
          localStorage.setItem('authToken', response.data.data.token);
          
          if (response.data.data.user) {
            if (localStorage.getItem('user')) { 
             return alert('Vous allez être déconnecté(e) de la session précédente.');
             }
            localStorage.setItem('user', JSON.stringify(response.data.data.user));
          }
          
          try {
            const permissions = await getUserPermissions();
            
            if (!permissions) {
              console.warn('Aucune permission récupérée ou format incorrect');
            }
            
            setIsAuthenticated(true);
          } catch (permError) {
            setIsAuthenticated(true);
          }
        } else {
          console.error('Format de réponse incorrect:', response.data);
          setError(`Format de réponse incorrect: ${JSON.stringify(response.data)}`);
        }
      } catch (err: any) {
        console.error('Erreur d\'authentification:', err);
        
        if (err.response) {
          if (err.response.status === 401) {
            setError('Email ou mot de passe incorrect');
          } else if (err.response.data && err.response.data.message) {
            setError(err.response.data.message);
          } else {
            setError(`Erreur ${err.response.status}: ${err.response.statusText}`);
          }
        } else if (err.request) {
          setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
        } else {
          setError('Une erreur est survenue: ' + err.message);
        }
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow-lg p-2" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="text-center mb-4">
        <img src="/lg.png" width={"180px"} height={"150px"} alt="Logo" />

          <h3 className="fw-bold">Connexion</h3>
          <p className="text-muted">Bienvenue ! Veuillez vous connecter.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Adresse e-mail</label>
            <input type="email" className="form-control" id="email" placeholder="ex: user@email.com"
             value={email}
             onChange={(e) => setemail(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Mot de passe</label>
            <input type="password" className="form-control" id="password" placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {/* <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="remember" />
              <label className="form-check-label" htmlFor="remember">
                Se souvenir de moi
              </label>
            </div>
            <a href="#" className="text-decoration-none">Mot de passe oublié ?</a>
          </div> */}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="btn btn-primary w-100" 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Connexion en cours...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
        {/* <div className="text-center mt-3">
          <small className="text-muted">Pas de compte ? <a href="#" className="text-primary">S'inscrire</a></small>
        </div> */}
      </div>
    </div>
  );
}
