
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dahboard'; 
import Clients from './components/Clients';
import Etudiants from './components/Etudiants';
import Voyages from './components/Voyages';
import DevisFactures from './components/Devis';
import Historiques from './components/Historiques';
import Login from './Login'; 
import { checkAuthToken, getUserPermissions } from './Login';

function App() {
  const [activeComponent, setActiveComponent] = useState('Dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'authenticité du token au chargement
    const verifyToken = async () => {
      try {
        const isValidToken = await checkAuthToken();
        
        if (!isValidToken) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        // Récupérer les permissions si le token est valide
        const permissions = await getUserPermissions();
        
        // Authentifier l'utilisateur même si aucune permission n'est définie
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [loading]);

  const components: any = {
    Dashboard: <Dashboard />,
    clients: <Clients />,
    etudiants: <Etudiants />,
    voyages: <Voyages />,
    devis: <DevisFactures />,
    Historiques: <Historiques />,
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <span className="ms-2">Vérification de l'authentification...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login setIsAuthenticated={setIsAuthenticated} />;
  }

  return (
    <section className="App d-flex overflow-x-hidden">
      <div className="position-fixed">
        <Navbar
          ActiveComponents={activeComponent}
          setActiveComponents={setActiveComponent}
          setIsAuthenticated={setIsAuthenticated} 
        />
      </div>
      <div className="Contenu flex-grow-1 p-2 bg-light">
        {components[activeComponent]}
      </div>
    </section>
  );
}

export default App;