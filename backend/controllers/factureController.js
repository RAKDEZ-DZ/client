const Facture = require('../model/facture');

class FactureController {
    
    // Créer une nouvelle facture
    static async create(req, res) {
        try {
            const facture = await Facture.create(req.body);
            res.status(201).json({
                success: true,
                message: 'Facture créée avec succès',
                data: facture
            });
        } catch (error) {
            console.error('Erreur création facture:', error);
            res.status(400).json({
                success: false,
                message: 'Erreur lors de la création de la facture',
                error: error.message
            });
        }
    }

    // Créer une facture à partir d'un devis
    static async createFromDevis(req, res) {
        try {
            const { devisId } = req.params;
            
            const facture = await Facture.findById(parseInt(devisId));
            
            if (!facture) {
                return res.status(404).json({
                    success: false,
                    message: 'Facture/Devis non trouvé'
                });
            }

            if (facture.type_facture !== 'devis') {
                return res.status(400).json({
                    success: false,
                    message: 'Cette facture n\'est pas un devis'
                });
            }

            const factureOfficielle = await facture.convertirEnFacture();
            
            res.status(201).json({
                success: true,
                message: 'Devis converti en facture avec succès',
                data: factureOfficielle
            });
        } catch (error) {
            console.error('Erreur conversion devis en facture:', error);
            res.status(400).json({
                success: false,
                message: 'Erreur lors de la conversion en facture',
                error: error.message
            });
        }
    }

    // Récupérer toutes les factures avec pagination et filtres
    static async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 50,
                statut,
                type_facture,
                client_id,
                date_debut,
                date_fin,
                echeance_proche
            } = req.query;

            const offset = (page - 1) * limit;
            const filters = {};

            if (statut) filters.statut = statut;
            if (type_facture) filters.type_facture = type_facture;
            if (client_id) filters.client_id = parseInt(client_id);
            if (date_debut) filters.date_debut = date_debut;
            if (date_fin) filters.date_fin = date_fin;
            if (echeance_proche === 'true') filters.echeance_proche = true;

            const factures = await Facture.findAll(parseInt(limit), offset, filters);
            
            res.json({
                success: true,
                data: factures,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: factures.length
                }
            });
        } catch (error) {
            console.error('Erreur récupération factures:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des factures',
                error: error.message
            });
        }
    }

    // Récupérer une facture par ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const facture = await Facture.findById(parseInt(id));
            
            if (!facture) {
                return res.status(404).json({
                    success: false,
                    message: 'Facture non trouvée'
                });
            }

            res.json({
                success: true,
                data: facture
            });
        } catch (error) {
            console.error('Erreur récupération facture:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de la facture',
                error: error.message
            });
        }
    }

    // Récupérer une facture par numéro
    static async getByNumero(req, res) {
        try {
            const { numero } = req.params;
            const facture = await Facture.findByNumero(numero);
            
            if (!facture) {
                return res.status(404).json({
                    success: false,
                    message: 'Facture non trouvée'
                });
            }

            res.json({
                success: true,
                data: facture
            });
        } catch (error) {
            console.error('Erreur récupération facture:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de la facture',
                error: error.message
            });
        }
    }

    // Récupérer les factures d'un client
    static async getByClient(req, res) {
        try {
            const { clientId } = req.params;
            const factures = await Facture.findByClientId(parseInt(clientId));
            
            res.json({
                success: true,
                data: factures
            });
        } catch (error) {
            console.error('Erreur récupération factures client:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des factures du client',
                error: error.message
            });
        }
    }

    // Mettre à jour une facture
    static async update(req, res) {
        try {
            const { id } = req.params;
            const facture = await Facture.findById(parseInt(id));
            
            if (!facture) {
                return res.status(404).json({
                    success: false,
                    message: 'Facture non trouvée'
                });
            }

            // Permettre la mise à jour des montants de paiement même si la facture n'est plus en brouillon
            if (facture.statut !== 'brouillon' && 
                !(['montant_paye', 'montant_restant'].every(field => Object.keys(req.body).includes(field)) && 
                  Object.keys(req.body).length <= 3)) { // Permettre aussi 'statut' comme champ optionnel
                console.log('Tentative de modification d\'une facture non en brouillon avec champs:', Object.keys(req.body));
                console.log('Statut actuel:', facture.statut);
                return res.status(400).json({
                    success: false,
                    message: `Modification limitée: cette facture a le statut "${facture.statut}" et non "brouillon"`,
                    allowedFields: ['montant_paye', 'montant_restant']
                });
            }

            const updatedFacture = await facture.update(req.body);
            
            res.json({
                success: true,
                message: 'Facture mise à jour avec succès',
                data: updatedFacture
            });
        } catch (error) {
            console.error('Erreur mise à jour facture:', error);
            res.status(400).json({
                success: false,
                message: 'Erreur lors de la mise à jour de la facture',
                error: error.message
            });
        }
    }

    // Changer le statut d'une facture
    static async changeStatut(req, res) {
        try {
            const { id } = req.params;
            const { statut } = req.body;
            
            const facture = await Facture.findById(parseInt(id));
            
            if (!facture) {
                return res.status(404).json({
                    success: false,
                    message: 'Facture non trouvée'
                });
            }

            const updatedFacture = await facture.changerStatut(statut);
            
            res.json({
                success: true,
                message: `Statut de la facture changé en ${statut}`,
                data: updatedFacture
            });
        } catch (error) {
            console.error('Erreur changement statut facture:', error);
            res.status(400).json({
                success: false,
                message: 'Erreur lors du changement de statut',
                error: error.message
            });
        }
    }

    // Enregistrer un paiement
    static async enregistrerPaiement(req, res) {
        try {
            const { id } = req.params;
            const { montant, methode_paiement, reference_transaction, notes } = req.body;
            
            if (!montant || montant <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Montant du paiement invalide'
                });
            }

            if (!methode_paiement) {
                return res.status(400).json({
                    success: false,
                    message: 'Méthode de paiement requise'
                });
            }

            const facture = await Facture.findById(parseInt(id));
            
            if (!facture) {
                return res.status(404).json({
                    success: false,
                    message: 'Facture non trouvée'
                });
            }

            if (facture.statut === 'payee') {
                return res.status(400).json({
                    success: false,
                    message: 'Cette facture est déjà entièrement payée'
                });
            }

            if (montant > facture.montant_restant) {
                return res.status(400).json({
                    success: false,
                    message: 'Le montant du paiement dépasse le montant restant'
                });
            }

            const updatedFacture = await facture.enregistrerPaiement(
                montant, 
                methode_paiement, 
                reference_transaction, 
                notes
            );
            
            res.json({
                success: true,
                message: 'Paiement enregistré avec succès',
                data: updatedFacture
            });
        } catch (error) {
            console.error('Erreur enregistrement paiement:', error);
            res.status(400).json({
                success: false,
                message: 'Erreur lors de l\'enregistrement du paiement',
                error: error.message
            });
        }
    }

    // Générer une facture d'acompte
    static async genererAcompte(req, res) {
        try {
            const { id } = req.params;
            const { pourcentage } = req.body;
            
            if (!pourcentage || pourcentage <= 0 || pourcentage >= 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Pourcentage d\'acompte invalide (doit être entre 1 et 99)'
                });
            }

            const facture = await Facture.findById(parseInt(id));
            
            if (!facture) {
                return res.status(404).json({
                    success: false,
                    message: 'Facture non trouvée'
                });
            }

            const factureAcompte = await facture.genererFactureAcompte(pourcentage);
            
            res.status(201).json({
                success: true,
                message: `Facture d'acompte de ${pourcentage}% générée avec succès`,
                data: factureAcompte
            });
        } catch (error) {
            console.error('Erreur génération acompte:', error);
            res.status(400).json({
                success: false,
                message: 'Erreur lors de la génération de la facture d\'acompte',
                error: error.message
            });
        }
    }

    // Dupliquer une facture
    static async duplicate(req, res) {
        try {
            const { id } = req.params;
            const facture = await Facture.findById(parseInt(id));
            
            if (!facture) {
                return res.status(404).json({
                    success: false,
                    message: 'Facture non trouvée'
                });
            }

            const duplicatedFacture = await facture.duplicate();
            
            res.status(201).json({
                success: true,
                message: 'Facture dupliquée avec succès',
                data: duplicatedFacture
            });
        } catch (error) {
            console.error('Erreur duplication facture:', error);
            res.status(400).json({
                success: false,
                message: 'Erreur lors de la duplication de la facture',
                error: error.message
            });
        }
    }

    // Supprimer une facture
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const facture = await Facture.findById(parseInt(id));
            
            if (!facture) {
                return res.status(404).json({
                    success: false,
                    message: 'Facture non trouvée'
                });
            }

            await facture.delete();
            
            res.json({
                success: true,
                message: 'Facture supprimée avec succès'
            });
        } catch (error) {
            console.error('Erreur suppression facture:', error);
            res.status(400).json({
                success: false,
                message: 'Erreur lors de la suppression de la facture',
                error: error.message
            });
        }
    }

    // Obtenir les statistiques des factures
    static async getStatistics(req, res) {
        try {
            const stats = await Facture.getStatistics();
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Erreur statistiques factures:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statistiques',
                error: error.message
            });
        }
    }

    // Rechercher des factures
    static async search(req, res) {
        try {
            const { q, limit = 20 } = req.query;
            
            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Terme de recherche requis'
                });
            }

            const factures = await Facture.search(q, parseInt(limit));
            
            res.json({
                success: true,
                data: factures
            });
        } catch (error) {
            console.error('Erreur recherche factures:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la recherche',
                error: error.message
            });
        }
    }

    // Créer une facturation récurrente
    static async creerFacturationRecurrente(req, res) {
        try {
            const {
                client_id,
                dossier_id,
                type_service,
                montant_total,
                nombre_echeances,
                date_debut,
                frequence,
                titre
            } = req.body;

            // Validation des données
            if (!client_id || !montant_total || !nombre_echeances || !date_debut || !frequence || !titre) {
                return res.status(400).json({
                    success: false,
                    message: 'Données manquantes pour la facturation récurrente'
                });
            }

            if (nombre_echeances < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nombre d\'échéances doit être au moins de 2'
                });
            }

            const parametres = {
                montantTotal: montant_total,
                nombreEcheances: nombre_echeances,
                dateDebut: date_debut,
                frequence: frequence,
                titre: titre
            };

            const factures = await Facture.creerFacturationRecurrente(
                client_id,
                dossier_id,
                type_service,
                parametres
            );
            
            res.status(201).json({
                success: true,
                message: `${factures.length} factures créées pour la facturation récurrente`,
                data: factures
            });
        } catch (error) {
            console.error('Erreur facturation récurrente:', error);
            res.status(400).json({
                success: false,
                message: 'Erreur lors de la création de la facturation récurrente',
                error: error.message
            });
        }
    }

    // Obtenir les factures échues ou proches de l'échéance
    static async getFacturesEchues(req, res) {
        try {
            const { jours = 7 } = req.query; // Par défaut, factures échéant dans les 7 prochains jours
            
            const factures = await Facture.findAll(100, 0, {
                echeance_proche: true
            });
            
            res.json({
                success: true,
                data: factures,
                message: `${factures.length} facture(s) échéant dans les ${jours} prochains jours`
            });
        } catch (error) {
            console.error('Erreur factures échues:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des factures échues',
                error: error.message
            });
        }
    }

    // Générer un rapport de facturation
    static async genererRapport(req, res) {
        try {
            const { 
                date_debut, 
                date_fin, 
                client_id, 
                type_rapport = 'synthese' 
            } = req.query;

            const filters = {};
            if (date_debut) filters.date_debut = date_debut;
            if (date_fin) filters.date_fin = date_fin;
            if (client_id) filters.client_id = parseInt(client_id);

            const factures = await Facture.findAll(1000, 0, filters);
            const stats = await Facture.getStatistics();

            const rapport = {
                periode: {
                    debut: date_debut || 'Toutes',
                    fin: date_fin || 'Toutes'
                },
                statistiques: stats,
                factures: factures,
                resume: {
                    nombre_factures: factures.length,
                    montant_total_facture: factures.reduce((sum, f) => sum + f.montant_final, 0),
                    montant_paye: factures.reduce((sum, f) => sum + f.montant_paye, 0),
                    montant_impaye: factures.reduce((sum, f) => sum + f.montant_restant, 0)
                }
            };

            res.json({
                success: true,
                data: rapport
            });
        } catch (error) {
            console.error('Erreur génération rapport:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la génération du rapport',
                error: error.message
            });
        }
    }

    // Template de facture pour différents services
    static async getTemplate(req, res) {
        try {
            const { type } = req.params; // 'voyage', 'etudiant', 'visa'
            
            const templates = {
                voyage: {
                    titre: 'Facture - Voyage organisé',
                    type_facture: 'standard',
                    lignes: [
                        {
                            designation: 'Billets d\'avion',
                            description: 'Billets aller-retour',
                            quantite: 1,
                            prix_unitaire_ht: 500,
                            taux_tva: 20
                        },
                        {
                            designation: 'Hébergement',
                            description: 'Hôtel 3 étoiles - 7 nuits',
                            quantite: 7,
                            prix_unitaire_ht: 80,
                            taux_tva: 20
                        },
                        {
                            designation: 'Assurance voyage',
                            description: 'Assurance complète',
                            quantite: 1,
                            prix_unitaire_ht: 50,
                            taux_tva: 20
                        }
                    ],
                    conditions_paiement: 'Paiement à 30 jours. Acompte de 30% à la réservation.'
                },
                etudiant: {
                    titre: 'Facture - Dossier étudiant',
                    type_facture: 'standard',
                    lignes: [
                        {
                            designation: 'Frais de dossier',
                            description: 'Constitution du dossier administratif',
                            quantite: 1,
                            prix_unitaire_ht: 200,
                            taux_tva: 20
                        },
                        {
                            designation: 'Traduction documents',
                            description: 'Traduction certifiée des documents',
                            quantite: 5,
                            prix_unitaire_ht: 30,
                            taux_tva: 20
                        },
                        {
                            designation: 'Accompagnement visa',
                            description: 'Accompagnement pour la demande de visa',
                            quantite: 1,
                            prix_unitaire_ht: 150,
                            taux_tva: 20
                        }
                    ],
                    conditions_paiement: 'Paiement à 30 jours.'
                },
                visa: {
                    titre: 'Facture - Demande de visa',
                    type_facture: 'standard',
                    lignes: [
                        {
                            designation: 'Frais consulaires',
                            description: 'Frais officiels du consulat',
                            quantite: 1,
                            prix_unitaire_ht: 60,
                            taux_tva: 0
                        },
                        {
                            designation: 'Frais de service',
                            description: 'Accompagnement et suivi du dossier',
                            quantite: 1,
                            prix_unitaire_ht: 100,
                            taux_tva: 20
                        }
                    ],
                    conditions_paiement: 'Paiement immédiat. Les frais consulaires sont non remboursables.'
                },
                devis: {
                    titre: 'Devis - Service personnalisé',
                    type_facture: 'devis',
                    lignes: [
                        {
                            designation: 'Service principal',
                            description: 'Description du service',
                            quantite: 1,
                            prix_unitaire_ht: 100,
                            taux_tva: 20
                        }
                    ],
                    conditions_paiement: 'Devis valable 30 jours.'
                }
            };

            const template = templates[type];
            
            if (!template) {
                return res.status(400).json({
                    success: false,
                    message: 'Type de template non valide. Types disponibles: voyage, etudiant, visa, devis'
                });
            }

            res.json({
                success: true,
                data: template
            });
        } catch (error) {
            console.error('Erreur template facture:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération du template',
                error: error.message
            });
        }
    }

    // Mettre à jour automatiquement le statut de toutes les factures selon les paiements
    static async updateAllStatuts(req, res) {
        try {
            const compteurMisAJour = await Facture.mettreAJourTousLesStatuts();
            
            res.json({
                success: true,
                message: `Statuts mis à jour avec succès`,
                data: {
                    facturesMisesAJour: compteurMisAJour
                }
            });
        } catch (error) {
            console.error('Erreur mise à jour statuts:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour des statuts',
                error: error.message
            });
        }
    }
}

module.exports = FactureController;
