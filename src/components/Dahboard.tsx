import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { PiStudentBold } from 'react-icons/pi';
import { TbWorldCheck } from 'react-icons/tb';
import "../App.css";

// Configuration de l'API
const API = axios.create({
  baseURL: 'https://backend1-lz19.onrender.com', // URL du backend
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token à chaque requête
API.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('Aucun token trouvé dans localStorage');
    }
    return config;
  },
  error => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs d'authentification
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error('Erreur d\'authentification:', error.response.data);
      // Si le token est invalide ou expiré
      localStorage.removeItem('authToken');
      // Rediriger vers la page de connexion
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

type FormData = {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  isComplete: boolean;
  travelEmail: string;
  password: string;
  program: string;
  destination: string;
  visaType: string;
  paymentStatus: string;
};

type TravelData = {
  type: string;
  nom: string;
  pay: string;
  date: string;
  date_retour?: string;
  nombre_personnes?: number;
  motif_voyage?: string;
  statut?: string;
  prix_total?: number;
  acompte_verse?: number;
  reste_a_payer?: number;
};

const Dashboard = () => {
  // Vérifier la validité du token lors du chargement du composant
  const verifyToken = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('Aucun token d\'authentification trouvé');
      seterrorsApi('Token d\'authentification manquant. Veuillez vous reconnecter.');
      return false;
    }

    try {
      // Vérifier si le token est valide en faisant une requête au backend
      await API.get('/api/auth/verify-token');
      return true;
    } catch (error: any) {
      console.error('Token invalide:', error);
      seterrorsApi('Token invalide. Veuillez vous reconnecter.');
      return false;
    }
  };

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    isComplete: false,
    travelEmail: '',
    password: '',
    program: '',
    destination: '',
    visaType: '',
    paymentStatus: ''
  });

  const [travelData, setTravelData] = useState<TravelData>({
    type: '',
    nom: '',
    pay: '',
    date: ''
  });

  const [errorsApi, seterrorsApi] = useState('');
  const [errors, setErrors] = useState<Partial<FormData & TravelData & { submit: string }>>({});

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name) newErrors.name = 'Nom requis';
    if (!formData.email) newErrors.email = 'Email requis';
    if (!formData.phone) newErrors.phone = 'Téléphone requis';
    if (!formData.visaType) newErrors.visaType = 'Type de visa requis';
    if (!formData.paymentStatus) newErrors.paymentStatus = 'Statut de paiement requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateTravelForm = (): boolean => {
    const newErrors: Partial<TravelData> = {};

    if (!travelData.type) newErrors.type = 'Type requis';
    if (!travelData.nom) newErrors.nom = 'Nom & Prénom requis';
    if (!travelData.pay) newErrors.pay = 'Pays requis';
    if (!travelData.date) newErrors.date = 'Date requise';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDossierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        seterrorsApi('');
        const token = localStorage.getItem('authToken');

        // Formatage des noms et prénoms
        let nom = '';
        let prenom = '';
        if (formData.name.includes(' ')) {
          const nameParts = formData.name.split(' ');
          nom = nameParts[0];
          prenom = nameParts.slice(1).join(' ');
        } else {
          nom = formData.name;
          prenom = '';
        }

        // Préparation des données pour l'API clients
        const clientData = {
          nom,
          prenom,
          email: formData.email,
          telephone: formData.phone,
          type_visa: formData.visaType,
          etat_dossier: formData.isComplete ? 'En cours de traitement' : 'Dossier soumis',
          email_creer: formData.travelEmail,
          mot_de_passe: formData.password,
          universite_destination: formData.program || null,
          pays_destination: formData.destination,
          date_naissance: formData.birthDate || null,
          statut: formData.isComplete ? 'en_cours' : 'nouveau',
          payement: formData.paymentStatus
        };

        // Requête API pour créer un nouveau client
        const response = await API.post('/api/clients', clientData);

        // Afficher un message de succès temporaire
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 3000);

        // Si la création du client réussit, téléchargement des documents
        if (response.data && response.data.data && response.data.data.id) {
          const clientId = response.data.data.id;
          
          if (selectedFiles.length > 0) {
            const formDataToSend = new FormData();
            selectedFiles.forEach(file => {
              formDataToSend.append('documents', file);
            });

            try {
              // Requête API pour télécharger les documents
              await API.post(`/api/clients/${clientId}/upload-multiple-documents`, formDataToSend, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                  'Authorization': `Bearer ${token}`
                }
              });
            } catch (uploadError: any) {
              console.error('Erreur lors du téléchargement des documents:', uploadError);
              // Ne pas bloquer le processus si le téléchargement de documents échoue
            }
          }
        }        
        // Réinitialiser le formulaire
        setFormData({
          name: '',
          email: '',
          phone: '',
          birthDate: '',
          isComplete: false,
          travelEmail: '',
          password: '',
          program: '',
          destination: '',
          visaType: '',
          paymentStatus: ''
        });
        setSelectedFiles([]);
        
        // Actualiser les données
        fetchData();
        
        // Fermer le modal
        const modal = document.getElementById('dossierModal');
        if (modal) {
          // @ts-ignore
          const bsModal = window.bootstrap && window.bootstrap.Modal ? window.bootstrap.Modal.getInstance(modal) : null;
          bsModal && bsModal.hide();
        }
      } catch (error: any) {
        console.error('Erreur lors de la création du client:', error);
        seterrorsApi(
          error.response?.data?.message || 
          error.response?.data?.error || 
          'Erreur lors de la création du client. Veuillez réessayer.'
        );
      }
    }
  };

  const handleTravelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateTravelForm()) {
      try {
        seterrorsApi('');
        const token = localStorage.getItem('authToken');
        
        // Trouver l'ID du client basé sur le nom complet sélectionné
        const clientName = travelData.nom.trim();
        const client = clients.find(c => `${c.nom} ${c.prenom}`.toLowerCase() === clientName.toLowerCase());
        
        if (!client) {
          throw new Error('Client non trouvé. Veuillez sélectionner un client existant.');
        }
        
        // Format de date pour l'API (YYYY-MM-DD)
        let formattedDateDepart = travelData.date;
        if (formattedDateDepart && !formattedDateDepart.includes('-')) {
          const dateParts = formattedDateDepart.split('/');
          if (dateParts.length === 3) {
            formattedDateDepart = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          }
        }
        
        // Calcul du reste à payer
        const prixTotal = parseFloat(travelData.prix_total?.toString() || '0');
        const acompteVerse = parseFloat(travelData.acompte_verse?.toString() || '0');
        const resteAPayer = Math.max(0, prixTotal - acompteVerse);
        
        // Préparation des données pour l'API dossiers-voyage
        const voyageData = {
          client_id: client.id,
          type_voyage: travelData.type,
          destination: travelData.pay,
          date_depart: formattedDateDepart,
          date_retour: travelData.date_retour || null,
          nombre_personnes: travelData.nombre_personnes || 1,
          motif_voyage: travelData.motif_voyage || 'Voyage',
          prix_total: prixTotal || 0,
          acompte_verse: acompteVerse || 0,
          reste_a_payer: resteAPayer,
          statut: travelData.statut || 'en_cours'
        };

        // Requête API pour créer un nouveau dossier de voyage
        const response = await API.post('/api/dossiers-voyage', voyageData);
        
        // Afficher un message de succès temporaire
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 3000);
        
        // Réinitialiser le formulaire
        setTravelData({
          type: '',
          nom: '',
          pay: '',
          date: '',
          date_retour: '',
          nombre_personnes: 1,
          motif_voyage: '',
          statut: '',
          prix_total: undefined,
          acompte_verse: undefined,
          reste_a_payer: undefined
        });
        
        // Actualiser les données
        fetchData();
        
        // Fermer le modal
        const modal = document.getElementById('voyageModal');
        if (modal) {
          // @ts-ignore
          const bsModal = window.bootstrap && window.bootstrap.Modal ? window.bootstrap.Modal.getInstance(modal) : null;
          bsModal && bsModal.hide();
        }
      } catch (error: any) {
        console.error('Erreur lors de la création du voyage:', error);
        seterrorsApi(
          error.response?.data?.message || 
          error.response?.data?.error || 
          error.message || 
          'Erreur lors de l\'envoi du voyage. Veuillez réessayer.'
        );
      }
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type, value, files } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === "file" && name === "dossier") {
      const fileList = files ? Array.from(files) : [];
      setSelectedFiles(fileList);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));

      // Réinitialiser les erreurs lorsqu'un champ est modifié
      if (errors[name as keyof typeof errors]) {
        setErrors(prev => ({ ...prev, [name]: undefined }));
      }
    }
  };

  const handleTravelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTravelData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fonction pour traduire les statuts techniques en libellés plus humains
  const translateStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      // Statuts des dossiers voyage
      case 'en_cours':
        return 'En cours';
      case 'confirme':
        return 'Confirmé';
      case 'termine':
        return 'Terminé';
      case 'annule':
        return 'Annulé';
        
      // Statuts des clients/dossiers étudiants
      case 'nouveau':
        return 'Nouveau';
      case 'incomplet':
        return 'Incomplet';
      case 'inscrit':
        return 'Inscrit';
      case 'admission_recu':
        return 'Admission reçue';
      case 'refus':
        return 'Refusé';
      case 'accepter':
        return 'Accepté';
      case 'partie_visa':
        return 'Partie visa';
      case 'terminer':
        return 'Terminé';
        
      // États des dossiers
      case 'dossier soumis':
        return 'Soumis';
      case 'en cours de traitement':
        return 'En traitement';
      case 'traite en cours de reponse':
        return 'En attente de réponse';
      case 'passeport prêt à être retiré':
        return 'Passeport prêt';
        
      // Statuts de paiement
      case 'payer':
      case 'paye':
        return 'Payé';
      case 'pas_payer':
      case 'non_paye':
        return 'Non payé';
      case 'partielle':
      case 'partiel':
        return 'Partiellement payé';
        
      default:
        return status || 'Inconnu';
    }
  };
  
  // Fonction pour déterminer la classe CSS en fonction du statut
  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      // Statuts des dossiers voyage
      case 'en_cours':
        return 'bg-primary';
      case 'confirme':
        return 'bg-success';
      case 'termine':
        return 'bg-info';
      case 'annule':
        return 'bg-danger';
        
      // Statuts des clients/dossiers étudiants  
      case 'nouveau':
        return 'bg-success';
      case 'incomplet':
        return 'bg-danger';
      case 'inscrit':
        return 'bg-primary';
      case 'admission_recu':
        return 'bg-info';
      case 'refus':
        return 'bg-danger';
      case 'accepter':
        return 'bg-success';
      case 'partie_visa':
        return 'bg-primary';
      case 'terminer':
        return 'bg-info';
        
      // États des dossiers
      case 'dossier soumis':
        return 'bg-success';
      case 'en cours de traitement':
        return 'bg-primary';
      case 'traite en cours de reponse':
        return 'bg-warning';
      case 'passeport prêt à être retiré':
        return 'bg-info';
        
      // Statuts de paiement
      case 'payer':
      case 'paye':
        return 'bg-success';
      case 'pas_payer':
      case 'non_paye':
        return 'bg-danger';
      case 'partielle':
      case 'partiel':
        return 'bg-warning text-dark';
      
      default:
        return 'bg-secondary';
    }
  };


  // États pour les données dynamiques
  const [clients, setClients] = useState<any[]>([]);
  const [dossiersVoyage, setDossiersVoyage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [clientStatusFilter, setClientStatusFilter] = useState<string>('all');

  // Statistiques
  const [stats, setStats] = useState({
    clients: 0,
    dossiers: 0,
    voyages: 0
  });

  // Fonction pour rafraîchir le token d'authentification
  const refreshToken = async () => {
    try {
      const response = await API.post('/api/auth/refresh-token', {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.data && response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token:', error);
      return false;
    }
  };
  
  // Fonction pour charger les données
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        seterrorsApi('Aucun token d\'authentification trouvé');
        setLoading(false);
        return;
      }
            
      // Récupération des clients
      const clientsResponse = await API.get('/api/clients');
      
      // Extraction des données clients selon la structure de réponse du backend
      let clientsData = [];
      if (clientsResponse.data && clientsResponse.data.success && Array.isArray(clientsResponse.data.data)) {
        clientsData = clientsResponse.data.data;
      } else {
        console.warn('Format de réponse clients inattendu:', clientsResponse.data);
      }
      
      setClients(clientsData);
      
      // Récupération des dossiers de voyage
      const voyagesResponse = await API.get('/api/dossiers-voyage');
      
      // Extraction des données voyages selon la structure de réponse du backend
      let voyagesData = [];
      if (voyagesResponse.data && voyagesResponse.data.success && Array.isArray(voyagesResponse.data.data)) {
        voyagesData = voyagesResponse.data.data;
      } else {
        console.warn('Format de réponse voyages inattendu:', voyagesResponse.data);
      }
      
      setDossiersVoyage(voyagesData);
      
      // Mise à jour des statistiques
      setStats({
        clients: clientsData.length,
        dossiers: clientsData.filter((c: any) => 
          c.etat_dossier && 
          (c.etat_dossier !== 'incomplet') && 
          (c.etat_dossier !== 'non_paye')
        ).length,
        voyages: voyagesData.length
      });
      
      setLoading(false);
      setRefreshing(false);
      
      setRefreshSuccess(true);
      setTimeout(() => {
        setRefreshSuccess(false);
      }, 3000);
            
    } catch (error: any) {
      console.error('Erreur lors de la récupération des données:', error);
      
      // Afficher plus de détails pour le débogage
      if (error.response) {
        // La requête a été faite et le serveur a répondu avec un code d'état
        // qui n'est pas dans la plage 2xx
        console.error('Statut de l\'erreur:', error.response.status);
        console.error('En-têtes de réponse:', error.response.headers);
        console.error('Données de réponse:', error.response.data);
        
        if (error.response.status === 404) {
          console.error('URL qui a causé l\'erreur 404:', error.config?.url);
        }
      } else if (error.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        console.error('Aucune réponse reçue. La requête a été faite mais le serveur ne répond pas.');
        console.error('Détails de la requête:', error.request);
      } else {
        // Une erreur s'est produite lors de la configuration de la requête
        console.error('Erreur de configuration de la requête:', error.message);
      }
      
      let errorMessage = 'Erreur lors de la récupération des données. Veuillez réessayer.';
      
      if (error.response?.status === 404) {
        errorMessage = `Route non trouvée: ${error.config?.url}. Vérifiez que le backend est en cours d'exécution et que les routes sont correctes.`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      seterrorsApi(errorMessage);
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction pour rafraîchir les données
  const refreshData = () => {
    setRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    const initializeData = async () => {
      // Récupérer le token depuis le localStorage
      const token = localStorage.getItem('authToken');
      
      // Si aucun token n'est trouvé
      if (!token) {
        seterrorsApi('Token d\'authentification manquant. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }
      
      // Vérifier que le token est au format JWT valide (structure de base)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        seterrorsApi('Format de token invalide. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }
      
      try {
        await fetchData();
      } catch (error: any) {
        console.error('Erreur lors de l\'initialisation des données:', error);
        if (error.message.includes('Token invalide')) {
          seterrorsApi('Token invalide. Veuillez vous reconnecter.');
        }
      }
    };
    
    initializeData();
  }, []);


  // Afficher un indicateur de chargement global
  if (loading && !refreshing) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="mt-2">Chargement des données du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="cont container mt-4 overflow-x-auto">
      {/* Affichage des erreurs API */}
      {errorsApi && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <strong>Erreur!</strong> {errorsApi}
          {errorsApi.includes('Token') && (
            <div className="mt-2">
              <button 
                className="btn btn-sm btn-outline-danger me-2" 
                onClick={() => window.location.href = '/login'}
              >
                Se reconnecter
              </button>
              <button 
                className="btn btn-sm btn-outline-secondary" 
                onClick={async () => {
                  const success = await refreshToken();
                  if (success) {
                    seterrorsApi('');
                    fetchData();
                  }
                }}
              >
                Essayer de rafraîchir le token
              </button>
            </div>
          )}
          <button type="button" className="btn-close" onClick={() => seterrorsApi('')}></button>
        </div>
      )}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <h1>Agence de voyage</h1>
          <button 
            className="btn btn-outline-primary" 
            onClick={refreshData} 
            disabled={loading || refreshing}
          >
            {refreshing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Rafraîchissement...
              </>
            ) : (
              <>Rafraîchir</>
            )}
          </button>
        </div>
        
        {refreshSuccess && (
          <div className="alert alert-success alert-dismissible fade show mt-2" role="alert">
            <i className="bi bi-check-circle-fill me-2"></i>
            Données mises à jour avec succès !
            <button type="button" className="btn-close" onClick={() => setRefreshSuccess(false)}></button>
          </div>
        )}
      </div>

      {/* Cartes statistiques */}
      <div className="row row-cols-1 row-cols-md-3 g-4 mb-4">
        {[
          { icon: <FaUser size={34} className='m-auto mt-2' />, title: "Clients", value: stats.clients },
          { icon: <PiStudentBold size={34} className='m-auto mt-2' />, title: "Dossiers", value: stats.dossiers },
          { icon: <TbWorldCheck size={34} className='m-auto mt-2' />, title: "Voyages", value: stats.voyages }
        ].map((item, index) => (
          <div className="col" key={index}>
            <div className="card h-100">
              <div className="card-body text-center">
                {item.icon}
                <h5 className="card-title mt-2">{item.title}</h5>
                <p className="card-text fs-4">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Section Dossiers et Voyages */}
      <div className="row g-4">
        <div className="col-12 col-md-6 ">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Clients récents</h5>
                <select 
                  className="form-select form-select-sm" 
                  style={{ width: 'auto' }}
                  value={clientStatusFilter}
                  onChange={(e) => setClientStatusFilter(e.target.value)}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="nouveau">Nouveaux</option>
                  <option value="en_cours">En cours</option>
                  <option value="incomplet">Incomplets</option>
                  <option value="accepter">Acceptés</option>
                  <option value="refus">Refusés</option>
                  <option value="dossier soumis">Soumis</option>
                  <option value="en cours de traitement">En traitement</option>
                  <option value="partie_visa">Partie Visa</option>
                  <option value="terminer">Terminé</option>
                  <option value="admission_recu">Admission Reçue</option>
                </select>
              </div>
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <p className="mt-2 text-muted">Chargement des clients...</p>
                </div>
              ) : clients.length > 0 ? (
                (() => {
                  const filteredClients = clients.filter(client => 
                    clientStatusFilter === 'all' || (client.statut === clientStatusFilter)
                     || (client.etat_dossier === clientStatusFilter)   
                  );
                  
                  if (filteredClients.length === 0) {
                    return <p className="text-muted text-center">Aucun client avec le statut "{translateStatus(clientStatusFilter)}"</p>;
                  }
                  
                  return filteredClients
                    .slice(0, 5)
                    .map((client, index, filteredArray) => (
                      <React.Fragment key={client.id || index}>
                        <div className='d-flex justify-content-between mb-2'>
                          <div>
                            <p className="card-text m-0">{client.nom} {client.prenom}</p>
                            <small className="text-muted">{client.email || 'Pas d\'email'}</small>
                          </div>
                          <span className={`badge ${getStatusClass(client.etat_dossier || client.statut)} px-2 py-1 mb-3 mt-2`}>
                            {translateStatus(client.statut || client.etat_dossier)}
                          </span>
                        </div>
                        {index < filteredArray.length - 1 && <hr />}
                      </React.Fragment>
                    ));
                })()
              ) : (
                <p className="text-muted text-center">Aucun client trouvé</p>
              )}
           
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">Voyages</h5>
              <div className="table-responsive overflow-x-scroll">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Client</th>
                      <th>Destination</th>
                      <th>Date de départ</th>
                      <th>Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-3">
                          <div className="spinner-border spinner-border-sm text-primary" role="status">
                            <span className="visually-hidden">Chargement...</span>
                          </div>
                          <p className="mt-2 text-muted">Chargement des voyages...</p>
                        </td>
                      </tr>
                    ) : dossiersVoyage.length > 0 ? (
                      dossiersVoyage.slice(0, 5).map((voyage) => (
                        <tr key={voyage.id}>
                          <td>
                            <span className="badge rounded-pill text-bg-light">
                              {voyage.type_voyage === 'tourisme' ? 'Tourisme' : 
                               voyage.type_voyage === 'affaires' ? 'Affaires' : 
                               voyage.type_voyage === 'etudes' ? 'Études' : 
                               voyage.type_voyage === 'medical' ? 'Médical' :
                               voyage.type_voyage === 'pelerinage' ? 'Pèlerinage' :
                               voyage.type_voyage}
                            </span>
                          </td>
                          <td>{voyage.client?.nom} {voyage.client?.prenom}</td>
                          <td>{voyage.destination}</td>
                          <td>
                            {voyage.date_depart ? 
                              new Date(voyage.date_depart).toLocaleDateString('fr-FR') : 
                              'Non définie'}
                          </td>
                          <td>
                            {voyage.prix_total ? 
                              new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(voyage.prix_total) : 
                              '0,00 DA'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center text-muted">Aucun voyage trouvé</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            
            </div>
          </div>
        </div>
      </div>

      {/* Modal Dossier */}
      <div className="modal fade" id="dossierModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <form className="modal-content" onSubmit={handleDossierSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Ajouter un dossier</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body row g-3">
              {[
                { name: 'name', label: 'Nom & Prénom', type: 'text', placeholder: 'Saisissez le nom complet...' },
                { name: 'email', label: 'Email personnel', type: 'email', placeholder: 'Saisissez l\'email...' },
                { name: 'phone', label: 'Téléphone', type: 'tel', placeholder: 'Saisissez le téléphone...' },
                { name: 'birthDate', label: 'Date de naissance', type: 'date' },
                { name: 'travelEmail', label: 'Email de voyage', type: 'email', placeholder: 'Saisissez l\'email de voyage...' },
                { name: 'password', label: 'Mot de passe', type: 'password', placeholder: 'Saisissez le mot de passe...' },
                { name: 'program', label: 'Programme choisi', type: 'text', placeholder: 'Saisissez le programme...' },
                { name: 'destination', label: 'Destination', type: 'text', placeholder: 'Saisissez la destination...' },
                { name: 'dossier', label: 'Dossier', type: 'file' },
                { name: 'isComplete', label: 'Dossier complet ?', type: 'checkbox' },
              ].map((field) => (
                <div className="col-md-6" key={field.name}>
                  <label className="form-label">{field.label}</label>
                  {field.name === "dossier" && selectedFiles.length > 0 && (
                    <ul className="list-unstyled mb-2">
                      {selectedFiles.map((file, index) => (
                        <li key={index} className="text-muted small">📄 {file.name}</li>
                      ))}
                    </ul>
                  )}
                  <input
                    name={field.name}
                    type={field.type}
                    className={`form-control ${errors[field.name as keyof typeof errors] ? 'is-invalid' : ''} ${field.name === "isComplete" ? 'form-check-input' : ''}`}
                    placeholder={field.placeholder}
                    value={
                      field.type !== 'file' && field.type !== 'checkbox'
                        ? (formData[field.name as keyof FormData] as string)
                        : undefined
                    }
                    checked={field.type === 'checkbox' ? formData.isComplete : undefined}
                    onChange={handleInputChange}
                    required={field.type !== 'checkbox'}
                  />
                  {errors[field.name as keyof typeof errors] && (
                    <div className="invalid-feedback">
                      {errors[field.name as keyof typeof errors]}
                    </div>
                  )}
                </div>
              ))}
              <div className="col-6">
                <label className="form-label">Type de visa</label>
                <select
                  name="visaType"
                  className={`form-select ${errors.visaType ? 'is-invalid' : ''}`}
                  value={formData.visaType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">-- Sélectionnez un type de visa --</option>
                  <option value="tourisme">Visa Tourisme</option>
                  <option value="affaires">Visa Affaires</option>
                  <option value="études">Visa Études</option>
                  <option value="transit">Visa Transit</option>
                  <option value="travail">Visa Travail</option>
                  <option value="famille">Visa Regroupement familial</option>
                  <option value="soins">Visa Médical / Soins</option>
                </select>
                {errors.visaType && (
                  <div className="invalid-feedback">
                    {errors.visaType}
                  </div>
                )}
              </div>
              <div className="col-6">
                <label className="form-label">Statut de paiement</label>
                <select
                  name="paymentStatus"
                  className={`form-select ${errors.paymentStatus ? 'is-invalid' : ''}`}
                  value={formData.paymentStatus}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">-- Sélectionnez un statut --</option>
                  <option value="paye">Payé</option>
                  <option value="non_paye">Non payé</option>
                  <option value="partiel">Partiel</option>
                </select>
                {errors.paymentStatus && (
                  <div className="invalid-feedback">
                    {errors.paymentStatus}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal Voyage */}
      <div className="modal fade" id="voyageModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <form className="modal-content" onSubmit={handleTravelSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Nouveau voyage</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body row g-3">
              <div className="col-lg-6 col-sm-12">
                <label className="form-label">Type de voyage</label>
                <select
                  name="type"
                  className={`form-select ${errors.type ? 'is-invalid' : ''}`}
                  value={travelData.type}
                  onChange={handleTravelChange}
                  required
                >
                  <option value="">-- Sélectionnez un type de voyage --</option>
                  <option value="tourisme">Tourisme</option>
                  <option value="affaires">Affaires</option>
                  <option value="etudes">Études</option>
                  <option value="medical">Médical</option>
                  <option value="pelerinage">Pèlerinage</option>
                </select>
                {errors.type && (
                  <div className="invalid-feedback">
                    {errors.type}
                  </div>
                )}
              </div>
              
              <div className="col-lg-6 col-sm-12">
                <label className="form-label">Client</label>
                <select
                  name="nom"
                  className={`form-select ${errors.nom ? 'is-invalid' : ''}`}
                  value={travelData.nom}
                  onChange={handleTravelChange}
                  required
                >
                  <option value="">-- Sélectionnez un client --</option>
                  {clients.map(client => (
                    <option key={client.id} value={`${client.nom} ${client.prenom}`}>
                      {client.nom} {client.prenom}
                    </option>
                  ))}
                </select>
                {errors.nom && (
                  <div className="invalid-feedback">
                    {errors.nom}
                  </div>
                )}
              </div>
              
              <div className="col-md-6">
                <label className="form-label">Destination</label>
                <input
                  name="pay"
                  type="text"
                  className={`form-control ${errors.pay ? 'is-invalid' : ''}`}
                  placeholder="Saisissez la destination..."
                  value={travelData.pay}
                  onChange={handleTravelChange}
                  required
                />
                {errors.pay && (
                  <div className="invalid-feedback">{errors.pay}</div>
                )}
              </div>
              
              <div className="col-md-6">
                <label className="form-label">Date de départ</label>
                <input
                  name="date"
                  type="date"
                  className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                  value={travelData.date}
                  onChange={handleTravelChange}
                  required
                />
                {errors.date && (
                  <div className="invalid-feedback">{errors.date}</div>
                )}
              </div>
              
              <div className="col-md-6">
                <label className="form-label">Date de retour</label>
                <input
                  name="date_retour"
                  type="date"
                  className="form-control"
                  onChange={handleTravelChange}
                />
              </div>
              
              <div className="col-md-6">
                <label className="form-label">Nombre de personnes</label>
                <input
                  name="nombre_personnes"
                  type="number"
                  className="form-control"
                  min="1"
                  placeholder="1"
                  onChange={handleTravelChange}
                />
              </div>
              
              <div className="col-md-12">
                <label className="form-label">Motif du voyage</label>
                <textarea
                  name="motif_voyage"
                  className="form-control"
                  placeholder="Précisez le motif du voyage..."
                  onChange={handleTravelChange}
                  rows={2}
                ></textarea>
              </div>
              
              <div className="col-md-6">
                <label className="form-label">Prix total (DA)</label>
                <input
                  name="prix_total"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  placeholder="Prix total du voyage"
                  onChange={handleTravelChange}
                />
              </div>
              
              <div className="col-md-6">
                <label className="form-label">Acompte versé (DA)</label>
                <input
                  name="acompte_verse"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  placeholder="Acompte versé"
                  onChange={handleTravelChange}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;