// import './App.css';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap/dist/js/bootstrap.bundle.min.js';
// import { useState } from 'react';
// import Navbar from './components/Navbar';
// import Dashboard from './components/Dahboard'; 
// import Clients from './components/Clients';
// import Etudiants from './components/Etudiants';
// import Voyages from './components/Voyages';
// import DevisFactures from './components/Devis';
// import Historiques from './components/Historiques';

// function App() {
//   const [activeComponent, setActiveComponent] = useState('Dashboard');
//   const components: any = {
//     Dashboard: <Dashboard />,
//     clients: <Clients />,
//     etudiants: <Etudiants />,
//     voyages: <Voyages />,
//     devis: <DevisFactures />,
//     historiques: <Historiques />,
//   };

//   return (
//     <section className="App d-flex overflow-x-hidden">
//       <div className="position-fixed">
//         <Navbar
//           ActiveComponents={activeComponent}
//           setActiveComponents={setActiveComponent}
//         />
//       </div>
//       <div className="Contenu flex-grow-1 p-2 bg-light">
//         {components[activeComponent]}
//       </div>
//     </section>
//   );
// }

// export default App;

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
        console.log('Vérification du token...');
        const isValidToken = await checkAuthToken();
        
        if (!isValidToken) {
          console.log('Token invalide ou inexistant');
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        console.log('Token valide, récupération des permissions...');
        // Récupérer les permissions si le token est valide
        const permissions = await getUserPermissions();
        console.log('Permissions récupérées:', permissions);
        
        // Authentifier l'utilisateur même si aucune permission n'est définie
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Erreur lors de la vérification du token:', error);
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

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