import React, { useState, useEffect } from 'react';
import { FaDownload, FaEye } from 'react-icons/fa';
import { CiEdit, CiTrash } from 'react-icons/ci';
import html2pdf from 'html2pdf.js';
import axios from 'axios';
import '../assets/pdf-styles.css'; // Import des styles spécifiques pour le PDF
import FacturePreview from './FacturePreview';
import apiClient from '../api/apiConfig'; // Utiliser la config API centralisée
import '../App.css';

// Interface pour représenter le modèle de facture
interface Facture {
  id: number;
  numero_facture: string;
  client_id: number;
  nom: string;
  prenom: string;
  dossier_voyage_id: number | null;
  titre: string;
  description: string | null;
  montant_ht: number;
  montant_paye: number;
  montant_restant: number;
  type_facture: string;
  date_creation: string;
  date_envoi: string | null;
  conditions_paiement: string;
  statut?: string;
}

// Type pour représenter un client
type Client = {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
};

const Devis = () => {
  const [activeTab, setActiveTab] = useState<'devis' | 'factures'>('factures');
  const [ShowModalVerify, setShowModalVerify] = useState(false);
  const [errorsApi, seterrorsApi] = useState('');
  const [IdToDelete, setIdToDelete] = useState<number | null>(null);
  const [IdToUpdate, setIdToUpdate] = useState<number | null>(null);

  const [payment, setpayment] = useState<number | null>(null);
  const [Restepayment, setRestepayment] = useState<number | null>(null);
  const [Versepayment, setVersepayment] = useState<number | null>(null);

  const [nom, setnom] = useState('');
  const [email, setemail] = useState('');
  const [telephone, settelephone] = useState('');
  const [prix, setprix] = useState('');
  const [motif, setmotif] = useState('');
  const [restPrix, setrestPrix] = useState('');

  // Nouveaux états pour gérer les factures
  const [factures, setFactures] = useState<Facture[]>([]);
  const [clients, setClients] = useState<Client[]>([]); // État pour stocker la liste des clients
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);
  
  // Données de test pour développement en cas d'erreur API
  const testFactures: Facture[] = [
    {
      id: 1,
      numero_facture: 'FAC-2025-001',
      client_id: 1,
      nom: 'Dupont',
      prenom: 'Jean',
      dossier_voyage_id: 101,
      titre: 'Voyage Paris-Madrid',
      description: 'Billets d\'avion et 3 nuits d\'hôtel',
      montant_ht: 750,
      montant_paye: 300,
      montant_restant: 450,
      type_facture: 'standard',
      date_creation: '2025-06-15',
      date_envoi: '2025-06-16',
      conditions_paiement: 'Paiement à 30 jours'
    },
    {
      id: 2,
      numero_facture: 'FAC-2025-002',
      client_id: 2,
      nom: 'Martin',
      prenom: 'Sophie',
      dossier_voyage_id: 102,
      titre: 'Voyage d\'affaires New York',
      description: 'Vol business class et 5 nuits d\'hôtel',
      montant_ht: 2500,
      montant_paye: 2500,
      montant_restant: 0,
      type_facture: 'standard',
      date_creation: '2025-06-18',
      date_envoi: '2025-06-19',
      conditions_paiement: 'Paiement à 30 jours'
    },
    {
      id: 3,
      numero_facture: 'FAC-2025-003',
      client_id: 3,
      nom: 'Garcia',
      prenom: 'Manuel',
      dossier_voyage_id: 103,
      titre: 'Séjour linguistique Londres',
      description: 'Vol + hébergement pour 2 semaines',
      montant_ht: 1800,
      montant_paye: 900,
      montant_restant: 900,
      type_facture: 'standard',
      date_creation: '2025-06-20',
      date_envoi: '2025-06-21',
      conditions_paiement: 'Paiement en 2 fois'
    }
  ];

  // Fonction pour récupérer toutes les factures
  const fetchFactures = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('Vous n\'êtes pas authentifié. Veuillez vous connecter.');
        setLoading(false);
        return;
      }
      
      console.log('Récupération des factures, page:', currentPage);
      
      // Utilisation du client API configuré pour communiquer avec le backend
      const response = await apiClient.get('/api/factures', {
        params: {
          page: currentPage,
          limit: 10
        }
      });

      console.log('Réponse de l\'API factures:', response.data);

      // Vérification de la réponse
      if (response.data && response.data.success) {
        setFactures(response.data.data || []);
        // Calcul du nombre total de pages
        if (response.data.pagination) {
          setTotalPages(Math.ceil(response.data.pagination.total / response.data.pagination.limit));
        } else {
          // Si pas de pagination dans la réponse, on suppose qu'on a une seule page
          setTotalPages(1);
        }
        setError(null);
      } else {
        console.warn('Format de réponse incorrect:', response.data);
        setError('Format de réponse incorrect. Vérifiez les logs pour plus d\'informations.');
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération des factures:', error);
      
      // Affichage d'erreurs plus spécifiques
      if (error.response) {
        // La requête a été faite et le serveur a répondu avec un code d'état hors de la plage 2xx
        console.error('Erreur du serveur:', error.response.status, error.response.data);
        setError(`Erreur ${error.response.status}: ${error.response.data.message || 'Erreur du serveur'}`);
      } else if (error.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        console.error('Pas de réponse du serveur:', error.request);
        setError('Le serveur ne répond pas. Vérifiez votre connexion internet.');
      } else {
        // Une erreur s'est produite lors de la configuration de la requête
        setError(`Erreur: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une facture
  const deleteFacture = async (id: number) => {
    try {
      setLoading(true);
      
      const response = await apiClient.delete(`/api/factures/${id}`);

      if (response.data.success) {
        fetchFactures();
        setShowModalVerify(false);
        setIdToDelete(null);
      } else {
        setError('Erreur lors de la suppression de la facture');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la facture:', error);
      setError('Erreur lors de la connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  // Charger les factures au chargement du composant
  useEffect(() => {
    fetchFactures();
  }, [currentPage]); // Recharger quand la page change

  // Charger la liste des clients depuis l'API
  const loadClients = async () => {
    try {
      console.log('Chargement de la liste des clients...');
      const response = await apiClient.get('/api/clients', {
        params: {
          limit: 1000  // On récupère un grand nombre de clients pour le dropdown
        }
      });
      
      let clientsData: Client[] = [];
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        clientsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        clientsData = response.data;
      }
      
      // Trier les clients par nom puis prénom pour faciliter la recherche
      clientsData.sort((a, b) => {
        const nomComparaison = a.nom.localeCompare(b.nom);
        if (nomComparaison !== 0) return nomComparaison;
        return a.prenom.localeCompare(b.prenom);
      });
      
      setClients(clientsData);
      console.log(`${clientsData.length} clients chargés avec succès`);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      // On n'affiche pas d'erreur à l'utilisateur pour ne pas bloquer le processus principal
    }
  };

  // Charger les clients au montage du composant
  useEffect(() => {
    loadClients();
  }, []);

  // Remplacer les données statiques par les données de l'API
  const getFormattedData = () => {
    // Si les factures de l'API sont disponibles, les utiliser
    if (factures.length > 0) {
      return factures.map(facture => ({
        id: facture.numero_facture,
        nomPrenom: `${facture.nom} ${facture.prenom}`,
        email: '', // Ces informations ne sont pas dans le modèle de facture
        telephone: '', // Ces informations ne sont pas dans le modèle de facture
        dossier: facture.titre,
        date: facture.date_creation,
        montant: `${facture.montant_ht} DA`,
        montantRestant: `${facture.montant_restant} DA`,
        statut: getStatut(facture),
        facture: facture // Garder l'objet original pour plus de détails
      }));
    } 
    // En cas d'erreur ou pas de données, utiliser les données de test
    else if (error) {
      console.log('Utilisation des données de test car erreur API:', error);
      return testFactures.map(facture => ({
        id: facture.numero_facture,
        nomPrenom: `${facture.nom} ${facture.prenom}`,
        email: '', 
        telephone: '',
        dossier: facture.titre,
        date: facture.date_creation,
        montant: `${facture.montant_ht} DA`,
        montantRestant: `${facture.montant_restant} DA`,
        statut: getStatut(facture),
        facture: facture
      }));
    }
    // Si aucune donnée et aucune erreur (chargement initial)
    else {
      return [];
    }
  };

  // Déterminer le statut en fonction des montants
  const getStatut = (facture: Facture) => {
    if (facture.montant_restant === 0) {
      return 'Payée';
    } else if (facture.montant_paye > 0) {
      return 'Partiellement payée';
    } else if (facture.date_envoi) {
      return 'Impayée';
    } else {
      return 'En attente';
    }
  };

  const getBadgeColor = (statut: string) => {
    switch (statut) {
      case 'En attente':
        return 'warning';
      case 'Accepté':
        return 'success';
      case 'Payée':
        return 'success';
      case 'Impayée':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const DeleteVoyage = async () => {
    if (!IdToDelete) return;

    try {
      setLoading(true);
      
      // Appel à l'API pour supprimer la facture
      const response = await apiClient.delete(`/api/factures/${IdToDelete}`);

      if (response.data.success) {
        // Rafraîchir la liste après suppression
        fetchFactures();
      } else {
        setError('Erreur lors de la suppression');
      }
      
      setShowModalVerify(false);
      setIdToDelete(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setError('Erreur lors de la connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (data: any[]) => (
    // <div className="table-responsive" >
<div className={loading || data.length === 0  ? "container" : "position-absolute table-responsive1"}>
      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-2">Chargement des données...</p>
        </div>
      ) : error ? (
        <div className="alert alert-warning">
          <h5><i className="fas fa-exclamation-triangle me-2"></i>Problème de connexion à l'API</h5>
          <p className="mb-0">{error}</p>
          <p className="mb-0 small">Note: Des données de test sont affichées pour démonstration.</p>
          <div className="mt-2 d-flex gap-2">
            <button 
              className="btn btn-sm btn-outline-primary" 
              onClick={() => fetchFactures()} 
              disabled={loading}
            >
              <i className="fas fa-sync-alt me-1"></i> Réessayer
            </button>
            <button 
              className="btn btn-sm btn-outline-secondary" 
              onClick={() => setShowDebugInfo(!showDebugInfo)}
            >
              {showDebugInfo ? 'Masquer' : 'Afficher'} les informations de débogage
            </button>
          </div>
          
          {showDebugInfo && (
            <div className="mt-3 p-3 bg-light border rounded small">
              <h6>Informations de débogage</h6>
              <dl className="row mb-0">
                <dt className="col-sm-4">URL Backend</dt>
                <dd className="col-sm-8">http://192.168.0.47:3000/api/factures</dd>
                
                <dt className="col-sm-4">Token Auth</dt>
                <dd className="col-sm-8">
                  {localStorage.getItem('authToken') 
                    ? `${localStorage.getItem('authToken')?.substring(0, 15)}...` 
                    : 'Non trouvé'}
                </dd>
                
                <dt className="col-sm-4">Page actuelle</dt>
                <dd className="col-sm-8">{currentPage}</dd>
                
                <dt className="col-sm-4">Données testées</dt>
                <dd className="col-sm-8">{testFactures.length} factures</dd>
              </dl>
              <div className="mt-2">
                <button 
                  className="btn btn-sm btn-info" 
                  onClick={testApiConnection}
                >
                  Tester la connexion
                </button>
              </div>
            </div>
          )}
        </div>
      ) : data.length === 0 ? (
        <div className="alert alert-info text-center">Aucune facture disponible</div>
      ) : (
        // <table className="table table-hover align-middle mb-0" style={{ minWidth: '800px', width: '100%' }}>
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ minWidth: '100px' }}>#Numéro</th>
              <th style={{ minWidth: '200px' }}>Nom & Prénom</th>
              <th style={{ minWidth: '250px' }}>Titre</th>
              <th style={{ minWidth: '150px' }}>Date</th>
              <th style={{ minWidth: '150px' }}>Montant HT</th>
              <th style={{ minWidth: '150px' }}>Reste à payer</th>
              <th style={{ minWidth: '150px' }}>Statut</th>
              <th style={{ minWidth: '200px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.nomPrenom}</td>
                <td>{item.dossier}</td>
                <td>{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                <td>{item.montant}</td>
                <td>{item.montantRestant}</td>
                <td>
                  <span className={`badge bg-${getBadgeColor(item.statut)}`}>
                    {item.statut}
                  </span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-primary btn-sm"
                    onClick={() => handleView(item)}
                    data-bs-toggle="modal"
                    data-bs-target="#modalView"
                    title="Voir"
                  >
                    <FaEye />
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      // Stocker l'ID et les données de la facture à modifier
                      setIdToUpdate(item.facture.id);
                      setSelectedItem(item);
                      
                      // Réinitialiser les erreurs
                      setError(null);
                      
                      // Préremplir les champs de modification avec des valeurs numériques garanties
                      const montantPaye = Number(item.facture.montant_paye) || 0;
                      const montantRestant = Number(item.facture.montant_restant) || 0;
                      
                      setVersepayment(montantPaye);
                      setRestepayment(montantRestant);
                      
                      // Sélectionner le client correspondant dans le dropdown si nécessaire
                      const client = findClientById(item.facture.client_id);
                      if (client) {
                        const clientValue = `${client.id}-${client.nom} ${client.prenom}`;
                        setnom(clientValue);
                        
                        // Pré-remplir d'autres champs si nécessaire
                        if (client.email) setemail(client.email);
                        if (client.telephone) settelephone(client.telephone);
                      }
                      
                      // Vérifier la cohérence des montants et corriger si nécessaire
                      const montantTotal = Number(item.facture.montant_ht) || 0;
                      if (Math.abs((montantPaye + montantRestant) - montantTotal) > 0.01) {
                        console.warn('Incohérence détectée dans les montants de la facture:', {
                          id: item.facture.id,
                          montantTotal,
                          montantPaye,
                          montantRestant,
                          somme: montantPaye + montantRestant
                        });
                      }
                      
                      // Afficher les données à modifier dans la console pour débogage
                      console.log('Facture à modifier:', item.facture);
                    }}
                    data-bs-toggle="modal"
                    data-bs-target="#modalEditeDevis"
                    title="Modifier"
                  >
                    <CiEdit size={20} />
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      setShowModalVerify(true);
                      setIdToDelete(item.facture.id);
                    }}
                    title="Supprimer"
                  >
                    <CiTrash size={20} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
      
      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <nav aria-label="Pagination des factures" className="mt-4">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                Précédent
              </button>
            </li>
            {[...Array(totalPages)].map((_, i) => (
              <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                  {i + 1}
                </button>
              </li>
            ))}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                Suivant
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );

  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handleView = (item: any) => {
    setSelectedItem(item);
  };


  const handleDownloadPDF = () => {
    const element = document.getElementById('pdf-content');
    if (!element) return;

    // Afficher une notification de chargement
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '1100';
    toastContainer.innerHTML = `
      <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header bg-info text-white">
          <strong class="me-auto">Génération du PDF</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body d-flex align-items-center">
          <div class="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>
          <span>Préparation du document au format A4...</span>
        </div>
      </div>
    `;
    document.body.appendChild(toastContainer);

    // Vérifier si les couleurs doivent être incluses
    const includeBackground = document.getElementById('showBackgroundCheck') as HTMLInputElement;
    const withColors = includeBackground ? includeBackground.checked : true;
    
    // Créer un container caché pour le clonage et la préparation du PDF
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);
    
    // Importer les styles de Bootstrap pour le PDF
    const cssLinks = Array.from(document.getElementsByTagName('link'))
      .filter(link => link.rel === 'stylesheet')
      .map(link => link.href);
    
    // Créer un iframe pour isoler le contenu et ses styles
    const iframe = document.createElement('iframe');
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    container.appendChild(iframe);
    
    // Attendre le chargement de l'iframe
    iframe.onload = () => {
      if (!iframe.contentDocument) return;
      
      // Ajouter les styles de Bootstrap
      cssLinks.forEach(href => {
        const link = iframe.contentDocument!.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        iframe.contentDocument!.head.appendChild(link);
      });
      
      // Ajouter nos styles spécifiques pour le PDF
      const styleElement = iframe.contentDocument!.createElement('style');
      styleElement.textContent = `
        @page { size: 210mm 297mm; margin: 0; }
        body { 
          margin: 0; 
          padding: 0; 
          font-family: Arial, sans-serif; 
          background-color: white;
          width: 210mm;
          height: 297mm;
        }
        #pdf-container {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }
        /* Styles spécifiques pour le PDF */
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td { border: 1px solid #dee2e6; padding: 0.75rem; }
        .table-striped tbody tr:nth-of-type(odd) { background-color: rgba(0, 0, 0, 0.05); }
        .table-bordered th, .table-bordered td { border: 1px solid #dee2e6; }
        .table thead th { border-bottom: 2px solid #dee2e6; }
        .table-light { background-color: #f8f9fa; }
        .bg-light { background-color: #f8f9fa !important; }
        .rounded { border-radius: 0.25rem !important; }
        .border { border: 1px solid #dee2e6 !important; }
        .border-top { border-top: 1px solid #dee2e6 !important; }
        .border-bottom { border-bottom: 1px solid #dee2e6 !important; }
        .text-center { text-align: center !important; }
        .text-end { text-align: right !important; }
        .badge {
          display: inline-block;
          padding: 0.25em 0.4em;
          font-size: 75%;
          font-weight: 700;
          line-height: 1;
          text-align: center;
          white-space: nowrap;
          vertical-align: baseline;
          border-radius: 0.25rem;
        }
        .badge.bg-success {
          background-color: #28a745 !important;
          color: white !important;
        }
        .badge.bg-warning {
          background-color: #ffc107 !important;
          color: black !important;
        }
        .badge.bg-danger {
          background-color: #dc3545 !important;
          color: white !important;
        }
        .badge.bg-secondary {
          background-color: #6c757d !important;
          color: white !important;
        }
        .row { display: flex; flex-wrap: wrap; margin-right: -15px; margin-left: -15px; }
        .col-6 { flex: 0 0 50%; max-width: 50%; padding: 0 15px; box-sizing: border-box; }
        .p-3 { padding: 1rem !important; }
        .pb-2 { padding-bottom: 0.5rem !important; }
        .mb-0 { margin-bottom: 0 !important; }
        .mb-1 { margin-bottom: 0.25rem !important; }
        .mb-3 { margin-bottom: 1rem !important; }
        .mb-5 { margin-bottom: 3rem !important; }
        .mt-5 { margin-top: 3rem !important; }
        .pt-4 { padding-top: 1.5rem !important; }
        .d-flex { display: flex !important; }
        .justify-content-between { justify-content: space-between !important; }
        .align-items-center { align-items: center !important; }
        ${!withColors ? `
          .bg-light, .table-light, .table-striped tbody tr:nth-of-type(odd) { background-color: transparent !important; }
          .badge { border: 1px solid #000; }
          .badge.bg-success, .badge.bg-warning, .badge.bg-danger, .badge.bg-secondary { background-color: transparent !important; color: #000 !important; }
        ` : ''}
      `;
      iframe.contentDocument!.head.appendChild(styleElement);
      
      // Cloner le contenu de l'élément original
      const contentClone = element.cloneNode(true) as HTMLElement;
      
      // Nettoyer le clone (supprimer les boutons, éléments interactifs, etc.)
      const elementsToRemove = contentClone.querySelectorAll('button, input');
      elementsToRemove.forEach(el => el.parentNode?.removeChild(el));
      
      // Créer un conteneur pour le PDF dans l'iframe
      const pdfContainer = iframe.contentDocument!.createElement('div');
      pdfContainer.id = 'pdf-container';
      pdfContainer.innerHTML = contentClone.innerHTML;
      
      // Ajouter le conteneur au body de l'iframe
      iframe.contentDocument!.body.appendChild(pdfContainer);
      
      // Donner un peu de temps au rendu avant de générer le PDF
      setTimeout(() => {
        // Format A4 exact: 210mm x 297mm
        const opt = {
          margin: [0, 20, 0, 20], // Pas de marge supplémentaire car déjà incluse dans le style
          filename: `${activeTab === 'devis' ? 'Devis' : 'Facture'}-${selectedItem?.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 }, // Haute qualité pour les images
          html2canvas: { 
            scale: 4, // Échelle encore plus élevée pour une meilleure qualité
            useCORS: true,
            logging: false,
            letterRendering: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4',
            orientation: 'portrait',
            compress: true,
          },
        };
        
        (html2pdf() as any)
          .from(pdfContainer)
          .set(opt)
          .outputPdf('blob')
          .then((pdfBlob: Blob) => {
            // Créer une URL pour le téléchargement
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${activeTab === 'devis' ? 'Devis' : 'Facture'}-${selectedItem?.id}.pdf`;
            
            // Déclencher le téléchargement
            link.click();
            
            // Nettoyer les ressources
            setTimeout(() => {
              URL.revokeObjectURL(url);
              document.body.removeChild(container);
              
              // Remplacer la notification de chargement par une notification de succès
              toastContainer.innerHTML = `
                <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                  <div class="toast-header bg-success text-white">
                    <strong class="me-auto">PDF généré avec succès</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                  </div>
                  <div class="toast-body">
                    Le document a été téléchargé au format PDF.
                  </div>
                </div>
              `;
              
              // Supprimer la notification après 3 secondes
              setTimeout(() => {
                document.body.removeChild(toastContainer);
              }, 3000);
            }, 100);
          })
          .catch((error: any) => {
            console.error('Erreur lors de la génération du PDF:', error);
            document.body.removeChild(container);
            
            // Afficher une notification d'erreur
            toastContainer.innerHTML = `
              <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header bg-danger text-white">
                  <strong class="me-auto">Erreur</strong>
                  <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                  Une erreur est survenue lors de la génération du PDF.
                </div>
              </div>
            `;
          });
      }, 500);
    };
    
    // Définir le src de l'iframe pour déclencher l'événement onload
    iframe.src = 'about:blank';
  };

  const UpdatedDevis = async () => {
    if (!IdToUpdate) return;

    try {
      setLoading(true);
      
      // Vérifier que les valeurs sont valides
      if (Versepayment === null || isNaN(Versepayment) || Restepayment === null || isNaN(Restepayment)) {
        setError('Montants invalides. Veuillez entrer des valeurs numériques.');
        setLoading(false);
        return;
      }
      
      // S'assurer que les valeurs sont des nombres
      const montantPaye = Number(Versepayment);
      const montantRestant = Number(Restepayment);
      
      // Vérifier la cohérence des montants
      const montantTotal = selectedItem?.facture?.montant_ht || 0;
      if (montantPaye + montantRestant !== montantTotal) {
        console.warn('Incohérence dans les montants:', {
          montantPaye,
          montantRestant,
          montantTotal,
          somme: montantPaye + montantRestant
        });
        // Recalculer le montant restant pour s'assurer de la cohérence
        const resteCorrige = Math.max(0, montantTotal - montantPaye);
        console.log('Montant restant corrigé:', resteCorrige);
      }
      
      // Préparer toutes les données à mettre à jour
      const updatedData = {
        montant_paye: montantPaye,
        montant_restant: montantRestant,
        // Inclure les autres champs nécessaires pour une mise à jour complète
        titre: selectedItem?.dossier || selectedItem?.facture?.titre,
        description: selectedItem?.facture?.description,
        conditions_paiement: selectedItem?.facture?.conditions_paiement
      };
      
      console.log('Données envoyées pour mise à jour:', updatedData);
      const response = await apiClient.put(`/api/factures/${IdToUpdate}`, updatedData);

      if (response.data.success) {
        // Rafraîchir la liste après mise à jour
        fetchFactures();
        setError(null); // Effacer les messages d'erreur précédents
        
        // Fermer la modal
        const modal = document.getElementById('modalEditeDevis');
        if (modal) {
          (modal as any).classList.remove('show');
          modal.setAttribute('aria-hidden', 'true');
          modal.removeAttribute('style');
          document.body.classList.remove('modal-open');
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) backdrop.remove();
        }
        
        // Réinitialiser les états
        setIdToUpdate(null);
        setpayment(null);
        setRestepayment(null);
        setVersepayment(null);
      } else {
        setError('Erreur lors de la mise à jour');
      }

    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setError('Erreur lors de la connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleDevisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    try {      
      // Déterminer l'API à appeler selon le type (devis ou facture)
      const apiUrl = activeTab === 'devis' ? '/api/devis' : '/api/factures';
      
      // Extraire l'ID client et le nom/prénom du champ nom qui est au format "ID-Nom Prénom"
      const clientParts = nom.split('-');
      const client_id = parseInt(clientParts[0]) || 0;
      const nomComplet = clientParts.length > 1 ? clientParts[1].trim() : '';
      
      // Séparation du nom et prénom (si disponible)
      const nomParts = nomComplet.split(' ');
      const nomClient = nomParts[0] || '';
      const prenomClient = nomParts.slice(1).join(' ') || '';
      
      // Trouver le client sélectionné pour obtenir plus d'informations
      const clientSelectionne = clients.find(c => c.id === client_id);
      
      // Préparer les données pour l'ajout
      const factureData = {
        client_id: client_id,
        nom: clientSelectionne?.nom || nomClient,
        prenom: clientSelectionne?.prenom || prenomClient,
        titre: motif,
        description: email, // Utilisé comme description pour le moment
        montant_ht: parseFloat(prix) || 0,
        montant_paye: parseFloat(Versepayment?.toString() || "0") || 0,
        montant_restant: parseFloat(restPrix) || 0,
        conditions_paiement: telephone, // Utilisé comme conditions pour le moment
        type_facture: activeTab === 'devis' ? 'devis' : 'standard'
      };

      // Ajout d'une nouvelle facture/devis
      const response = await apiClient.post(apiUrl, factureData);
  
      // Réinitialiser les champs du formulaire
      setnom('');
      setemail('');
      settelephone('');
      setprix('');
      setmotif('');
      setrestPrix('');
      setVersepayment(null);
      setIdToUpdate(null); // Réinitialiser l'ID pour la prochaine opération
      
      // Fermer la modal
      const modal = document.getElementById('ModalAddDevis');
      if (modal) {
        (modal as any).classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modal.removeAttribute('style');
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
      }
      
      // Recharger les données
      fetchFactures();
      
      // Afficher un message de succès
      setError(null);
      seterrorsApi('');
      
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement:', error);
      
      let errorMessage = 'Une erreur est survenue lors de l\'enregistrement';
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Erreur ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Le serveur ne répond pas. Vérifiez votre connexion.';
      } else {
        errorMessage = error.message;
      }
      
      seterrorsApi(errorMessage);
    }
  };
  
  // Fonction pour tester différentes routes API pour le débogage
  const testApiConnection = async () => {
    setLoading(true);
    const results = [];
    
    try {
      // Test de la connexion au backend sans API spécifique
      const testNoAuth = await apiClient.get('/');
      results.push({ 
        route: '/', 
        status: testNoAuth.status, 
        ok: testNoAuth.status === 200,
        data: JSON.stringify(testNoAuth.data).substring(0, 100)
      });
    } catch (e: any) {
      results.push({ 
        route: '/', 
        status: e.response?.status || 'ERR', 
        ok: false,
        error: e.message 
      });
    }
    
    try {
      // Test de l'API factures avec authentification
      const testAuth = await apiClient.get('/api/factures');
      results.push({ 
        route: '/api/factures', 
        status: testAuth.status, 
        ok: testAuth.status === 200,
        data: JSON.stringify(testAuth.data).substring(0, 100)
      });
    } catch (e: any) {
      results.push({ 
        route: '/api/factures', 
        status: e.response?.status || 'ERR', 
        ok: false, 
        error: e.message 
      });
    }
    
    console.table(results);
    setError(`Résultats du test de connexion: ${results.filter(r => r.ok).length}/${results.length} OK`);
    setLoading(false);
    return results;
  };

  // Fonction pour rechercher un client par ID dans la liste des clients
  const findClientById = (id: number): Client | undefined => {
    return clients.find(client => client.id === id);
  };



  return (
    <>
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap mb-4" >
          <div className="d-flex align-items-center">
            <h2 className="fw-bold mb-0 me-3">Gestion des {activeTab === 'devis' ? 'Devis' : 'Factures'}</h2>
            <div className="d-flex align-items-center">
             
            </div>
          </div>
            <div className="d-flex justify-content-between flex-wrap ">
              <button 
                className=" btn fw-semibold" 
                data-bs-toggle="modal" 
                data-bs-target="#ModalAddDevis"
                style={{ backgroundColor: "#00AEEF", color: "white" }}
              >
                + {activeTab === 'devis' ? 'Devis' : 'Facture'}
              </button>
              {error && (
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    testApiConnection();
                    setShowDebugInfo(!showDebugInfo);
                  }}
                  title="Tester la connexion à l'API"
                >
                  <i className="fas fa-bug me-1"></i> Diagnostic
                </button>
              )}
            </div>
       
        </div>

        <div>{renderTable(getFormattedData())}</div>

        <div className="modal fade" id="modalView" tabIndex={-1} aria-hidden="true">
          <div className="modal-dialog modal-xl" style={{ maxWidth: '900px' }}>
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title">
                  <i className="fas fa-file-alt me-2"></i>
                  Aperçu {activeTab === 'devis' ? 'du Devis' : 'de la Facture'} #{selectedItem?.id}
                  <span className="ms-2 badge bg-info">Format A4</span>
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body bg-light p-3" style={{ maxHeight: '80vh', overflow: 'auto' }}>
                {selectedItem && (
                  <div id="pdf-content">
                    <FacturePreview 
                      selectedItem={selectedItem}
                      activeTab={activeTab}
                      getBadgeColor={getBadgeColor}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer bg-light">
                <div className="d-flex justify-content-between align-items-center w-100">
                  <div>
                    <div className="form-check">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="showBackgroundCheck"
                        defaultChecked={true} 
                      />
                      <label className="form-check-label small" htmlFor="showBackgroundCheck">
                        Inclure les couleurs et arrière-plans
                      </label>
                    </div>
                    <span className="text-muted small">Format d'impression: A4 (210 x 297 mm)</span>
                  </div>
                  <div>
                    <button 
                      type="button" 
                      className="btn btn-outline-primary me-2" 
                      onClick={() => {
                        // Ouvre une nouvelle fenêtre pour impression
                        const printWindow = window.open('', '_blank');
                        if (printWindow && selectedItem) {
                          // Inclure tous les styles CSS
                          const cssLinks = Array.from(document.getElementsByTagName('link'))
                            .filter(link => link.rel === 'stylesheet')
                            .map(link => `<link href="${link.href}" rel="stylesheet">`);
                          
                          // Inclure notre style spécifique pour l'impression
                          const pdfStyleLink = document.querySelector('link[href*="pdf-styles.css"]');
                          const pdfStyleHref = pdfStyleLink ? pdfStyleLink.getAttribute('href') : '';
                          
                          printWindow.document.write(`
                            <html>
                              <head>
                                <meta charset="UTF-8">
                                <title>${activeTab === 'devis' ? 'Devis' : 'Facture'} #${selectedItem?.id}</title>
                                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                                ${pdfStyleHref ? `<link href="${pdfStyleHref}" rel="stylesheet">` : ''}
                                <style>
                                  @page { size: 210mm 297mm; margin: 0; }
                                  body { margin: 0; padding: 0; }
                                  #printContent { 
                                    width: 210mm;
                                    min-height: 297mm;
                                    margin: 0 auto;
                                    padding: 20mm;
                                    box-sizing: border-box;
                                    background-color: white;
                                    position: relative;
                                    overflow: hidden;
                                  }
                                  /* Force l'utilisation des couleurs à l'impression */
                                  * {
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                  }
                                </style>
                              </head>
                              <body>
                                <div id="printContent">
                                  <div class="facture-preview">
                                    <!-- En-tête du document -->
                                    <div class="d-flex justify-content-between align-items-center mb-5 facture-header">
                                      <img src="/lg.png" width="180px" alt="Logo" style="max-height: 80px;" />
                                      <div class="text-end">
                                        <h2 style="color: #00AEEF; font-weight: bold;">
                                          ${activeTab === 'devis' ? 'DEVIS' : 'FACTURE'} #${selectedItem.id}
                                        </h2>
                                        <p class="text-muted mb-0">Date d'émission: ${new Date(selectedItem.date).toLocaleDateString('fr-FR')}</p>
                                        <p class="text-muted">Référence: ${selectedItem.id}</p>
                                      </div>
                                    </div>
                                    
                                    <!-- Informations société et client -->
                                    <div class="row mb-5">
                                      <div class="col-6">
                                        <div class="p-3 border rounded bg-light">
                                          <h5 class="border-bottom pb-2 mb-3" style="color: #00AEEF;">Notre Société</h5>
                                          <p class="mb-1"><strong>Oussama Travel</strong></p>
                                          <p class="mb-1"> Résidence Universitaire Targa Ouzemour </p>
                                          <p class="mb-1">Béjaïa 06000</p>
                                         
                                          <p class="mb-1">TVA: FR12345678900</p>
                                          <p class="mb-1">Tél: +213 770 41 94 60/+213 044 22 05 06</p>
                                          <p class="mb-0">Email: Oussamatravel06@gmail.com</p>
                                        </div>
                                      </div>
                                      <div class="col-6">
                                        <div class="p-3 border rounded">
                                          <h5 class="border-bottom pb-2 mb-3" style="color: #00AEEF;">Client</h5>
                                          <p class="mb-1"><strong>${selectedItem.nomPrenom}</strong></p>
                                          ${selectedItem.email ? `<p class="mb-1">Email: ${selectedItem.email}</p>` : ''}
                                          ${selectedItem.telephone ? `<p class="mb-1">Tél: ${selectedItem.telephone}</p>` : ''}
                                          <p class="mb-1">Date: ${new Date(selectedItem.date).toLocaleDateString('fr-FR')}</p>
                                          <p class="mb-0">
                                            Statut: 
                                            <span class="badge bg-${getBadgeColor(selectedItem.statut)}">
                                              ${selectedItem.statut}
                                            </span>
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <!-- Détails du service -->
                                    <h5 class="border-bottom pb-2 mb-3" style="color: #00AEEF;">Détails des prestations</h5>
                                    <div class="mb-5">
                                      <table class="table table-striped table-bordered">
                                        <thead class="table-light">
                                          <tr>
                                            <th style="width: 10%;">Référence</th>
                                            <th style="width: 50%;">Désignation</th>
                                            <th style="width: 20%;" class="text-end">Prix Unitaire</th>
                                            <th style="width: 20%;" class="text-end">Total HT</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td>REF-${selectedItem.id}</td>
                                            <td>
                                              <strong>${selectedItem.dossier}</strong>
                                              <p class="mb-0 text-muted small">${selectedItem.facture?.description || 'Prestation de services'}</p>
                                            </td>
                                            <td class="text-end">${selectedItem.montant}</td>
                                            <td class="text-end">${selectedItem.montant}</td>
                                          </tr>
                                          <tr style="height: 20px;">
                                            <td colspan="4"></td>
                                          </tr>
                                        </tbody>
                                        <tfoot>
                                          <tr>
                                            <th colspan="3" class="text-end">Total HT</th>
                                            <th class="text-end">${selectedItem.montant}</th>
                                          </tr>
                                          <tr>
                                            <th colspan="3" class="text-end">TVA (20%)</th>
                                            <th class="text-end">${(parseFloat(selectedItem.montant) * 0.2).toFixed(2)} DA</th>
                                          </tr>
                                          <tr>
                                            <th colspan="3" class="text-end">Total TTC</th>
                                            <th class="text-end">${(parseFloat(selectedItem.montant) * 1.2).toFixed(2)} DA</th>
                                          </tr>
                                          ${selectedItem.montantRestant && parseFloat(selectedItem.montantRestant) > 0 ? `
                                            <tr>
                                              <th colspan="3" class="text-end">Déjà payé</th>
                                              <th class="text-end">${(parseFloat(selectedItem.montant) - parseFloat(selectedItem.montantRestant)).toFixed(2)} DA</th>
                                            </tr>
                                            <tr>
                                              <th colspan="3" class="text-end">Reste à payer</th>
                                              <th class="text-end">${selectedItem.montantRestant}</th>
                                            </tr>
                                          ` : ''}
                                        </tfoot>
                                      </table>
                                    </div>
                                    
                                    <!-- Conditions de paiement -->
                                    <div class="mb-5">
                                      <h5 class="border-bottom pb-2 mb-3" style="color: #00AEEF;">Conditions de paiement</h5>
                                      <div class="p-3 border rounded bg-light">
                                        <p class="mb-1"><strong>Mode de paiement:</strong> Virement bancaire, carte bancaire ou chèque</p>
                                        <p class="mb-1"><strong>Échéance:</strong> Paiement à effectuer sous 30 jours à compter de la date d'émission</p>
                                        <p class="mb-0"><strong>Coordonnées bancaires:</strong> IBAN: FR76 1234 5678 9101 1121 3141 516 | BIC: ABCDEFGH</p>
                                      </div>
                                    </div>
                                    
                                  
                                  </div>
                                </div>
                                <script>
                                  // Attendre le chargement complet pour imprimer
                                  window.onload = function() { 
                                    setTimeout(function() {
                                      window.print(); 
                                      setTimeout(function() { window.close(); }, 500);
                                    }, 500);
                                  }
                                </script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                      }}
                    >
                      <i className="fas fa-print me-1"></i> Imprimer
                    </button>
                    <button type="button" className="btn btn-secondary me-2" data-bs-dismiss="modal">
                      <i className="fas fa-times me-1"></i> Fermer
                    </button>
                    <button type="button" className="btn btn-success" onClick={handleDownloadPDF}>
                      <FaDownload className="me-1" /> Télécharger PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal fade" id="ModalAddDevis" tabIndex={-1} aria-hidden="true">
          <div className="modal-dialog">
            <form className="modal-content" onSubmit={handleDevisSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">{activeTab === 'devis' ? 'Ajouter un Devis' : 'Créer une Facture'}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                {errorsApi && (
                  <div className="alert alert-danger">{errorsApi}</div>
                )}
                
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Client</label>
                    <select
                      className="form-select"
                      value={nom}
                      onChange={(e) => {
                        const value = e.target.value;
                        setnom(value);
                        
                        // Si un client est sélectionné, pré-remplir les champs email et téléphone
                        if (value) {
                          const clientId = parseInt(value.split('-')[0]);
                          const selectedClient = clients.find(c => c.id === clientId);
                          if (selectedClient) {
                            // Pré-remplir l'email et le téléphone si disponibles
                            if (selectedClient.email) setemail(selectedClient.email);
                            if (selectedClient.telephone) settelephone(selectedClient.telephone);
                          }
                        }
                      }}
                      required
                    >
                      <option value="">-- Sélectionnez un client --</option>
                      {clients.map(client => (
                        <option key={client.id} value={`${client.id}-${client.nom} ${client.prenom}`}>
                          {client.nom} {client.prenom}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">Sélectionnez un client dans la liste</small>
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setemail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Téléphone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={telephone}
                      onChange={(e) => settelephone(e.target.value)}
                      placeholder="Ex: +33 1 23 45 67 89"
                      required
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Titre/Motif</label>
                    <input
                      type="text"
                      className="form-control"
                      value={motif}
                      onChange={(e) => setmotif(e.target.value)}
                      placeholder="Ex: Réservation billet d'avion Paris-Madrid"
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Montant HT (DA)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={prix}
                      onChange={(e) => {
                        setprix(e.target.value);
                        // Calculer le reste à payer
                        const total = parseFloat(e.target.value) || 0;
                        const verse = Versepayment || 0;
                        setrestPrix((total - verse).toString());
                      }}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Versement initial (DA)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={Versepayment || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        setVersepayment(val);
                        // Calculer le reste à payer
                        const total = parseFloat(prix) || 0;
                        const verse = val || 0;
                        setrestPrix((total - verse).toString());
                      }}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Reste à Payer (DA)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={restPrix}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                <button type="submit" className="btn btn-primary">
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Chargement...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="modal fade" id="modalEditeDevis" tabIndex={-1} aria-hidden="true">
          <div className="modal-dialog">
            <div className="modal-content">

              <div className="modal-header">
                <h5 className="modal-title">Modification {activeTab === 'devis' ? 'du Devis' : 'de la Facture'}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>

              <div className="modal-body">
                <h2 className='text-center'>Total : {selectedItem?.facture?.montant_ht || 0} DA</h2>
                <p className='text-center text-muted mb-4'>{selectedItem?.facture?.titre || ''}</p>
                
                {error && (
                  <div className="alert alert-danger mb-3">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}
                
                <div className="mb-3">
                  <label className="form-label">Montant versé (DA)</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    value={Versepayment || ''}
                    onChange={(e) => {
                      // Gérer le cas de champ vide
                      const inputValue = e.target.value.trim();
                      const value = inputValue === '' ? 0 : parseFloat(inputValue);
                      
                      if (!isNaN(value)) {
                        setVersepayment(value);
                        // Calculer le reste à payer en fonction du montant total de la facture
                        if (selectedItem?.facture?.montant_ht) {
                          const reste = selectedItem.facture.montant_ht - value;
                          setRestepayment(reste >= 0 ? reste : 0);
                        }
                      }
                    }}
                  />
                  <small className="form-text text-muted">
                    Entrez le montant total versé par le client (et non un versement supplémentaire)
                  </small>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Reste à payer (DA)</label>
                  <input
                    type="number"
                    className="form-control bg-light"
                    value={Restepayment !== null ? Restepayment : ''}
                    readOnly
                  />
                  {Restepayment !== null && Versepayment !== null && selectedItem?.facture?.montant_ht && (
                    <small className="form-text">
                      {Versepayment > 0 ? (
                        <span className={Restepayment === 0 ? "text-success" : "text-primary"}>
                          {Restepayment === 0 ? "Entièrement payé" : `Paiement partiel (${Math.round((Versepayment / selectedItem.facture.montant_ht) * 100)}%)`}
                        </span>
                      ) : (
                        <span className="text-danger">Aucun paiement effectué</span>
                      )}
                    </small>
                  )}
                </div>
              </div>

              <div className="modal-footer d-flex justify-content-between">
                <button 
                  type="button" 
                  className="btn btn-sm btn-link text-muted"
                  onClick={() => {
                    // Afficher les détails des calculs dans la console pour le débogage
                    console.table({
                      'ID de facture': IdToUpdate,
                      'Montant total HT': selectedItem?.facture?.montant_ht,
                      'Montant versé': Versepayment,
                      'Reste à payer': Restepayment,
                      'Somme (versé + reste)': (Versepayment || 0) + (Restepayment || 0)
                    });
                  }}
                >
                
                </button>
                <div>
                  <button type="button" className="btn btn-secondary me-2" data-bs-dismiss="modal">Fermer</button>
                  <button type="button" className="btn btn-primary" onClick={UpdatedDevis}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Mise à jour...
                      </>
                    ) : (
                      'Modifier'
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>


      </div>
      {ShowModalVerify && (
        <div className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Confirmation de suppression
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowModalVerify(false)}
                  aria-label="Fermer"
                ></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <CiTrash size={50} className="text-danger" />
                  </div>
                  <h5>Êtes-vous sûr de vouloir supprimer {activeTab === 'devis' ? 'ce devis' : 'cette facture'} ?</h5>
                  <p className="text-muted">
                    Cette action est irréversible et supprimera définitivement {activeTab === 'devis' ? 'ce devis' : 'cette facture'} 
                    et toutes les données associées.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModalVerify(false)}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={DeleteVoyage}
                  // onClick={()=>deleteFacture(IdToDelete as any)}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Suppression...
                    </>
                  ) : (
                    'Confirmer la suppression'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default Devis;