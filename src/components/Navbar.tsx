import React, { useState, useEffect } from 'react';
import { AiFillHome } from 'react-icons/ai';
import { FaUser, FaRegFileAlt } from "react-icons/fa";
import { PiStudentBold } from "react-icons/pi";
import { TbWorldCheck } from "react-icons/tb";
import { MdManageHistory } from "react-icons/md";
import { CiLogout } from "react-icons/ci";
import { usePermissions } from "../hooks/usePermissions";
import "../App.css";

type NavbarProps = {
  ActiveComponents: string;
  setActiveComponents: (value: string) => void;
  setIsAuthenticated?: React.Dispatch<React.SetStateAction<boolean>>;
};

const Navbar: React.FC<NavbarProps> = ({ ActiveComponents, setActiveComponents, setIsAuthenticated }) => {
  const [ShowModalVerify, setShowModalVerify] = useState(false);
  const { canViewPage, isAdmin, permissions, loaded } = usePermissions();
  
  useEffect(() => {
    // Afficher les permissions chargées pour débogage
    console.log('Navbar - Permissions chargées:', { isAdmin, permissions, loaded });
    
    // Journaliser les permissions pour chaque page
    const pages = ['clients', 'dossiers_voyage', 'factures', 'users'];
    pages.forEach(page => {
      console.log(`Page ${page} accessible: ${canViewPage(page)}`);
    });
  }, [isAdmin, permissions, loaded, canViewPage]);

  const VerfiryUser = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModalVerify(true); // Affiche le modal de vérification
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModalVerify(false);
    setActiveComponents("devis");
    console.log("Formulaire vérifié");
  };
  
  const handleLogout = () => {
    console.log('Déconnexion...');
    // Supprimer toutes les données stockées
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userPermissions");
    
    if (setIsAuthenticated) {
      setIsAuthenticated(false);
    }
  };

  // Si les permissions ne sont pas encore chargées, montrer un indicateur de chargement
  if (!loaded) {
    console.log('Navbar - Permissions en cours de chargement...');
    return (
      <div className="nav d-flex flex-column flex-wrap flex-shrink-0 p-3 text-white" 
        style={{ width: '210px', height: '100vh', backgroundColor: '#0072A8' }}>
        <p className="text-center text-white mt-3">Chargement...</p>
      </div>
    );
  }

  console.log('Navbar - Rendu avec permissions:', { isAdmin, permissions });

  return (
    <>
      <div
        className="nav d-flex flex-column flex-wrap flex-shrink-0 p-3 text-white overflow-hidden"
        style={{ width: '210px', height: '100vh', backgroundColor: '#0072A8 ' }}
      >
        <a href="/" className="d-flex align-items-center mb-3 text-white text-decoration-none">
          <img src="/lg.png" className='logo' alt="Logo" />
        </a>
        <hr />
        <ul className="nav nav-pills flex-column ">
          {/* Le tableau de bord est accessible à tous */}
          <li className={`nav-item mt-2 rounded`}
            style={{ backgroundColor: `${ActiveComponents === "Dashboard" ? "#00AEEF " : ""}`}}
            onClick={() => setActiveComponents("Dashboard")}>
            <a href="#" className="nav-link text-white d-flex">
              <AiFillHome className='mt-1 mx-1' />
              <p className='pNav'>Tableau de bord</p>
            </a>
          </li>

          {/* Afficher le menu Clients uniquement si l'utilisateur a la permission */}
          {(canViewPage('clients') || isAdmin) && (
            <li className={`nav-item rounded`}
              style={{ backgroundColor: `${ActiveComponents === "clients" ? "#00AEEF " : ""}` }}
              onClick={() => setActiveComponents("clients")}>
              <a href="#" className="nav-link text-white d-flex">
                <FaUser className='mx-1 mt-1' />
                <p className='pNav'>Clients</p>
              </a>
            </li>
          )}

          {/* Afficher le menu Voyages uniquement si l'utilisateur a la permission */}
          {(canViewPage('dossiers_voyage') || isAdmin) && (
            <li className={`nav-item rounded`}
              style={{ backgroundColor: `${ActiveComponents === "voyages" ? "#00AEEF " : ""}` }}
              onClick={() => setActiveComponents("voyages")}>
              <a href="#" className="nav-link text-white d-flex">
                <TbWorldCheck className='mx-1 mt-1' />
                <p className='pNav'>Voyages</p>
              </a>
            </li>
          )}

          {/* Afficher le menu Factures uniquement si l'utilisateur a la permission */}
          {(canViewPage('factures') || isAdmin) && (
            <li className={`nav-item rounded`}
              style={{ backgroundColor: `${ActiveComponents === "devis" ? "#00AEEF " : ""}` }}
              onClick={() => setActiveComponents("devis")}>
              <a href="#" className="nav-link text-white d-flex">
                <FaRegFileAlt className='mx-1 mt-1' />
                <p className='pNav'>Devis & Factures</p>
              </a>
            </li>
          )}

          {/* Afficher le menu Gestion des employés uniquement pour les admins */}
          {(canViewPage('users') || isAdmin) && (
            <li className={`nav-item rounded`}
              style={{ backgroundColor: `${ActiveComponents === "Historiques" ? "#00AEEF " : ""}` }}
              onClick={() => setActiveComponents("Historiques")}>
              <a href="#" className="nav-link text-white d-flex">
                <MdManageHistory className='mx-1 mt-1' />
                <p className='pNav'>Employe</p>
              </a>
            </li>
          )}
        </ul>

        <hr />
        <li className={`nav-item rounded `}
          style={{ backgroundColor: `${ActiveComponents === "" ? "#00AEEF " : ""}` }}
          onClick={handleLogout}>
          <a href="#" className="nav-link text-white d-flex">
            <CiLogout className='mx-1 mt-1 fw-bolder' />
            <strong className='pNav'>Déconnexion</strong>
          </a>
        </li>
      </div>
    </>
  );
};

export default Navbar;
