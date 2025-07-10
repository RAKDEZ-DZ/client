import React from 'react';
import '../assets/pdf-styles.css';

interface FacturePreviewProps {
  selectedItem: any;
  activeTab: 'devis' | 'factures';
  getBadgeColor: (statut: string) => string;
}

/**
 * Composant pour la prévisualisation de facture/devis
 * Utilisé à la fois pour l'affichage dans la modal et la génération de PDF
 */
const FacturePreview: React.FC<FacturePreviewProps> = ({ selectedItem, activeTab, getBadgeColor }) => {
  if (!selectedItem) return null;
  
  const formattedDate = new Date(selectedItem.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  
  // Formatage des montants
  const formatMontant = (montant: string | number): string => {
    if (!montant) return '0,00 DA';
    
    const num = typeof montant === 'string' ? 
      parseFloat(montant.replace(/[^\d,.-]/g, '').replace(',', '.')) : 
      montant;
    
    return num.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' DA';
  };
  
  // Calcul des différents montants pour l'affichage
  const montantHT = typeof selectedItem.montant === 'string' ? 
    parseFloat(selectedItem.montant.replace(/[^\d,.-]/g, '').replace(',', '.')) : 
    selectedItem.montant || 0;
  
  const montantTVA = 0;
  const montantTTC = montantHT * 1.2;
  const montantRestant = typeof selectedItem.montantRestant === 'string' ? 
    parseFloat(selectedItem.montantRestant.replace(/[^\d,.-]/g, '').replace(',', '.')) : 
    selectedItem.montantRestant || 0;
  const montantPaye = montantTTC - montantRestant;
  
  // Récupérer le nom et prénom du client de manière plus robuste
  const nomClient = selectedItem.nom || (selectedItem.client && selectedItem.client.nom) || '';
  const prenomClient = selectedItem.prenom || (selectedItem.client && selectedItem.client.prenom) || '';
  const nomCompletClient = selectedItem.nomPrenom || `${nomClient} ${prenomClient}`.trim();
  
  return (
    <div className="facture-preview" style={{ position: 'relative', zIndex: '1' }}>
      {/* Marge supérieure pour tenir compte de la bordure décorative */}
      <div style={{ marginTop: '15mm' }}></div>
      
      {/* En-tête du document */}
      <div className="d-flex justify-content-between align-items-center mb-5 facture-header">
        <img src="/lg.png" width={"180px"} alt="Logo" style={{ maxHeight: '80px' }} />
        <div className="text-end" style={{ position: 'relative' }}>
          <div style={{ 
            position: 'absolute', 
            top: '-8mm', 
            right: '-8mm', 
            width: '70mm',
            height: '25mm',
            background: 'rgba(0, 174, 239, 0.08)',
            borderRadius: '3mm',
            zIndex: '-1'
          }}></div>
          <h2 style={{ 
            color: '#00AEEF', 
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            paddingRight: '2mm',
            marginBottom: '0.8rem'
          }}>
            {activeTab === 'devis' ? 'DEVIS' : 'FACTURE'} #{selectedItem.id}
          </h2>
          <p className="text-muted mb-1" style={{fontSize: '0.95rem'}}>Date d'émission: <strong>{formattedDate}</strong></p>
          <p className="text-muted" style={{fontSize: '0.95rem'}}>Référence: <strong>{selectedItem.id}</strong></p>
        </div>
      </div>
      
      {/* Informations société et client */}
      <div className="row mb-5">
        <div className="col-6">
          <div className="info-box company p-3" style={{
            boxShadow: '0 3px 10px rgba(0,0,0,0.08)'
          }}>
            <h5 className="mb-3" style={{ color: '#00AEEF', fontWeight: 'bold' }}>Notre Société</h5>
            <p className="mb-1"><strong>Oussama Travel</strong></p>
            <p className="mb-1">En face du deuxième portail de l’université Targa Ouzemour, cité Beau Quartier, au premier étage. </p>
             <p className="mb-1">En face du portail de la gendarmerie de Nacéria. </p>
            <p className="mb-1">Béjaïa 06000</p>
            
            
            <p className="mb-1">Tél: +213 770 41 94 60/+213 044 22 05 06</p>
            <p className="mb-0">Email: contact@oussamatravel.com</p>
          </div>
        </div>
        <div className="col-6">
          <div className="info-box client p-3" style={{
            boxShadow: '0 3px 10px rgba(0,0,0,0.08)'
          }}>
            <h5 className="mb-3" style={{ color: '#00AEEF', fontWeight: 'bold' }}>Client</h5>
            <p className="mb-1"><strong>{nomCompletClient}</strong></p>
            {selectedItem.email && <p className="mb-1">Email: {selectedItem.email}</p>}
            {selectedItem.telephone && <p className="mb-1">Tél: {selectedItem.telephone}</p>}
            <p className="mb-1">Date: {new Date(selectedItem.date).toLocaleDateString('fr-FR')}</p>
            <p className="mb-0">
              Statut: 
              <span className={`status-badge bg-${getBadgeColor(selectedItem.statut)}`} style={{ marginLeft: '8px' }}>
                {selectedItem.statut}
              </span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Détails du service avec design amélioré */}
      <div style={{ position: 'relative', marginBottom: '25px' }}>
        <h5 style={{ 
          color: '#00AEEF', 
          fontWeight: 'bold', 
          display: 'inline-block',
          paddingBottom: '8px', 
          marginBottom: '15px'
        }}>Détails des prestations</h5>
        
        <div style={{ 
          position: 'absolute',
          top: '-10px',
          right: '0',
          width: '30%',
          height: '5px',
          background: 'linear-gradient(90deg, rgba(0, 174, 239, 0.01) 0%, rgba(0, 174, 239, 0.2) 100%)',
          borderRadius: '10px'
        }}></div>
      </div>

      <div className="mb-5">
        <table className="table table-striped table-bordered" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '10%' }}>Référence</th>
              <th style={{ width: '50%' }}>Désignation</th>
              <th style={{ width: '20%' }} className="text-end">Prix Unitaire</th>
              <th style={{ width: '20%' }} className="text-end">Total HT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>REF-{selectedItem.id}</td>
              <td>
                <strong>{selectedItem.dossier}</strong>
                <p className="mb-0 text-muted" style={{ fontSize: '0.9rem', marginTop: '5px' }}>
                  {selectedItem.facture?.description || 'Prestation de services voyage et tourisme'}
                </p>
              </td>
              <td className="text-end">{formatMontant(selectedItem.montant)}</td>
              <td className="text-end">{formatMontant(selectedItem.montant)}</td>
            </tr>
            {/* Ligne vide pour les grands tableaux */}
            <tr style={{ height: '25px' }}>
              <td colSpan={4}></td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={3} className="text-end">Montant Total </th>
              <th className="text-end">{formatMontant(montantHT)}</th>
            </tr>
            {/* <tr>
              <th colSpan={3} className="text-end">TVA (20%)</th>
              <th className="text-end">{formatMontant(montantTVA)}</th>
            </tr> */}
            {/* <tr>
              <th colSpan={3} className="text-end">Total TTC</th>
              <th className="text-end amount-highlight">{formatMontant(montantTTC)}</th>
            </tr> */}
            {selectedItem.montantRestant && parseFloat(selectedItem.montantRestant) > 0 && (
              <>
                <tr>
                  <th colSpan={3} className="text-end">Déjà payé</th>
                  <th className="text-end">
                    {formatMontant(montantPaye)}
                  </th>
                </tr>
                <tr>
                  <th colSpan={3} className="text-end">Reste à payer</th>
                  <th className="text-end amount-highlight">{formatMontant(montantRestant)}</th>
                </tr>
              </>
            )}
          </tfoot>
        </table>
      </div>
      
      {/* Note et conditions de paiement */}
      <div style={{ 
        padding: '15px',
        backgroundColor: 'rgba(0, 174, 239, 0.05)', 
        borderRadius: '4px',
        marginBottom: '20px',
        borderLeft: '4px solid rgba(0, 174, 239, 0.3)'
      }}>
      </div>
      
      {/* Élément décoratif en bas de page */}
      
    </div>
  );
};

export default FacturePreview;
