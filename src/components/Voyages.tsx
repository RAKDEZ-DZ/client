import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { CiEdit, CiTrash } from 'react-icons/ci';
import { FaEye } from 'react-icons/fa';
import '../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Détection de l'environnement pour l'URL de l'API
const getAPIBaseURL = () => {
  // Utiliser l'adresse IP spécifiée
  return 'https://backend1-lz19.onrender.com';
};

// Configuration de l'API
const API = axios.create({
  baseURL: getAPIBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  },
  // Augmenter le timeout par défaut
  timeout: 15000, // 15 secondes
});


// Intercepteur pour ajouter le token d'authentification à toutes les requêtes
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  console.error('Erreur dans l\'intercepteur de requête:', error);
  return Promise.reject(error);
});

// Intercepteur pour la gestion des réponses
API.interceptors.response.use(
  (response) => {
    if (Array.isArray(response.data)) {
      if (response.data.length > 0) {
      }
    }
    return response;
  },
  (error) => {
    console.error('Erreur API:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        URL: error.config?.url
      });
    } else if (error.request) {
      console.error('Aucune réponse reçue:', error.request);
    }
    return Promise.reject(error);
  }
);

// Type correspondant au modèle DossierVoyage du backend
type DossierVoyage = {
  id: number;
  client_id: number;
  client?: {
    nom: string;
    prenom: string;
    email?: string;
    telephone?: string;
  };
  type_voyage: string;
  destination: string;
  date_depart: string;
  date_retour?: string;
  nombre_personnes: number;
  motif_voyage: string;
  statut: string;
  prix_total: number | null | undefined;
  acompte_verse: number | null | undefined;
  reste_a_payer: number | null | undefined;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

// Type pour le formulaire d'ajout/modification de dossier de voyage
type TravelFormData = {
  client_id: number;
  type_voyage: string;
  destination: string;
  date_depart: string;
  date_retour: string;
  nombre_personnes: number;
  motif_voyage: string;
  statut: string;
  prix_total: number;
  acompte_verse: number;
  reste_a_payer: number;
  notes: string;
};

// Type pour représenter un client
type Client = {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
};

const Voyages = () => {
  // État pour les dossiers de voyage
  const [voyages, setVoyages] = useState<DossierVoyage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredVoyages, setFilteredVoyages] = useState<DossierVoyage[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterTypeVoyage, setFilterTypeVoyage] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [clients, setClients] = useState<Client[]>([]);  // Nouvel état pour stocker la liste des clients

  // État pour le formulaire
  const [travelFormData, setTravelFormData] = useState<TravelFormData>({
    client_id: 0,
    type_voyage: '',
    destination: '',
    date_depart: '',
    date_retour: '',
    nombre_personnes: 1,
    motif_voyage: '',
    statut: 'en_cours',
    prix_total: 0,
    acompte_verse: 0,
    reste_a_payer: 0,
    notes: ''
  });

  // États pour la gestion de l'interface
  const [errors, setErrors] = useState<Partial<TravelFormData>>({});
  const [errorsApi, setErrorsApi] = useState('');
  const [ShowModalVerify, setShowModalVerify] = useState(false);
  const [IdToDelete, setIdToDelete] = useState<number | null>(null);
  const [IdToUpdate, setIdToUpdate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [selectedVoyage, setSelectedVoyage] = useState<DossierVoyage | null>(null);

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Partial<TravelFormData> = {};

    // if (!travelFormData.client_id) newErrors.client_id = "Client requis";
    if (!travelFormData.type_voyage) newErrors.type_voyage = 'Type de voyage requis';
    if (!travelFormData.destination) newErrors.destination = 'Destination requise';
    if (!travelFormData.date_depart) newErrors.date_depart = 'Date de départ requise';
    if (!travelFormData.motif_voyage) newErrors.motif_voyage = 'Motif du voyage requis';
    // if (!travelFormData.prix_total) newErrors.prix_total = "Prix total requis";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getVoyages = async () => {
    try {
      const response = await API.get('/api/dossiers-voyage', {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data) {
        try {
          let voyagesData: DossierVoyage[] = [];

          if (response.data.success && response.data.data && Array.isArray(response.data.data)) {
            voyagesData = response.data.data;
          } else if (Array.isArray(response.data)) {
            voyagesData = response.data;
          } else if (typeof response.data === 'object') {
            // Essayer de trouver le tableau dans les propriétés de l'objet
            const possibleArrayKeys = ['voyages', 'data', 'items', 'results'];
            const arrayKey = possibleArrayKeys.find(key => Array.isArray(response.data[key]));

            if (arrayKey) {
              voyagesData = response.data[arrayKey];
            } else {
              voyagesData = [];
            }
          } else {
            voyagesData = [];
          }

          // S'assurer que toutes les valeurs requises sont définies
          const safeVoyages = voyagesData.map(voyage => ({
            ...voyage,
            prix_total: voyage.prix_total || 0,
            acompte_verse: voyage.acompte_verse || 0,
            reste_a_payer: voyage.reste_a_payer || 0,
            statut: voyage.statut || 'en_cours'
          }));

          setVoyages(safeVoyages);
          setFilteredVoyages(safeVoyages); // Initialiser les voyages filtrés
        } catch (error) {
          console.error('Erreur lors du traitement des données de voyage:', error);
          setVoyages([]);
          setErrorsApi('Erreur lors du traitement des données de voyage');
        }
      } else {
        console.warn('La réponse API ne contient pas de données');
        setVoyages([]);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des voyages:', error);
      if (error.response) {
        console.error('Détails de la réponse d\'erreur:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      setVoyages([]);
      setErrorsApi(`Erreur lors de la récupération des voyages: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Créer un nouveau dossier de voyage
  const createVoyage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        setErrorsApi('');
        setLoading(true);

        const voyageData = {
          ...travelFormData,
          // S'assurer que les valeurs numériques sont bien des nombres
          prix_total: parseFloat(travelFormData.prix_total.toString()),
          acompte_verse: parseFloat(travelFormData.acompte_verse.toString()),
          reste_a_payer: parseFloat(travelFormData.reste_a_payer.toString()),
          nombre_personnes: parseInt(travelFormData.nombre_personnes.toString(), 10)
        };

        const requiredFields = ['client_id', 'destination', 'type_voyage', 'date_depart', 'motif_voyage'];
        const missingFields = requiredFields.filter(field => {
          // Utiliser une assertion de type pour accéder dynamiquement aux propriétés
          const value = (voyageData as any)[field];
          return value === undefined || value === null || value === '';
        });

        if (missingFields.length > 0) {
          console.error('Champs manquants avant envoi:', missingFields);
          setErrorsApi(`Veuillez remplir tous les champs obligatoires: ${missingFields.join(', ')}`);
          setLoading(false);
          return;
        }


        const response = await API.post('/api/dossiers-voyage', voyageData);

        if (response && response.data) {
          if (response.data.success || response.status === 201) {

            setTravelFormData({
              client_id: 0,
              type_voyage: '',
              destination: '',
              date_depart: '',
              date_retour: '',
              nombre_personnes: 1,
              motif_voyage: '',
              statut: 'en_cours',
              prix_total: 0,
              acompte_verse: 0,
              reste_a_payer: 0,
              notes: ''
            });

            getVoyages();
          } else {
            console.error('Échec de la création du voyage:', response.data);
            setErrorsApi('Erreur lors de l\'ajout du voyage: Réponse API inattendue');
          }
        } else {
          console.error('Réponse API inattendue:', response);
          setErrorsApi('Erreur lors de l\'ajout du voyage: Aucune réponse de l\'API');
        }
      } catch (error: any) {
        console.error('Erreur lors de l\'ajout du voyage:', error);

        let errorMessage = 'Erreur lors de l\'envoi du voyage. Veuillez réessayer.';
        if (error.response && error.response.data) {
          if (error.response.data.message) {
            errorMessage = `Erreur: ${error.response.data.message}`;
          }

          // Afficher les champs manquants si disponibles
          if (error.response.data.missing_fields && error.response.data.missing_fields.length > 0) {
            errorMessage += `\nChamps manquants: ${error.response.data.missing_fields.join(', ')}`;
          }

          // Afficher l'erreur détaillée si disponible
          if (error.response.data.error) {
            console.error('Détail de l\'erreur:', error.response.data.error);
            errorMessage += `\nDétail: ${error.response.data.error}`;
          }
        } else if (error.message) {
          errorMessage = `Erreur: ${error.message}`;
        }

        setErrorsApi(errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      console.error('Le formulaire contient des erreurs:', errors);
      setErrorsApi('Veuillez corriger les erreurs dans le formulaire avant de soumettre.');
    }
  };

  // Récupérer un voyage par ID
  const getVoyageById = async (id: number) => {
    try {
      setErrorsApi('');

      const response = await API.get(`/api/dossiers-voyage/${id}`);

      if (response && response.data) {
        let voyageData;

        // La réponse API du backend a la structure: { success: true, data: {...} }
        if (response.data.success && response.data.data) {
          voyageData = response.data.data;
        } else if (response.data.id) {
          // Fallback: les données sont directement dans response.data
          voyageData = response.data;
        } else {
          console.error('Structure de réponse API inattendue:', response.data);
          setErrorsApi('Structure de données invalide reçue de l\'API');
          return;
        }

        if (!voyageData || !voyageData.id) {
          console.error('Aucune donnée de voyage valide reçue');
          setErrorsApi('Voyage introuvable ou données invalides');
          return;
        }

        // S'assurer que toutes les valeurs numériques sont définies
        const safeVoyageData = {
          ...voyageData,
          prix_total: voyageData.prix_total || 0,
          acompte_verse: voyageData.acompte_verse || 0,
          reste_a_payer: voyageData.reste_a_payer || 0,
          nombre_personnes: voyageData.nombre_personnes || 1,
          statut: voyageData.statut || 'en_cours'
        };

        setSelectedVoyage(safeVoyageData);

        // Mise à jour du formulaire avec les données du voyage
        setTravelFormData({
          client_id: safeVoyageData.client_id || 0,
          type_voyage: safeVoyageData.type_voyage || '',
          destination: safeVoyageData.destination || '',
          date_depart: safeVoyageData.date_depart ?
            safeVoyageData.date_depart.substring(0, 10) : '', // Format YYYY-MM-DD
          date_retour: safeVoyageData.date_retour ?
            safeVoyageData.date_retour.substring(0, 10) : '', // Format YYYY-MM-DD
          nombre_personnes: safeVoyageData.nombre_personnes || 1,
          motif_voyage: safeVoyageData.motif_voyage || '',
          statut: safeVoyageData.statut || 'en_cours',
          prix_total: safeVoyageData.prix_total || 0,
          acompte_verse: safeVoyageData.acompte_verse || 0,
          reste_a_payer: safeVoyageData.reste_a_payer || 0,
          notes: safeVoyageData.notes || ''
        });

      } else {
        console.error('Réponse API inattendue:', response);
        setErrorsApi('Erreur lors de la récupération du voyage: Réponse API invalide');
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération du voyage:', error);

      let errorMessage = 'Erreur lors de la récupération du voyage. Veuillez réessayer.';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = `Erreur: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`;
      }

      setErrorsApi(errorMessage);
    }
  };

  // Modifier un voyage existant
  const updateVoyage = async (id: number) => {
    if (validateForm()) {
      try {
        setErrorsApi('');
        setLoading(true);

        const voyageData = {
          ...travelFormData,
          prix_total: parseFloat(travelFormData.prix_total.toString()),
          acompte_verse: parseFloat(travelFormData.acompte_verse.toString()),
          reste_a_payer: parseFloat(travelFormData.reste_a_payer.toString()),
          nombre_personnes: parseInt(travelFormData.nombre_personnes.toString())
        };

        const response = await API.put(`/api/dossiers-voyage/${id}`, voyageData);

        if (response && response.data) {
          if (response.data.success || response.status === 200) {
            setTravelFormData({
              client_id: 0,
              type_voyage: '',
              destination: '',
              date_depart: '',
              date_retour: '',
              nombre_personnes: 1,
              motif_voyage: '',
              statut: 'en_cours',
              prix_total: 0,
              acompte_verse: 0,
              reste_a_payer: 0,
              notes: ''
            });
            setIdToUpdate(null);
            setSelectedVoyage(null);
            getVoyages();
          } else {
            setErrorsApi('Erreur lors de la mise à jour: Réponse API inattendue');
          }
        } else {
          setErrorsApi('Erreur: Aucune réponse de l\'API');
        }
      } catch (error: any) {
        let errorMessage = 'Erreur lors de la mise à jour du voyage.';
        if (error.response?.data?.message) {
          errorMessage = `Erreur: ${error.response.data.message}`;
        }
        setErrorsApi(errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      setErrorsApi('Veuillez corriger les erreurs dans le formulaire.');
    }
  };

  // Supprimer un voyage
  const deleteVoyage = async (id: number) => {
    try {
      setErrorsApi('');

      const response = await API.delete(`/api/dossiers-voyage/${id}`);


      // Vérifier si la suppression a réussi
      if (response && (response.status === 200 || response.status === 204 ||
        (response.data && response.data.success))) {

        // Fermer la modal de confirmation
        setShowModalVerify(false);
        setIdToDelete(null);

        // Rafraîchir la liste des voyages
        getVoyages();
      } else {
        console.error('Réponse API inattendue lors de la suppression:', response);
        setErrorsApi('Erreur lors de la suppression: Réponse API invalide');
      }
    } catch (error: any) {
      console.error('Erreur lors de la suppression du voyage:', error);

      let errorMessage = 'Erreur lors de la suppression du voyage. Veuillez réessayer.';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = `Erreur: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`;
      }

      setErrorsApi(errorMessage);
      setShowModalVerify(false);
    }
  };

  // Rechercher des voyages
  const searchVoyage = () => {
    // Appliquer tous les filtres
    let results = [...voyages];

    // Filtre par terme de recherche
    if (searchTerm.trim()) {
      const searchTermLower = searchTerm.toLowerCase().trim();
      results = results.filter(voyage => {
        const clientName = voyage.client ? `${voyage.client.nom} ${voyage.client.prenom}`.toLowerCase() : '';
        const destination = voyage.destination ? voyage.destination.toLowerCase() : '';
        const typeVoyage = voyage.type_voyage ? voyage.type_voyage.toLowerCase() : '';
        const motifVoyage = voyage.motif_voyage ? voyage.motif_voyage.toLowerCase() : '';

        return clientName.includes(searchTermLower) ||
          destination.includes(searchTermLower) ||
          typeVoyage.includes(searchTermLower) ||
          motifVoyage.includes(searchTermLower);
      });
    }

    // Filtre par type de voyage
    if (filterTypeVoyage) {
      results = results.filter(voyage => voyage.type_voyage === filterTypeVoyage);
    }

    // Filtre par statut
    if (filterStatut) {
      results = results.filter(voyage => voyage.statut === filterStatut);
    }

    setFilteredVoyages(results);
  };

  // Réinitialiser tous les filtres
  const resetFilters = () => {
    setSearchTerm('');
    setFilterTypeVoyage('');
    setFilterStatut('');
    setFilteredVoyages(voyages);
    setShowAdvancedFilters(false);
  };

  // Fonction pour rechercher un client par ID dans la liste des clients
  const findClientById = (id: number): Client | undefined => {
    return clients.find(client => client.id === id);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target;
    const { name, value, type } = target;

    // Gestion spéciale pour les champs numériques
    if (type === 'number') {
      // Champs numériques (prix, nombre de personnes, etc.)
      const floatValue = parseFloat(value);
      setTravelFormData(prev => ({
        ...prev,
        [name]: isNaN(floatValue) ? 0 : floatValue
      }));
    } else {
      setTravelFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Appliquer tous les filtres
    searchVoyage();
  };

  // Gérer les changements de filtre avancé
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'filterTypeVoyage') {
      setFilterTypeVoyage(value);
    } else if (name === 'filterStatut') {
      setFilterStatut(value);
    }

    // Appliquer les filtres immédiatement
    setTimeout(() => searchVoyage(), 0);
  };

  // Calcul automatique du reste à payer
  const calculateResteAPayer = () => {
    const prix = parseFloat(travelFormData.prix_total.toString()) || 0;
    const acompte = parseFloat(travelFormData.acompte_verse.toString()) || 0;
    const reste = Math.max(0, prix - acompte); // Empêcher les valeurs négatives

    setTravelFormData(prev => ({
      ...prev,
      reste_a_payer: reste
    }));
  };

  // Effet pour calculer automatiquement le reste à payer
  useEffect(() => {
    calculateResteAPayer();
  }, [travelFormData.prix_total, travelFormData.acompte_verse]);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('Aucun token d\'authentification trouvé');
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  // Fonction pour charger les voyages avec gestion des erreurs
  const loadVoyages = async () => {
    setLoading(true);
    try {
      await getVoyages();
    } catch (error) {
      console.error('Erreur lors du chargement des voyages:', error);
      setErrorsApi('Impossible de charger les voyages. Veuillez vérifier votre connexion ou réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  // Charger les voyages et les clients au montage du composant
  useEffect(() => {
    loadVoyages();
    loadClients(); // Chargement de la liste des clients pour les dropdowns
  }, []);

  // Fonction pour afficher les erreurs API - définie comme variable plutôt que comme composant
  const afficherErreurAPI = () => {
    if (!errorsApi) return null;

    return (
      <div className="alert alert-danger alert-dismissible fade show mt-3" role="alert">
        <strong>Erreur!</strong> {errorsApi}
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="alert"
          aria-label="Close"
          onClick={() => setErrorsApi('')}
        ></button>
      </div>
    );
  };

  // Fonction pour afficher un badge de statut selon l'état
  const renderStatus = (status: string | null | undefined) => {
    if (!status) {
      return <span className="badge bg-secondary">Non défini</span>;
    }

    switch (status) {
      case 'confirme':
        return <span className="badge bg-success">Confirmé</span>;
      case 'en_cours':
        return <span className="badge bg-primary">En cours</span>;
      case 'annule':
        return <span className="badge bg-danger">Annulé</span>;
      case 'termine':
        return <span className="badge bg-dark">Terminé</span>;
      case 'en_attente':
        return <span className="badge bg-warning text-dark">En attente</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  // Formatage d'un montant en euros
  const formatMontant = (montant: number | null | undefined) => {
    if (montant === null || montant === undefined) {
      return '0.00 DA';
    }
    return `${Number(montant).toFixed(2)} DA`;
  };

  // Charger la liste des clients depuis l'API
  const loadClients = async () => {
    try {
      const response = await API.get('/api/clients', {
        params: {
          limit: 10000  
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
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      // On n'affiche pas d'erreur à l'utilisateur pour ne pas bloquer le processus principal
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          Vous devez être connecté pour accéder à cette page.
        </div>
      </div>
    );
  }

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(40);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVoyages = Array.isArray(filteredVoyages)
    ? filteredVoyages.slice(indexOfFirstItem, indexOfLastItem)
    : [];
  const totalPages = Array.isArray(filteredVoyages)
    ? Math.ceil(filteredVoyages.length / itemsPerPage)
    : 0;

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredVoyages]);

  const [confirmText, setconfirmText] = useState('')

  return (
    <div className="container py-4">
      {!isAuthenticated ? (
        <div className="alert alert-warning">
          <p>Vous n'êtes pas authentifié. Veuillez vous connecter pour accéder à cette page.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3">Chargement des données de voyages...</p>
        </div>
      ) : errorsApi ? (
        <div className="alert alert-danger">
          <h5><i className="fas fa-exclamation-triangle"></i> Erreur</h5>
          <p>{errorsApi}</p>
          <div className="d-flex justify-content-between align-items-center">
            <button className="btn btn-sm btn-outline-danger mt-2" onClick={() => {
              setErrorsApi('');
              getVoyages();
            }}>
              <i className="fas fa-sync-alt me-1"></i> Réessayer
            </button>
            <button className="btn-close" onClick={() => setErrorsApi('')} aria-label="Close"></button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="d-flex justify-content-between flex-wrap">
              <h2 className="fw-bold mb-1">Gestion des Voyages</h2>
              <button className="btn fw-semibold text-light" data-bs-toggle="modal" data-bs-target="#voyageModal"
                style={{ backgroundColor: "#00AEEF" }}>
                + voyage
              </button>
            </div>
            <div className="d-flex flex-column w-md-auto my-3">
              <div className="d-flex justify-content-center flex-wrap gap-2">
                <div className="input-group w-50">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Rechercher un voyage..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        searchVoyage();
                      }}
                    >
                      ✖
                    </button>
                  )}
                </div>
                <button className="btn btn-success fw-semibold" onClick={searchVoyage}>
                  Chercher
                </button>
                <button
                  className="btn btn-outline-secondary fw-semibold"
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  {showAdvancedFilters ? 'Masquer les filtres' : 'Filtres avancés'}
                </button>
              </div>

              {showAdvancedFilters && (
                <div className="mt-3 d-flex justify-content-center gap-3">
                  <div className="w-25">
                    <label className="form-label fw-bold small">Type de voyage</label>
                    <select
                      name="filterTypeVoyage"
                      className="form-select"
                      value={filterTypeVoyage}
                      onChange={handleFilterChange}
                    >
                      <option value="">Tous</option>
                      <option value="tourisme">Tourisme</option>
                      <option value="Sans visa">Sans visa</option>
                      <option value="études">Études</option>
                    </select>
                  </div>

                  <div className="w-25">
                    <label className="form-label fw-bold small">Statut</label>
                    <select
                      name="filterStatut"
                      className="form-select"
                      value={filterStatut}
                      onChange={handleFilterChange}
                    >
                      <option value="">Tous</option>
                      <option value="en_cours">En cours</option>
                      <option value="confirme">Confirmé</option>
                      <option value="en_attente">En attente</option>
                      <option value="annule">Annulé</option>
                      <option value="termine">Terminé</option>
                    </select>
                  </div>

                  <div className="d-flex align-items-end">
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={resetFilters}
                    >
                      Réinitialiser tous les filtres
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-2 text-center">
                <small className="text-muted">
                  {filteredVoyages.length} résultat{filteredVoyages.length !== 1 ? 's' : ''} trouvé{filteredVoyages.length !== 1 ? 's' : ''}
                  {(searchTerm || filterTypeVoyage || filterStatut) && ' avec les filtres appliqués'}
                </small>
              </div>
            </div>
          </div>

          {/* <div className="table-responsive"> */}
          {/* <div className="position-absolute table-responsive1">
            {Array.isArray(filteredVoyages) ? (
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Destination</th>
                    <th>Date</th>
                    <th>Motif voyage</th>
                    <th>État</th>
                    <th>Prix</th>
                    <th>Versé</th>
                    <th>Reste</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVoyages && filteredVoyages.length > 0 ? 
                    filteredVoyages.map((voyage, index) => (
                      <tr key={voyage.id || index}>
                        <td>{index + 1}</td>
                        <td>{voyage.client ? `${voyage.client.nom} ${voyage.client.prenom}` : 'N/A'}</td>
                        <td>{voyage.type_voyage || 'Non défini'}</td>
                        <td>{voyage.destination || 'Non défini'}</td>
                        <td>{voyage.date_depart ? new Date(voyage.date_depart).toLocaleDateString() : 'Non défini'}</td>
                        <td>{voyage.motif_voyage || 'Non défini'}</td>
                        <td>{renderStatus(voyage.statut)}</td>
                        <td>{formatMontant(voyage.prix_total)}</td>
                        <td>{formatMontant(voyage.acompte_verse)}</td>
                        <td>{formatMontant(voyage.reste_a_payer)}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              data-bs-toggle="modal"
                              data-bs-target="#modalView"
                              onClick={() => getVoyageById(voyage.id)}
                            >
                              <FaEye />
                            </button>
                            <button 
                              className="btn btn-sm btn-success" 
                              data-bs-toggle="modal" 
                              data-bs-target="#EditevoyageModal"
                              onClick={() => {
                                setIdToUpdate(voyage.id);
                                getVoyageById(voyage.id);
                              }}
                            >
                              <CiEdit size={18} />
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => {
                                setShowModalVerify(true);
                                setIdToDelete(voyage.id);
                              }}
                            >
                              <CiTrash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : 
                    <tr>
                      <td colSpan={11} className="text-center py-3">
                        Aucun voyage trouvé
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            ) : (
              <div className="alert alert-info my-4">Impossible de charger les données de voyages</div>
            )}
          </div> */}

          <div className="position-absolute table-responsive1 mt-5">
            {Array.isArray(filteredVoyages) ? (
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Destination</th>
                    <th>Date</th>
                    <th>Motif voyage</th>
                    <th>État</th>
                    <th>Prix</th>
                    <th>Versé</th>
                    <th>Reste</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentVoyages.length > 0 ?
                    currentVoyages.map((voyage, index) => (
                      <tr key={voyage.id || index}>
                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td>{voyage.client ? `${voyage.client.nom} ${voyage.client.prenom}` : 'N/A'}</td>
                        <td>{voyage.type_voyage || 'Non défini'}</td>
                        <td>{voyage.destination || 'Non défini'}</td>
                        <td>{voyage.date_depart ? new Date(voyage.date_depart).toLocaleDateString() : 'Non défini'}</td>
                        <td>{voyage.motif_voyage || 'Non défini'}</td>
                        <td>{renderStatus(voyage.statut)}</td>
                        <td>{formatMontant(voyage.prix_total)}</td>
                        <td>{formatMontant(voyage.acompte_verse)}</td>
                        <td>{formatMontant(voyage.reste_a_payer)}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              data-bs-toggle="modal"
                              data-bs-target="#modalView"
                              onClick={() => getVoyageById(voyage.id)}
                            >
                              <FaEye />
                            </button>
                            <button
                              className="btn btn-sm btn-success"
                              data-bs-toggle="modal"
                              data-bs-target="#EditevoyageModal"
                              onClick={() => {
                                setIdToUpdate(voyage.id);
                                getVoyageById(voyage.id);
                              }}
                            >
                              <CiEdit size={18} />
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => {
                                setShowModalVerify(true);
                                setIdToDelete(voyage.id);
                              }}
                            >
                              <CiTrash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    :
                    <tr>
                      <td colSpan={11} className="text-center py-3">
                        {filteredVoyages.length === 0 ? 'Aucun voyage trouvé' : 'Aucun voyage sur cette page'}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            ) : (
              <div className="alert alert-info my-4">Impossible de charger les données de voyages</div>
            )}
          </div>

          {/* Pagination */}
          <div className='container'>
            {Array.isArray(filteredVoyages) && filteredVoyages.length > itemsPerPage && (
              <nav className="mt-3">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={goToPreviousPage}>
                      &laquo; Précédent
                    </button>
                  </li>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                    <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                      <button onClick={() => paginate(number)} className="page-link">
                        {number}
                      </button>
                    </li>
                  ))}

                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={goToNextPage}>
                      Suivant &raquo;
                    </button>
                  </li>
                </ul>

                <div className="d-flex justify-content-center align-items-center mt-2">
                  <span className="me-2">Éléments par page:</span>
                  <select
                    className="form-select form-select-sm w-auto"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </nav>
            )}
          </div>

          {/* <div className='container'  >
        {Array.isArray(clients) && clients.length > itemsPerPage && (
            <nav className="mt-3">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={goToPreviousPage}>
                    &laquo; Précédent
                  </button>
                </li>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
            <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
              <button onClick={() => paginate(number)} className="page-link">
                {number}
              </button>
            </li>
          ))}

          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={goToNextPage}>
              Suivant &raquo;
            </button>
          </li>
        </ul>

      <div className="d-flex justify-content-center align-items-center mt-2">
        <span className="me-2">Éléments par page:</span>
        <select
          className="form-select form-select-sm w-auto"
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>
    </nav>
  )
}
        </div >  */}

          {/* Modal d'ajout de voyage */}
          <div className="modal fade" id="voyageModal" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg">
              <form className="modal-content" onSubmit={createVoyage}>
                <div className="modal-header">
                  <h5 className="modal-title">Nouveau voyage</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div className="modal-body row g-3">
                  {/* Affichage des erreurs API */}
                  {errorsApi && (
                    <div className="col-12">
                      <div className="alert alert-danger alert-dismissible fade show">
                        {errorsApi}
                        <button type="button" className="btn-close" onClick={() => setErrorsApi('')} aria-label="Close"></button>
                      </div>
                    </div>
                  )}

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Client</label>
                    <select
                      name="client_id"
                      className={`form-select ${errors.client_id ? 'is-invalid' : ''}`}
                      value={travelFormData.client_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">-- Sélectionnez un client --</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.nom} {client.prenom}
                        </option>
                      ))}
                    </select>
                    {errors.client_id && <div className="invalid-feedback">{errors.client_id}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Type de voyage</label>
                    <select
                      name="type_voyage"
                      className={`form-select ${errors.type_voyage ? 'is-invalid' : ''}`}
                      value={travelFormData.type_voyage}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">-- Sélectionnez un type --</option>
                      <option value="tourisme">Tourisme</option>
                      <option value="Sans visa">Sans visa</option>
                      <option value="études">Études</option>
                      {/* <option value="familial">Familial</option> */}
                    </select>
                    {errors.type_voyage && <div className="invalid-feedback">{errors.type_voyage}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Destination</label>
                    <input
                      name="destination"
                      type="text"
                      className={`form-control ${errors.destination ? 'is-invalid' : ''}`}
                      placeholder="Saisissez la destination..."
                      value={travelFormData.destination}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.destination && <div className="invalid-feedback">{errors.destination}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Date de départ</label>
                    <input
                      name="date_depart"
                      type="date"
                      className={`form-control ${errors.date_depart ? 'is-invalid' : ''}`}
                      value={travelFormData.date_depart}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.date_depart && <div className="invalid-feedback">{errors.date_depart}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Date de retour</label>
                    <input
                      name="date_retour"
                      type="date"
                      className="form-control"
                      value={travelFormData.date_retour}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Nombre de personnes</label>
                    <input
                      name="nombre_personnes"
                      type="number"
                      className="form-control"
                      min="1"
                      value={travelFormData.nombre_personnes}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Motif du voyage</label>
                    <input
                      name="motif_voyage"
                      type="text"
                      className={`form-control ${errors.motif_voyage ? 'is-invalid' : ''}`}
                      placeholder="Saisissez le motif..."
                      value={travelFormData.motif_voyage}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.motif_voyage && <div className="invalid-feedback">{errors.motif_voyage}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Statut</label>
                    <select
                      name="statut"
                      className="form-select"
                      value={travelFormData.statut}
                      onChange={handleInputChange}
                    >
                      <option value="en_cours">En cours</option>
                      <option value="confirme">Confirmé</option>
                      <option value="en_attente">En attente</option>
                      <option value="annule">Annulé</option>
                      <option value="termine">Terminé</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-bold">Prix total (DA)</label>
                    <input
                      name="prix_total"
                      type="number"
                      step="100"
                      className={`form-control ${errors.prix_total ? 'is-invalid' : ''}`}
                      placeholder="Saisissez le prix..."
                      value={travelFormData.prix_total}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.prix_total && <div className="invalid-feedback">{errors.prix_total}</div>}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-bold">Acompte versé (DA)</label>
                    <input
                      name="acompte_verse"
                      type="number"
                      step="100"
                      className="form-control"
                      placeholder="Saisissez l'acompte..."
                      value={travelFormData.acompte_verse}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-bold">Reste à payer (DA)</label>
                    <input
                      name="reste_a_payer"
                      type="number"
                      step="100"
                      className="form-control"
                      value={travelFormData.reste_a_payer}
                      readOnly
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label fw-bold">Notes</label>
                    <textarea
                      name="notes"
                      className="form-control"
                      placeholder="Notes supplémentaires..."
                      value={travelFormData.notes}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>

                  {/* Message d'erreur API */}
                  {errorsApi && (
                    <div className="col-12">
                      <div className="alert alert-danger">{errorsApi}</div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                  <button type="submit" className="btn btn-primary">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>

          {/* Modal de modification de voyage */}
          <div className="modal fade" id="EditevoyageModal" data-bs-backdrop="static"
            data-bs-keyboard="false" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg">
              <form className="modal-content" onSubmit={(e) => {
                e.preventDefault();
                if (IdToUpdate) updateVoyage(IdToUpdate);
              }}>
                <div className="modal-header">
                  <h5 className="modal-title">Modifier le voyage</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div className="modal-body row g-3">
                  {/* Affichage des erreurs API */}
                  {errorsApi && (
                    <div className="col-12">
                      <div className="alert alert-danger alert-dismissible fade show">
                        {errorsApi}
                        <button type="button" className="btn-close" onClick={() => setErrorsApi('')} aria-label="Close"></button>
                      </div>
                    </div>
                  )}

                  {/* Mêmes champs que pour l'ajout */}
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Client</label>
                    <select
                      name="client_id"
                      className={`form-select ${errors.client_id ? 'is-invalid' : ''}`}
                      value={travelFormData.client_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">-- Sélectionnez un client --</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.nom} {client.prenom}
                        </option>
                      ))}
                    </select>
                    {errors.client_id && <div className="invalid-feedback">{errors.client_id}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Type de voyage</label>
                    <select
                      name="type_voyage"
                      className={`form-select ${errors.type_voyage ? 'is-invalid' : ''}`}
                      value={travelFormData.type_voyage}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">-- Sélectionnez un type --</option>
                      <option value="tourisme">Tourisme</option>
                      <option value="Sans visa">Sans visa</option>
                      <option value="études">Études</option>
                      {/* <option value="familial">Familial</option> */}
                    </select>
                    {errors.type_voyage && <div className="invalid-feedback">{errors.type_voyage}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Destination</label>
                    <input
                      name="destination"
                      type="text"
                      className={`form-control ${errors.destination ? 'is-invalid' : ''}`}
                      placeholder="Saisissez la destination..."
                      value={travelFormData.destination}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.destination && <div className="invalid-feedback">{errors.destination}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Date de départ</label>
                    <input
                      name="date_depart"
                      type="date"
                      className={`form-control ${errors.date_depart ? 'is-invalid' : ''}`}
                      value={travelFormData.date_depart}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.date_depart && <div className="invalid-feedback">{errors.date_depart}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Date de retour</label>
                    <input
                      name="date_retour"
                      type="date"
                      className="form-control"
                      value={travelFormData.date_retour}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Nombre de personnes</label>
                    <input
                      name="nombre_personnes"
                      type="number"
                      className="form-control"
                      min="1"
                      value={travelFormData.nombre_personnes}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Motif du voyage</label>
                    <input
                      name="motif_voyage"
                      type="text"
                      className={`form-control ${errors.motif_voyage ? 'is-invalid' : ''}`}
                      placeholder="Saisissez le motif..."
                      value={travelFormData.motif_voyage}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.motif_voyage && <div className="invalid-feedback">{errors.motif_voyage}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Statut</label>
                    <select
                      name="statut"
                      className="form-select"
                      value={travelFormData.statut}
                      onChange={handleInputChange}
                    >
                      <option value="en_cours">En cours</option>
                      <option value="confirme">Confirmé</option>
                      <option value="en_attente">En attente</option>
                      <option value="annule">Annulé</option>
                      <option value="termine">Terminé</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-bold">Prix total (DA)</label>
                    <input
                      name="prix_total"
                      type="number"
                      step="100"
                      className={`form-control ${errors.prix_total ? 'is-invalid' : ''}`}
                      placeholder="Saisissez le prix..."
                      value={travelFormData.prix_total}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.prix_total && <div className="invalid-feedback">{errors.prix_total}</div>}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-bold">Acompte versé (DA)</label>
                    <input
                      name="acompte_verse"
                      type="number"
                      step="100"
                      className="form-control"
                      placeholder="Saisissez l'acompte..."
                      value={travelFormData.acompte_verse}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-bold">Reste à payer (DA)</label>
                    <input
                      name="reste_a_payer"
                      type="number"
                      step="100"
                      className="form-control"
                      value={travelFormData.reste_a_payer}
                      readOnly
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label fw-bold">Notes</label>
                    <textarea
                      name="notes"
                      className="form-control"
                      placeholder="Notes supplémentaires..."
                      value={travelFormData.notes}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                  <button type="submit" className="btn btn-primary">Mettre à jour</button>
                </div>
              </form>
            </div>
          </div>

          {/* Modal d'aperçu de voyage */}
          <div className="modal fade" id="modalView" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Aperçu de voyage</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div className="modal-body">
                  {selectedVoyage ? (
                    <div
                      // id="pdf-content"
                      className="p-4 bg-white rounded shadow-sm">
                      <h4 className="mb-3 border-bottom pb-2 text-primary">Détails du voyage</h4>

                      <div className="mb-3 p-3 border-start border-primary border-3 bg-light rounded">
                        <strong className="text-primary">Client:</strong> {selectedVoyage.client ? `${selectedVoyage.client.nom} ${selectedVoyage.client.prenom}` : 'N/A'}
                        {selectedVoyage.client?.telephone && (
                          <div><strong>Téléphone:</strong> {selectedVoyage.client.telephone}</div>
                        )}
                        {selectedVoyage.client?.email && (
                          <div><strong>Email:</strong> {selectedVoyage.client.email}</div>
                        )}
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-6">
                          <strong>Type:</strong> {selectedVoyage.type_voyage}
                        </div>
                        <div className="col-md-6">
                          <strong>Destination:</strong> {selectedVoyage.destination}
                        </div>
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-6">
                          <strong>Date départ:</strong> {new Date(selectedVoyage.date_depart).toLocaleDateString()}
                        </div>
                        <div className="col-md-6">
                          <strong>Date retour:</strong> {selectedVoyage.date_retour ? new Date(selectedVoyage.date_retour).toLocaleDateString() : 'Non spécifiée'}
                        </div>
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-6">
                          <strong>Nombre de personnes:</strong> {selectedVoyage.nombre_personnes}
                        </div>
                        <div className="col-md-6">
                          <strong>Motif:</strong> {selectedVoyage.motif_voyage}
                        </div>
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-6">
                          <strong>Statut:</strong> {renderStatus(selectedVoyage.statut)}
                        </div>
                      </div>

                      <div className="row mb-3 border-top pt-3 mt-2">
                        <div className="col-md-4">
                          <div className="card bg-light text-center p-2">
                            <div className="small text-muted">Prix total</div>
                            <div className="fw-bold fs-5 text-primary">{formatMontant(selectedVoyage.prix_total)}</div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card bg-light text-center p-2">
                            <div className="small text-muted">Acompte versé</div>
                            <div className="fw-bold fs-5 text-success">{formatMontant(selectedVoyage.acompte_verse)}</div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card bg-light text-center p-2">
                            <div className="small text-muted">Reste à payer</div>
                            <div className="fw-bold fs-5 text-danger">{formatMontant(selectedVoyage.reste_a_payer)}</div>
                          </div>
                        </div>
                      </div>

                      {selectedVoyage.notes && (
                        <div className="mb-3 border-top pt-3">
                          <strong>Notes:</strong>
                          <div className="mt-2 p-2 bg-light rounded">
                            <p className="small text-muted mb-0">{selectedVoyage.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center">Chargement des détails du voyage...</p>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                  {/* {selectedVoyage && (
                    <button type="button" className="btn btn-primary">
                      <i className="fas fa-print me-1"></i> Imprimer
                    </button>
                  )} */}
                </div>
              </div>
            </div>
          </div>

          {/* Modal de confirmation pour la suppression */}
          {
            ShowModalVerify && (
              <div className="modal fade show d-block"
                tabIndex={-1}
                style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }}
              >
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title text-danger">⛔ Supprimer un voyage</h5>
                      <button type="button" className="btn-close" onClick={() => setShowModalVerify(false)}></button>
                    </div>
                    <div className="modal-body">
                      <p>Êtes-vous sûr de vouloir supprimer ce voyage ? Cette action est irréversible.</p>
                      <input
                  type="text"
                  className="form-control"
                  placeholder='Tapez Votre "Code"'
                  value={confirmText}
                  onChange={(e) => setconfirmText(e.target.value)}
                />
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowModalVerify(false)}>Annuler</button>
                      {/* <button type="button" className="btn btn-danger" onClick={() => IdToDelete && deleteVoyage(IdToDelete)}>
                        Supprimer
                      </button> */}
                      <button
                  type="button"
                  className="btn btn-danger"
                  disabled={confirmText.trim() !== "adminDelete"}
                  onClick={() => {
                    if (confirmText.trim() === "adminDelete" && IdToDelete) {
                      deleteVoyage(IdToDelete);
                      setconfirmText('');
                    }
                  }}
                >
                  Supprimer
                </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        </>
      )}
    </div >
  );
};

export default Voyages;
