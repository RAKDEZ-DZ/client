import React, { useState, useEffect } from 'react';
import { CiEdit, CiTrash } from 'react-icons/ci';
import { FaEye } from 'react-icons/fa';
import ClientDetailModal from './ClientDetailModal';
import apiClient from '../api/apiConfig';
import '../App.css';
import axios from 'axios';

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercepteur pour la gestion des réponses
apiClient.interceptors.response.use(
  (response) => {
    ;
    if (Array.isArray(response.data)) {
      console.log('Nombre d\'éléments reçus:', response.data.length);
      if (response.data.length > 0) {
        console.log('Premier élément:', response.data[0]);
      }
    } else if (response.data && typeof response.data === 'object') {
      console.log('Structure de la réponse:', Object.keys(response.data));
    }
    return response;
  },
  (error) => {
    console.error('Erreur API:', error);
    if (error.response) {
      // La requête a été faite et le serveur a répondu avec un code d'état
      console.error('Réponse d\'erreur:', error.response.status, error.response.data);
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      console.error('Pas de réponse reçue:', error.request);
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      console.error('Erreur de configuration:', error.message);
    }
    return Promise.reject(error);
  }
);

// Type pour les clients
export interface ClientType {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  type_visa?: string;
  etat_dossier?: string;
  email_creer?: string;
  mot_de_passe?: string;
  universite_destination?: string;
  pays_destination?: string;
  programme_etude?: string;
  niveau_etude?: string;
  statut?: string;
  notes?: string;
  payement?: string;
  user_username_createur?: string;
  documents?: Array<{
    name?: string;
    originalName?: string;
    filename?: string;
    type?: string;
    mimetype?: string;
    url?: string;
    path?: string;
    relativePath?: string;
    size?: number;
    uploadDate?: string;
  }>;
}

interface FormData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  type_visa: string;
  etat_dossier: string;
  email_creer: string;
  mot_de_passe: string;
  universite_destination: string;
  pays_destination: string;
  programme_etude: string;
  niveau_etude: string;
  statut: string;
  notes: string;
  payement: string;
  user_username_createur: string;
};

const Clients = () => {

  const [formData, setFormData] = useState<FormData>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    type_visa: '',
    etat_dossier: '',
    email_creer: '',
    mot_de_passe: '',
    universite_destination: '',
    pays_destination: '',
    programme_etude: '',
    niveau_etude: '',
    statut: '',
    notes: '',
    payement: '',
    user_username_createur:''
  });
  const [clients, setClients] = useState<ClientType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [errorsApi, seterrorsApi] = useState('');
  const [ShowModalVerify, setShowModalVerify] = useState(false);
  const [IdToDelete, setIdToDelete] = useState<number | null>(null);
  const [IdToUpdate, setIdToUpdate] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // État pour suivre si la page est en cours de chargement
  const [loading, setLoading] = useState(true);
  // État pour suivre si l'utilisateur est authentifié
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.nom) newErrors.nom = 'Nom requis';
    if (!formData.prenom) newErrors.prenom = 'Prénom requis';
    if (!formData.email) newErrors.email = 'Email requis';
    if (!formData.telephone) newErrors.telephone = 'Téléphone requis';
    if (!formData.type_visa) newErrors.type_visa = 'Type de visa requis';
    if (!formData.payement) newErrors.payement = 'Statut de paiement requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [addedText, setaddedText] = useState('')
  const [success, setsuccess] = useState(false)
  const handleDossierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (validateForm()) {
      try {
        const formDataToSend = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          if (value) {
            formDataToSend.append(key, value.toString());
          }
        });

        const utilisateur1 = user; 
        formDataToSend.append('user_username_createur', utilisateur1);

        if (selectedFiles.length > 0) {
          selectedFiles.forEach((file) => {
            formDataToSend.append('documents', file);
            console.log(`Fichier ajouté:`, file.name, file.type, file.size);
          });
        }

        const response = await apiClient.post('/api/clients', formDataToSend, {
          headers: {
            'Content-Type': undefined
          }
        });

        console.log('Client ajouté avec succès:', response.data);
        setaddedText("Client ajouté avec succès")

        setFormData({
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          type_visa: '',
          etat_dossier: '',
          email_creer: '',
          mot_de_passe: '',
          universite_destination: '',
          pays_destination: '',
          programme_etude: '',
          niveau_etude: '',
          statut: '',
          notes: '',
          payement: '',
          user_username_createur:''
        });
        setSelectedFiles([]);

        getClients();
        setsuccess(true)
      } catch (error: any) {
        console.error('Erreur lors de l\'ajout du client:', error);

        if (error.response) {
          const errorMessage = error.response.data?.message || error.response.data?.error || 'Erreur lors de l\'envoi du client. Veuillez réessayer.';
          seterrorsApi(`Erreur (${error.response.status}): ${errorMessage}`);
        } else if (error.request) {
          console.error('Aucune réponse reçue:', error.request);
          seterrorsApi('Le serveur n\'a pas répondu. Vérifiez votre connexion internet ou contactez l\'administrateur.');
        } else {
          console.error('Erreur de configuration de la requête:', error.message);
          seterrorsApi(`Erreur: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const getClients = async () => {
    try {

      const response = await apiClient.get('/api/clients', {
        headers: {
          'Content-Type': 'application/json'
        },
      });

      if (response.data) {
        // console.table(response.data); 
        if (Array.isArray(response.data)) {
          setClients(response.data);
        } else if (typeof response.data === 'object') {
          // Si c'est un objet mais pas un tableau, vérifier s'il contient une propriété qui pourrait contenir les clients
          const possibleArrayKeys = ['clients', 'data', 'items', 'results'];
          const arrayKey = possibleArrayKeys.find(key => Array.isArray(response.data[key]));

          if (arrayKey) {
            setClients(response.data[arrayKey]);
          } else {
            console.warn('Les données ne sont pas un tableau mais un objet:', response.data);
            // Tenter de convertir l'objet en tableau si possible
            const clientsArray = Object.values(response.data) as ClientType[];;
            if (clientsArray.length > 0 && typeof clientsArray[0] === 'object') {
              setClients(clientsArray);
            } else {
              console.error('Impossible de traiter les données comme un tableau de clients');
              setClients([]);
            }
          }
        } else {
          console.warn('La réponse API contient des données, mais pas sous un format attendu');
          setClients([]);
        }
      } else {
        console.warn('La réponse API ne contient pas de données');
        setClients([]);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des clients:', error);
      console.error('Message d\'erreur:', error.message);
      if (error.response) {
        console.error('Détails de la réponse d\'erreur:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      // En cas d'erreur, définir clients comme un tableau vide pour éviter les erreurs de rendu
      setClients([]);
      seterrorsApi(`Erreur lors de la récupération des clients: ${error.message}`);
    }
  };

  const getClientById = async (id: number) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/clients/${id}`);

      // Vérifier si la réponse est dans le format attendu
      let clientData;
      if (response.data && response.data.data) {
        // Format { success: true, data: {...} }
        clientData = response.data.data;
      } else if (response.data) {
        // Format direct { id: 1, nom: '...', ... }
        clientData = response.data;
      } else {
        throw new Error('Format de réponse inattendu');
      }

      if (!clientData) {
        console.error('Aucune donnée client reçue');
        seterrorsApi('Client introuvable');
        return;
      }

      setFormData({
        nom: clientData.nom || '',
        prenom: clientData.prenom || '',
        email: clientData.email || '',
        telephone: clientData.telephone || '',
        type_visa: clientData.type_visa || '',
        etat_dossier: clientData.etat_dossier || '',
        email_creer: clientData.email_creer || '',
        mot_de_passe: '',
        universite_destination: clientData.universite_destination || '',
        pays_destination: clientData.pays_destination || '',
        programme_etude: clientData.programme_etude || '',
        niveau_etude: clientData.niveau_etude || '',
        statut: clientData.statut || '',
        notes: clientData.notes || '',
        payement: clientData.payement || '',
        user_username_createur:  clientData.user_username_createur || ''
      });

      setSelectedFiles([]);

      setIdToUpdate(id);

      console.log('Client récupéré avec succès:', clientData);


    } catch (error: any) {
      console.error('Erreur lors de la récupération du client:', error);

      let errorMessage = 'Erreur lors de la récupération du client';
      if (error.response) {
        errorMessage += `: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`;
      } else if (error.request) {
        errorMessage += ': Le serveur n\'a pas répondu';
      } else {
        errorMessage += `: ${error.message}`;
      }

      seterrorsApi(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // const editClient = async (id: number) => {
  //   if (validateForm()) {
  //     try {
  //       setLoading(true);
  //       const formDataToSend = new FormData();

  //       Object.entries(formData).forEach(([key, value]) => {
  //         const valueToSend = value !== null && value !== undefined ? value.toString() : '';
  //         formDataToSend.append(key, valueToSend);
  //         console.log(`Ajout du champ ${key}:`, valueToSend);
  //       });

  //       // Gestion des fichiers
  //       if (selectedFiles.length > 0) {
  //         console.log(`Ajout de ${selectedFiles.length} fichiers pour la mise à jour`);
  //         selectedFiles.forEach((file, index) => {
  //           formDataToSend.append('documents', file);
  //           console.log(`Fichier ${index + 1} ajouté:`, file.name, file.type, file.size);
  //         });

  //         // Vérifier que les fichiers sont bien dans FormData
  //         console.log('Nombre de champs "documents" dans FormData:',formDataToSend,
  //           // [...formDataToSend.entries()].filter(([key]) => key === 'documents').length
  //           );
  //       }

  //       const response = await apiClient.put(`/api/clients/${id}`, formDataToSend);

  //       setFormData({
  //         nom: '',
  //         prenom: '',
  //         email: '',
  //         telephone: '',
  //         type_visa: '',
  //         etat_dossier: '',
  //         email_creer: '',
  //         mot_de_passe: '',
  //         universite_destination: '',
  //         pays_destination: '',
  //         programme_etude: '',
  //         niveau_etude: '',
  //         statut: '',
  //         notes: '',
  //         payement: ''
  //       });
  //       setSelectedFiles([]);
  //       setIdToUpdate(null);
  //       getClients();
  //       setLoading(false)

  //       console.log('Client mis à jour avec succès:', response.data);
  //     } catch (error: any) {
  //       console.error('Erreur lors de la mise à jour du client:', error);

  //       // Afficher des informations détaillées sur l'erreur pour le débogage
  //       if (error.response) {
  //         console.error('Réponse d\'erreur:', {
  //           status: error.response.status,
  //           headers: error.response.headers,
  //           data: error.response.data
  //         });
  //         const errorMessage = error.response.data?.message || error.response.data?.error || 'Erreur lors de la mise à jour du client.';
  //         seterrorsApi(`Erreur (${error.response.status}): ${errorMessage}`);
  //       } else if (error.request) {
  //         console.error('Requête envoyée mais pas de réponse:', error.request);
  //         seterrorsApi('Le serveur n\'a pas répondu. Vérifiez votre connexion internet ou contactez l\'administrateur.');
  //       } else {
  //         console.error('Erreur de configuration de la requête:', error.message);
  //         seterrorsApi(`Erreur: ${error.message}`);
  //       }

  //     }
  //   }
  // };
  const [updatedText, setupdatedText] = useState('')
  const [loading1, setloading1] = useState(false)
  const editClient = async (id: number) => {
    if (!validateForm()) {
      return;
    }

    try {
      setloading1(true);
      const formDataToSend = new FormData();


      Object.entries(formData).forEach(([key, value]) => {
        const valueToSend = value?.toString() || "";
        formDataToSend.append(key, valueToSend);
        console.log(`Champ [${key}] ajouté:`, valueToSend);
      });
      console.groupEnd();

      if (selectedFiles.length > 0) {
        console.group(`Ajout de ${selectedFiles.length} fichiers`);
        selectedFiles.forEach((file, index) => {
          if (!(file instanceof File)) {
            console.error("Fichier invalide à l'index", index, file);
            throw new Error(`Le fichier ${index} n'est pas valide`);
          }

          formDataToSend.append("documents", file, file.name);
          console.log(`Fichier ${index + 1}:`, {
            Nom: file.name,
            Type: file.type,
            Taille: `${(file.size / 1024).toFixed(2)} Ko`,
            Modifié: new Date(file.lastModified).toLocaleString()
          });
        });
        console.groupEnd();
      }

      Array.from(formDataToSend.entries()).forEach(([key, value]) => {
        if (value instanceof File) {
          // console.log(`Fichier [${key}]:`, (value as File).name);
        } else {
          // console.log(`Champ [${key}]:`, value);
        }
      });
      console.groupEnd();

    
      const response = await apiClient.put(`/api/clients/${id}`, formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const initialFormState = {
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
        type_visa: "",
        etat_dossier: "",
        email_creer: "",
        mot_de_passe: "",
        universite_destination: "",
        pays_destination: "",
        programme_etude: "",
        niveau_etude: "",
        statut: "",
        notes: "",
        payement: "",
        user_username_createur:""
      };

      setFormData(initialFormState);
      setSelectedFiles([]);
      setIdToUpdate(null);
      await getClients(); 

      setupdatedText(" Mise à jour réussie ")
      setsuccess(true)
      return response.data;

    } catch (error: any) {
      console.error("Échec de la mise à jour:", error);

      // Gestion d'erreur détaillée
      let errorMessage = "Erreur lors de la mise à jour";
      if (error.response) {
        console.error("Détails de l'erreur:", {
          Status: error.response.status,
          Data: error.response.data
        });
        errorMessage = error.response.data?.message ||
          error.response.data?.error ||
          `Erreur serveur (${error.response.status})`;
      } else if (error.request) {
        console.error("Pas de réponse du serveur");
        errorMessage = "Pas de réponse du serveur - Vérifiez votre connexion";
      } else {
        console.error("Erreur de configuration:", error.message);
        errorMessage = `Erreur: ${error.message}`;
      }
      seterrorsApi(errorMessage);
      throw error;

    } finally {
      setloading1(false);
    }
  };

  const deleteClient = async (id: number) => {
    try {
      setLoading(true);
      const response = await apiClient.delete(`/api/clients/${id}`);
      setShowModalVerify(false);
      setIdToDelete(null);
      seterrorsApi('');

      getClients();
    } catch (error: any) {
      console.error('Erreur lors de la suppression du client:', error);

      let errorMessage = 'Erreur lors de la suppression du client';

      if (error.response) {
        console.error('Réponse d\'erreur:', error.response.data);
        errorMessage += `: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`;

        // Message spécifique pour les erreurs 403 (interdiction)
        if (error.response.status === 403) {
          errorMessage = 'Vous n\'avez pas les permissions nécessaires pour supprimer ce client';
        }
        // Message spécifique pour les erreurs 404 (non trouvé)
        else if (error.response.status === 404) {
          errorMessage = 'Ce client n\'existe pas ou a déjà été supprimé';
        }
        // Message spécifique pour les erreurs 409 (conflit)
        else if (error.response.status === 409) {
          errorMessage = 'Impossible de supprimer ce client car il possède des éléments associés (voyages, factures, etc.)';
        }
      } else if (error.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        errorMessage = 'Le serveur n\'a pas répondu à la demande de suppression. Vérifiez votre connexion internet.';
      } else {
        // Une erreur s'est produite lors de la configuration de la requête
        errorMessage += `: ${error.message}`;
      }

      setShowModalVerify(false);
      seterrorsApi(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const searchClient = async () => {
    if (!searchTerm.trim()) {
      getClients();
      return;
    }

    try {
      const response = await apiClient.get(`/api/clients/search?q=${searchTerm}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      setClients(response.data.data);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      seterrorsApi('Erreur lors de la recherche de clients. Veuillez réessayer.');
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target;
    const { name, type, value } = target;

    if (type === "file" && name === "documents") {
      const fileTarget = target as HTMLInputElement;
      const fileList = fileTarget.files ? Array.from(fileTarget.files) : [];
      setSelectedFiles(fileList);

    } else if (type === "checkbox") {
      const checkboxTarget = target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: checkboxTarget.checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('Aucun token d\'authentification trouvé');
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      await getClients();
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      seterrorsApi('Impossible de charger les clients. Veuillez vérifier votre connexion ou réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const renderPaymentStatus = (status: string) => {
    switch (status) {
      case 'payer':
        return <span className="badge bg-success">Payé</span>;
      case 'pas_payer':
        return <span className="badge bg-danger">Non payé</span>;
      case 'partielle':
        return <span className="badge bg-warning">Partiel</span>;
      default:
        return <span className="badge bg-secondary">Inconnu</span>;
    }
  };


  const showClientDetails = (client: ClientType) => {
    setSelectedClient(client);
    setShowDetailModal(true);
  };

  // Fonction utilitaire pour formater l'URL des documents
  // const getDocumentUrl = (url: string | undefined) => {
  //   if (!url) return '#';

  //   // Si l'URL est déjà complète (commence par http:// ou https://)
  //   if (url.startsWith('http://') || url.startsWith('https://')) {
  //     return url;
  //   }

  //   // Utiliser la nouvelle route API dédiée aux documents
  //   const baseUrl = apiClient.defaults.baseURL || 'http://192.168.0.47:3000';

  //   // Extraire juste le nom du fichier, en supprimant les chemins
  //   const filename = url.split('/').pop() || url;

  //   // Récupérer l'ID du client à partir du contexte actuel
  //   const clientId = selectedClient?.id;

  //   if (!clientId) {
  //     console.error('Impossible de générer l\'URL du document: ID client manquant');
  //     return '#';
  //   }

  //   // Construire l'URL avec la nouvelle route API
  //   const formattedUrl = `${baseUrl}/api/documents/${clientId}/${filename}`;

  //   console.log('URL formatée (Clients.tsx):', formattedUrl);
  //   return formattedUrl;
  // };

  // Helper pour extraire le bon nom et URL du document
  const getDocumentInfo = (doc: any) => {
    // Trouver le nom du document
    const name = doc.name || doc.originalName || doc.filename || 'Document';

    // Trouver l'URL du document
    let url = '';
    if (doc.url) url = doc.url;
    else if (doc.path) {
      // Si c'est un chemin complet, extraire seulement le nom du fichier
      const parts = doc.path.split(/[\/\\]/); // Diviser par / ou \
      const filename = parts[parts.length - 1];
      // Construire le chemin relatif en fonction de la structure du backend
      if (doc.path.includes('dossiers-etudiants')) {
        // Pour les dossiers étudiants, conserver la structure complète
        const pathParts = doc.path.split('uploads');
        if (pathParts.length > 1) {
          url = `/uploads${pathParts[1]}`;
        } else {
          url = `/uploads/dossiers-etudiants/${filename}`;
        }
      } else {
        // Pour les documents réguliers
        url = `/uploads/${filename}`;
      }
    }
    else if (doc.relativePath) url = `/uploads/${doc.relativePath}`;

    // console.log('Document info:', { name, url });
    return { name, url };
  };

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
  const [itemsPerPage, setItemsPerPage] = useState(40);

  // Calcul des données paginées
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClients = Array.isArray(clients) ? clients.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil(clients.length / itemsPerPage);

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
  }, [clients]);


  const [confirmText, setconfirmText] = useState('')
  const [uploaded, setuploaded] = useState(false)
  const [uploadit, setuploadit] = useState(false)
  const UploadDocuments = async () => {
    setuploaded(true);
    setuploadit(true);
  
    try {
      const form = new FormData();
  
      Object.entries(formData).forEach(([key, value]) => {
        form.append('nom', formData.nom);
        form.append('prenom', formData.prenom);
        form.append('email', formData.email);
      });
  
      // Ajouter les fichiers (PDF ou autre)
      selectedFiles.forEach((file: File) => {
        form.append("documents", file); 
      });
  
      const response = await axios.post(
        "https://backend1-lz19.onrender.com/api/clients/22/upload-multiple-documents",
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
  
      setuploaded(false);
    } catch (error: any) {
      console.error("Erreur lors de l'upload :", error.response?.data || error.message);
    }
  };


  const UpdateDocuments = async (id : number) => {
    setuploaded(true);
    setuploadit(true);
  
    try {
      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        form.append('nom', formData.nom);
        form.append('prenom', formData.prenom);
      });
  
      selectedFiles.forEach((file: File) => {
        form.append("documents", file); 
      });
      const token = localStorage.getItem('authToken');

      const response = await axios.post(
        `https://backend1-lz19.onrender.com/api/clients/${id}/upload-multiple-documents`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}` 
          },
        }
      );
  
      console.log("updates réussi :", response.data);
      setuploaded(false);
    } catch (error: any) {
      console.error("Erreur lors de l'upload :", error.response?.data || error.message);
    }
  };

  const [user, setuser] = useState('');
  const [role, setrole] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('user');
    const storeRole = localStorage.getItem('userPermissions');
    if (storeRole) {
      const parsed = JSON.parse(storeRole);
      setrole(parsed.role);
    }

    if (storedName) {
      const parsed = JSON.parse(storedName);
      setuser(parsed.username);
    }
  }, []);


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
          <p className="mt-3">Chargement des données client...</p>
        </div>
      ) : errorsApi ? (
        <div className="alert alert-danger">
          <p>{errorsApi}</p>
          <button className="btn btn-sm btn-outline-danger mt-2" onClick={() => {
            seterrorsApi('');
            getClients();
          }}>
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="d-flex justify-content-between flex-wrap">
              <span>
                <h2 className="fw-bold">Gestion des Clients</h2>
                <p className="text-secondary mx-2">utilisateur : {user}</p>
              </span>
              <button className="btn fw-semibold h-50 mt-2"
                data-bs-toggle="modal"
                data-bs-target="#dossierModal"
                style={{ backgroundColor: "#00AEEF", color: "white" }}>
                + client
              </button>
            </div>
            <div className="d-flex justify-content-center gap-2 w-md-auto my-3">
              <input
                type="text"
                className="form-control w-50"
                placeholder="Rechercher un client..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <button className="btn btn-success fw-semibold" onClick={searchClient}>
                Chercher
              </button>
            </div>
          </div>

          {/* <div className="table-responsive"> */}
          <div className="position-absolute table-responsive1 mt-5 ">
            {Array.isArray(clients) ? (
              // <table className="table table-hover align-middle mb-0">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Nom & Prénom</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Type de visa</th>
                    <th>Statut</th>
                    <th>Documents</th>
                    <th>Paiement</th>
                    <th>Action</th>
                    { role === "admin" && <th>utilisateur</th>}
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(clients) && clients.length > 0 ? (
                    currentClients.length > 0 ? (
                      currentClients.map((client, index) => (
                        <tr key={client.id || index}>
                          <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                          <td>{`${client.nom || ''} ${client.prenom || ''}`}</td>
                          <td>{client.email || ''}</td>
                          <td>{client.telephone || ''}</td>
                          <td>{client.type_visa || ''}</td>
                          <td>
                            {client.statut ? (
                              <span className={`badge ${client.statut === 'nouveau' || client.statut === 'inscrit' ? 'bg-info' :
                                client.statut === 'en_cours' ? 'bg-primary' :
                                  client.statut === 'incomplet' ? 'bg-warning' :
                                    client.statut === 'admission_recu' ? 'bg-success' :
                                      client.statut === 'refus' ? 'bg-danger' :
                                        client.statut === 'accepter' ? 'bg-success' :
                                          client.statut === 'partie_visa' ? 'bg-secondary' :
                                            client.statut === 'terminer' ? 'bg-dark' : 'bg-secondary'
                                }`}>
                                {client.statut === 'nouveau' ? 'Nouveau' :
                                  client.statut === 'inscrit' ? 'Inscrit' :
                                    client.statut === 'en_cours' ? 'En cours' :
                                      client.statut === 'incomplet' ? 'Incomplet' :
                                        client.statut === 'admission_recu' ? 'Admission reçue' :
                                          client.statut === 'refus' ? 'Refusé' :
                                            client.statut === 'accepter' ? 'Accepté' :
                                              client.statut === 'partie_visa' ? 'Partie visa' :
                                                client.statut === 'terminer' ? 'Terminé' : client.statut}
                              </span>
                            ) : ''}
                          </td>
                          <td>
                            {Array.isArray(client.documents) ? (
                              <div className="dropdown">
                                <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                  {client.documents.length} fichier(s)
                                </button>
                                <ul className="dropdown-menu">
                                  {client.documents.length > 0 ? (
                                    (client.documents as Array<{ id: string; name: string; url: string }>).map((doc, idx) => {
                                      // const { name, url } = getDocumentInfo(doc);
                                      const fileName = doc.name ;
                                      const name = `${doc.id}-${doc.name}`;
                                      return (
                                        <li key={idx}>
                                          <a className="dropdown-item" download={name}
                                            href={doc.url}
                                            target="_blank" rel="noopener noreferrer">
                                            {fileName}
                                          </a>
                                        </li>
                                      );
                                    })
                                  ) : (
                                    <li><span className="dropdown-item text-muted">Aucun document</span></li>
                                  )}
                                  <li><hr className="dropdown-divider" /></li>
                                  <li>
                                    <button
                                      className="dropdown-item text-primary"
                                      data-bs-toggle="modal"
                                      data-bs-target="#EditedossierModal"
                                      onClick={() => {
                                        if (client.id) {
                                          setIdToUpdate(client.id);
                                          getClientById(client.id);
                                        }
                                      }}
                                    >
                                      Ajouter un document
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline-primary"
                                data-bs-toggle="modal"
                                data-bs-target="#EditedossierModal"
                                onClick={() => {
                                  if (client.id) {
                                    setIdToUpdate(client.id);
                                    getClientById(client.id);
                                  }
                                }}
                              >
                                Ajouter
                              </button>
                            )}
                          </td>
                          <td>{client.payement ? renderPaymentStatus(client.payement) : ''}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-info"
                                onClick={() => {
                                  if (client) {
                                    showClientDetails(client);
                                  }
                                }}
                                title="Voir les détails du client">
                                <FaEye size={18} />
                              </button>
                              <button
                                className="btn btn-sm btn-success"
                                data-bs-toggle="modal"
                                data-bs-target="#EditedossierModal"
                                onClick={() => {
                                  if (client.id) {
                                    getClientById(client.id);
                                  }
                                }}
                                title="Modifier ce client">
                                <CiEdit size={18} />
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => {
                                  if (client.id) {
                                    setIdToDelete(client.id);
                                    setShowModalVerify(true);
                                  }
                                }}
                                title="Supprimer ce client">
                                <CiTrash size={18} />
                              </button>
                            </div>
                          </td>
                          {
                            role === "admin" && <td>{client.user_username_createur}</td>
                          }
                          
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="text-center py-3">
                          Aucun client à afficher sur cette page
                        </td>
                      </tr>
                    )
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-3">
                        Aucun client trouvé
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            ) : (
              <div className="alert alert-info my-4">Impossible de charger les données client</div>
            )}
          </div>

          <div className='container'  >
            {Array.isArray(clients) && clients.length > itemsPerPage && (
              <nav className="mt-3">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={goToPreviousPage}>
                      &laquo; Précédent
                    </button>
                  </li>

                  {/* Afficher les numéros de page */}
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

                {/* Sélecteur d'éléments par page */}
                <div className="d-flex justify-content-center align-items-center mt-2">
                  <span className="me-2">Éléments par page:</span>
                  <select
                    className="form-select form-select-sm w-auto"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1); // Reset à la première page quand on change le nombre d'éléments
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
        </>
      )}


      {/*     mommmmmmmdalllll */}


      {/* Modal d'ajout de client */}
     {
      !success && (
        <div className="modal fade" id="dossierModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <form className="modal-content" onSubmit={handleDossierSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Ajouter un client</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" onClick={() => setaddedText('')}></button>
            </div>
            <div className="modal-body row g-3">
              <div className='col-12'>
                {
                  addedText !== "" &&
                  <div className="alert alert-success alert-dismissible fade show mt-2" role="alert">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {addedText}
                    <button type="button" className="btn-close" onClick={() => setaddedText('')}></button>
                  </div>
                }
              </div>
              {/* Informations personnelles */}
              <div className="col-md-6">
                <label className="form-label fw-bold">Nom</label>
                <input
                  name="nom"
                  type="text"
                  className={`form-control ${errors.nom ? 'is-invalid' : ''}`}
                  placeholder="Saisissez le nom..."
                  value={formData.nom}
                  onChange={handleInputChange}
                  required
                />
                {errors.nom && <div className="invalid-feedback">{errors.nom}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Prénom</label>
                <input
                  name="prenom"
                  type="text"
                  className={`form-control ${errors.prenom ? 'is-invalid' : ''}`}
                  placeholder="Saisissez le prénom..."
                  value={formData.prenom}
                  onChange={handleInputChange}
                  required
                />
                {errors.prenom && <div className="invalid-feedback">{errors.prenom}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Email</label>
                <input
                  name="email"
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  placeholder="Saisissez l'email..."
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Téléphone</label>
                <input
                  name="telephone"
                  type="tel"
                  className={`form-control ${errors.telephone ? 'is-invalid' : ''}`}
                  placeholder="Saisissez le téléphone..."
                  value={formData.telephone}
                  onChange={handleInputChange}
                  required
                />
                {errors.telephone && <div className="invalid-feedback">{errors.telephone}</div>}
              </div>

              {/* Informations de connexion */}
              <div className="col-md-6">
                <label className="form-label fw-bold">Email de connexion</label>
                <input
                  name="email_creer"
                  type="email"
                  className="form-control"
                  placeholder="Email pour la connexion client..."
                  value={formData.email_creer}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Mot de passe</label>
                <input
                  name="mot_de_passe"
                  type="text"
                  className="form-control"
                  placeholder="Mot de passe pour la connexion..."
                  value={formData.mot_de_passe}
                  onChange={handleInputChange}
                />
              </div>

              {/* Informations de voyage/études */}
              <div className="col-md-6">
                <label className="form-label fw-bold">Type de visa</label>
                <select
                  name="type_visa"
                  className={`form-select ${errors.type_visa ? 'is-invalid' : ''}`}
                  value={formData.type_visa}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">-- Sélectionnez un type de visa --</option>
                  <option value="tourisme">Visa Tourisme</option>
                  <option value="études">Visa Études</option>
                  <option value="Sans visa">Sans visa</option>
                </select>
                {errors.type_visa && <div className="invalid-feedback">{errors.type_visa}</div>}
              </div>

              <div className="col-md-6">
                <label className="form-label fw-bold">Statut de paiement</label>
                <select
                  name="payement"
                  className={`form-select ${errors.payement ? 'is-invalid' : ''}`}
                  value={formData.payement}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">-- Sélectionnez un statut --</option>
                  <option value="payer">Payé</option>
                  <option value="pas_payer">Non payé</option>
                  <option value="partielle">Paiement partiel</option>
                </select>
                {errors.payement && <div className="invalid-feedback">{errors.payement}</div>}
              </div>

              {/* Champs pour visa étudiant */}
              {formData.type_visa === 'études' && (
                <>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Programme d'étude</label>
                    <input
                      name="programme_etude"
                      type="text"
                      className="form-control"
                      placeholder="Saisissez le programme..."
                      value={formData.programme_etude}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Université de destination</label>
                    <input
                      name="universite_destination"
                      type="text"
                      className="form-control"
                      placeholder="Saisissez l'université..."
                      value={formData.universite_destination}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Pays de destination</label>
                    <input
                      name="pays_destination"
                      type="text"
                      className="form-control"
                      placeholder="Saisissez le pays..."
                      value={formData.pays_destination}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Niveau d'études</label>
                    <input
                      name="niveau_etude"
                      type="text"
                      className="form-control"
                      placeholder="Saisissez le niveau..."
                      value={formData.niveau_etude}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Statut</label>
                    <select
                      name="statut"
                      className="form-select"
                      value={formData.statut}
                      onChange={handleInputChange}
                    >
                      <option value="">-- Sélectionnez un statut --</option>
                      <option value="nouveau">Nouveau</option>
                      <option value="inscrit">Inscrit</option>
                      <option value="en_cours">En cours</option>
                      <option value="incomplet">Incomplet</option>
                      <option value="admission_recu">Admission reçue</option>
                      <option value="refus">Refusé</option>
                      <option value="accepter">Accepté</option>
                      <option value="partie_visa">Partie visa</option>
                      <option value="terminer">Terminé</option>
                    </select>
                  </div>
                </>
              )}

              {/* Documents */}
              <div className="col-md-12 ">
                <label className="form-label fw-bold">Documents</label>
                {selectedFiles.length > 0 && (
                  <ul className="list-unstyled mb-2">
                    {selectedFiles.map((file, index) => (
                      <li key={index} className="text-muted small">📄 {file.name}</li>
                    ))}
                  </ul>
                )}
                <span className='d-flex justify-content-between gap-3' >
                  <input
                    name="documents"
                    type="file"
                    multiple
                    className="form-control"
                    onChange={handleInputChange}
                  />
                  {/* <button className='btn btn-outline-success' type="button" onClick={() => UploadDocuments()}>
                    {uploaded ? " ... " : " Stocker"}
                  </button> */}
                </span>
              </div>

              {/* Notes */}
              <div className="col-md-12">
                <label className="form-label fw-bold">Notes</label>
                <textarea
                  name="notes"
                  className="form-control"
                  placeholder="Notes supplémentaires..."
                  value={formData.notes}
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
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={() => setaddedText('')}>Fermer</button>
              <button type="submit" className={`btn btn-primary `} {...(success ? { "data-bs-dismiss": "modal" } : {})}
              >Enregistrer</button>
            </div>
          </form>
        </div>
      </div>
      )
     }

      {/* Modal de modification de client */}
      {
        !success && (
          <div className="modal fade" id="EditedossierModal" data-bs-backdrop="static"
          data-bs-keyboard="false" tabIndex={-1} aria-hidden="true" >
          <div className="modal-dialog modal-lg">
            <form className="modal-content" onSubmit={(e) => {
              e.preventDefault();
              if (IdToUpdate) editClient(IdToUpdate);
            }}>
              <div className="modal-header">
                <h5 className="modal-title">Modifier le client</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" onClick={() => setupdatedText('')}></button>
              </div>
              <div className="modal-body row g-3">
                <div className='col-md-12'>
                  {
                    updatedText !== "" &&
                    <div className="alert alert-success alert-dismissible fade show h-75" role="alert">
                      <i className="bi bi-check-circle-fill "></i>
                      {updatedText}
                      <button type="button" className="btn-close" onClick={() => setupdatedText('')}></button>
                    </div>
                  }
                </div>
                {/* Mêmes champs que pour l'ajout */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Nom</label>
                  <input
                    name="nom"
                    type="text"
                    className={`form-control ${errors.nom ? 'is-invalid' : ''}`}
                    placeholder="Saisissez le nom..."
                    value={formData.nom}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.nom && <div className="invalid-feedback">{errors.nom}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Prénom</label>
                  <input
                    name="prenom"
                    type="text"
                    className={`form-control ${errors.prenom ? 'is-invalid' : ''}`}
                    placeholder="Saisissez le prénom..."
                    value={formData.prenom}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.prenom && <div className="invalid-feedback">{errors.prenom}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Email</label>
                  <input
                    name="email"
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="Saisissez l'email..."
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Téléphone</label>
                  <input
                    name="telephone"
                    type="tel"
                    className={`form-control ${errors.telephone ? 'is-invalid' : ''}`}
                    placeholder="Saisissez le téléphone..."
                    value={formData.telephone}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.telephone && <div className="invalid-feedback">{errors.telephone}</div>}
                </div>
  
                {/* Autres champs comme dans le formulaire d'ajout */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Type de visa</label>
                  <select
                    name="type_visa"
                    className={`form-select ${errors.type_visa ? 'is-invalid' : ''}`}
                    value={formData.type_visa}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Sélectionnez un type de visa --</option>
                    <option value="tourisme">Visa Tourisme</option>
                    <option value="Sans visa">Sans Visa</option>
                    <option value="études">Visa Études</option>
                  </select>
                  {errors.type_visa && <div className="invalid-feedback">{errors.type_visa}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Statut de paiement</label>
                  <select
                    name="payement"
                    className={`form-select ${errors.payement ? 'is-invalid' : ''}`}
                    value={formData.payement}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Sélectionnez un statut --</option>
                    <option value="payer">Payé</option>
                    <option value="pas_payer">Non payé</option>
                    <option value="partielle">Paiement partiel</option>
                  </select>
                  {errors.payement && <div className="invalid-feedback">{errors.payement}</div>}
                </div>
  
                {/* Documents */}
                <div className="col-md-12">
                  <label className="form-label fw-bold">Documents (nouveaux documents)</label>
                  {selectedFiles.length > 0 && (
                    <ul className="list-unstyled mb-2">
                      {selectedFiles.map((file, index) => (
                        <li key={index} className="text-muted small">📄 {file.name}</li>
                      ))}
                    </ul>
                  )}
                  <span className='d-flex justify-content-between gap-3'>
                    <input
                      name="documents"
                      type="file"
                      multiple
                      className="form-control"
                      onChange={handleInputChange}
                    />
                    <button className='btn btn-outline-success' type="button" onClick={(e) => {
              e.preventDefault();
              if (IdToUpdate) UpdateDocuments(IdToUpdate);
            }} >
                      {uploaded ? " ... " : " modifier"}
                    </button>
                  </span>
                </div>
  
                {/* Message d'erreur API dans le formulaire d'édition */}
                {errorsApi && (
                  <div className="col-12 mt-3">
                    <div className="alert alert-danger">{errorsApi}</div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={() => setupdatedText('')}>Fermer</button>
                <button type="submit" className="btn btn-primary" disabled={loading1}>
                  {loading1 ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" ></span>
                      Mise à jour en cours...
                    </>
                  ) : "Mettre à jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
        )
      }

      {/* Modal de confirmation pour la suppression */}
      {ShowModalVerify && (
        <div className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmation</h5>
                <button type="button" className="btn-close" onClick={() => setShowModalVerify(false)}></button>
              </div>
              <div className="modal-body">
                <p>Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.</p>
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
                {/* <button type="button" className="btn btn-danger" onClick={() =>confirmText == "adminDelete" && IdToDelete && deleteClient(IdToDelete)}>
                  Supprimer
                </button> */}
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={confirmText.trim() !== "adminDelete"}
                  onClick={() => {
                    if (confirmText.trim() === "adminDelete" && IdToDelete) {
                      deleteClient(IdToDelete);
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
      )}

      {/* Utilisation du composant ClientDetailModal */}
      {showDetailModal && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setShowDetailModal(false)}
        />
      )}

    </div>
  );
};

export default Clients;
