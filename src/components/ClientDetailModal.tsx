import React from 'react';
import { ClientType } from './Clients'; // Importer le type depuis Clients.tsx
import apiClient from '../api/apiConfig';

interface ClientDetailModalProps {
  client: ClientType | null;
  onClose: () => void;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose }) => {
  if (!client) return null;

  // Fonction pour formater le statut du client
  const formatStatus = (status: string | undefined) => {
    switch (status) {
      case 'nouveau': return 'Nouveau';
      case 'inscrit': return 'Inscrit';
      case 'en_cours': return 'En cours';
      case 'incomplet': return 'Incomplet';
      case 'admission_recu': return 'Admission reçue';
      case 'refus': return 'Refusé';
      case 'accepter': return 'Accepté';
      case 'partie_visa': return 'Partie visa';
      case 'terminer': return 'Terminé';
      default: return status || 'Non défini';
    }
  };

  // Fonction pour afficher le badge de paiement
  const renderPaymentStatus = (status: string | undefined) => {
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

  // Fonction pour ouvrir un document dans un nouvel onglet avec token d'authentification
  const openDocument = (url: string | undefined) => {
    if (url) {
      const fullUrl = getDocumentUrl(url);
      console.log('Ouverture du document:', fullUrl);
      
      // Créer un nouvel onglet avec une page vide
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write('Chargement du document en cours...');
      }
      
      // Obtenir le token depuis localStorage
      const token = localStorage.getItem('authToken');
      
      // Créer une requête avec le token d'authentification
      fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Créer une URL pour le blob
        const blobUrl = URL.createObjectURL(blob);
        
        if (newWindow) {
          newWindow.location.href = blobUrl;
        } else {
          window.open(blobUrl, '_blank');
        }
      })
      .catch(error => {
        console.error('Erreur lors de l\'ouverture du document:', error);
        if (newWindow) {
          newWindow.document.write(`<div>Erreur lors du chargement du document: ${error.message}</div>`);
        }
        alert(`Erreur lors de l'ouverture du document: ${error.message}`);
      });
    }
  };
  
  // Helper pour extraire le bon nom et URL du document
  const getDocumentInfo = (doc: any) => {
    // Trouver le nom du document pour l'affichage
    const displayName = doc.name || doc.originalname || doc.filename || 'Document';
    
    // Extraire le nom de fichier pour l'URL
    let filename = '';
    let docId = '';
    
    // Récupérer l'ID du document s'il existe
    if (doc.id) {
      docId = doc.id;
    }
    
    // Ordre de priorité pour trouver le nom du fichier
    if (doc.filename) {
      filename = doc.filename;
    } else if (doc.path) {
      const parts = doc.path.split(/[\/\\]/); // Diviser par / ou \
      filename = parts[parts.length - 1];
    } else if (doc.url) {
      // Essayer d'extraire le nom du fichier de l'URL
      let urlPath = doc.url;
      
      // Supprimer les paramètres de requête s'il y en a
      if (urlPath.includes('?')) {
        urlPath = urlPath.split('?')[0];
      }
      
      const parts = urlPath.split(/[\/\\]/);
      filename = parts[parts.length - 1];
    } else if (doc.relativePath) {
      const parts = doc.relativePath.split(/[\/\\]/);
      filename = parts[parts.length - 1];
    } else {
      // Générer un nom de fichier par défaut
      filename = `document-${Date.now()}`;
    }
    
    console.log('Document analysé:', { doc, filename, docId });
    
    // Créer l'URL pour l'API de documents avec notre nouvelle route de téléchargement
    const url = client && client.id && docId
      ? `/api/clients/${client.id}/documents/${docId}/download`
      : '';
    
    console.log('Document info:', { displayName, filename, url });
    return { name: displayName, url };
  };

  // Déboguer les documents
  console.log('Documents du client:', client.documents);
  
  // Fonction pour formater l'URL du document
  const getDocumentUrl = (url: string | undefined) => {
    if (!url) return '';
    
    // Si l'URL est déjà complète (commence par http:// ou https://)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Utiliser la nouvelle route API dédiée aux documents
    const baseUrl = apiClient.defaults.baseURL || '';
    
    // L'URL est relative à l'API, construire l'URL complète
    const formattedUrl = `${baseUrl}${url}`;
    
    console.log('URL formatée pour téléchargement (ClientDetailModal):', formattedUrl);
    return formattedUrl;
  };

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              Détails du client: {client.nom} {client.prenom}
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              aria-label="Fermer"
            ></button>
          </div>
          <div className="modal-body">
            <div className="row g-3">
              {/* Informations personnelles */}
              <div className="col-12">
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">Informations personnelles</h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-2">
                      <div className="col-md-6">
                        <p><strong>Nom:</strong> {client.nom}</p>
                        <p><strong>Prénom:</strong> {client.prenom}</p>
                        <p><strong>Email:</strong> {client.email}</p>
                        <p><strong>Email voyage:</strong> {client.email}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Téléphone:</strong> {client.telephone}</p>
                        <p><strong>Statut:</strong> {formatStatus(client.statut)}</p>
                        <p><strong>Paiement:</strong> {renderPaymentStatus(client.payement)}</p>
                        <p><strong>mot de passe:</strong> {client.mot_de_passe}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations de visa */}
              <div className="col-12">
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">Informations de visa</h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-2">
                      <div className="col-md-6">
                        <p><strong>Type de visa:</strong> {client.type_visa}</p>
                        <p><strong>État du dossier:</strong> {client.etat_dossier}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Pays de destination:</strong> {client.pays_destination || 'Non spécifié'}</p>
                        {client.type_visa === 'études' && (
                          <>
                            <p><strong>Université:</strong> {client.universite_destination || 'Non spécifiée'}</p>
                            <p><strong>Programme d'étude:</strong> {client.programme_etude || 'Non spécifié'}</p>
                            <p><strong>Niveau d'étude:</strong> {client.niveau_etude || 'Non spécifié'}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="col-12">
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">Documents</h6>
                  </div>
                  <div className="card-body">
                    {Array.isArray(client.documents) && client.documents.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-sm table-hover">
                          <thead>
                            <tr>
                              <th>Nom</th>
                              <th>Type</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {client.documents.map((doc, idx) => (
                              <tr key={idx}>
                                <td>{doc.name || `Document ${idx + 1}`}</td>
                                <td>{doc.type || 'Non spécifié'}</td>
                                <td>
                                  <div className="btn-group btn-group-sm">
                                    <button 
                                      className="btn btn-outline-primary"
                                      onClick={() => {
                                        const { url } = getDocumentInfo(doc);
                                        if (url) {
                                          openDocument(url);
                                        } else {
                                          alert('Impossible d\'ouvrir ce document: URL non valide.');
                                        }
                                      }}
                                    >
                                      <i className="bi bi-eye"></i> Visualiser
                                    </button>
                                    <button 
                                      className="btn btn-outline-success"
                                      onClick={() => {
                                        const { url } = getDocumentInfo(doc);
                                        if (!url) {
                                          alert('Impossible de télécharger ce document: URL non valide.');
                                          return;
                                        }
                                        
                                        // Obtenir le token depuis localStorage
                                        const token = localStorage.getItem('authToken');
                                        
                                        // Afficher indicateur de chargement
                                        const downloadBtn = document.activeElement as HTMLElement;
                                        const originalText = downloadBtn.innerHTML;
                                        downloadBtn.innerHTML = '<i class="bi bi-hourglass"></i> Téléchargement...';
                                        downloadBtn.setAttribute('disabled', 'true');
                                        
                                        // Créer une requête avec le token d'authentification
                                        fetch(getDocumentUrl(url), {
                                          headers: {
                                            'Authorization': `Bearer ${token}`
                                          }
                                        })
                                        .then(response => {
                                          if (!response.ok) {
                                            throw new Error(`Erreur HTTP: ${response.status}`);
                                          }
                                          return response.blob();
                                        })
                                        .then(blob => {
                                          // Créer une URL pour le blob
                                          const blobUrl = URL.createObjectURL(blob);
                                          
                                          // Créer un lien temporaire pour télécharger le fichier
                                          const a = document.createElement('a');
                                          a.href = blobUrl;
                                          a.download = doc.name || doc.originalName  || doc.filename || 'document';
                                          document.body.appendChild(a);
                                          a.click();
                                          
                                          // Nettoyer
                                          setTimeout(() => {
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(blobUrl);
                                          }, 100);
                                        })
                                        .catch(error => {
                                          console.error('Erreur lors du téléchargement du document:', error);
                                          alert(`Erreur lors du téléchargement du document: ${error.message}`);
                                        })
                                        .finally(() => {
                                          // Restaurer le bouton
                                          downloadBtn.innerHTML = originalText;
                                          downloadBtn.removeAttribute('disabled');
                                        });
                                      }}
                                    >
                                      <i className="bi bi-download"></i> Télécharger
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted">Aucun document disponible pour ce client</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="col-12">
                <div className="card">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">Notes</h6>
                  </div>
                  <div className="card-body">
                    {client.notes ? (
                      <p>{client.notes}</p>
                    ) : (
                      <p className="text-muted">Aucune note disponible</p>
                    )}
                  </div>
                </div>
              </div>

         
   
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailModal;
