const fs = require('fs');
const path = require('path');
const { uploadsDir, createDossierFolder, deleteFile, deleteDossierFolder, listDossierFiles } = require('../middleware/upload');

class DocumentService {
    
    /**
     * Sauvegarde les informations des documents uploadés dans la base de données
     * @param {Array} files - Tableau des fichiers uploadés par multer
     * @param {number} clientId - ID du client
     * @param {number} dossierId - ID du dossier étudiant
     * @returns {Object} - Objet JSON des documents requis
     */
    static formatDocumentsForDatabase(files, clientId, dossierId) {
        if (!files || files.length === 0) {
            return {};
        }

        const documentsInfo = {};
        
        files.forEach((file, index) => {
            const documentKey = `document_${index + 1}`;
            documentsInfo[documentKey] = {
                originalName: file.originalname,
                filename: file.filename,
                path: file.path,
                relativePath: path.join('dossiers-etudiants', `client-${clientId}`, `dossier-${dossierId}`, file.filename),
                size: file.size,
                mimetype: file.mimetype,
                uploadDate: new Date().toISOString()
            };
        });

        return documentsInfo;
    }

    /**
     * Récupère la liste des documents d'un dossier étudiant
     * @param {number} clientId - ID du client
     * @param {number} dossierId - ID du dossier étudiant
     * @returns {Array} - Liste des documents
     */
    static getDocumentsList(clientId, dossierId) {
        return listDossierFiles(clientId, dossierId);
    }

    /**
     * Ajoute de nouveaux documents à un dossier existant
     * @param {Array} files - Nouveaux fichiers
     * @param {number} clientId - ID du client
     * @param {number} dossierId - ID du dossier étudiant
     * @param {Object} existingDocuments - Documents existants en base
     * @returns {Object} - Nouveaux documents requis formatés
     */
    static addDocumentsToExisting(files, clientId, dossierId, existingDocuments = {}) {
        if (!files || files.length === 0) {
            return existingDocuments;
        }

        const updatedDocuments = { ...existingDocuments };
        
        // Trouver le prochain index disponible
        let nextIndex = Object.keys(updatedDocuments).length + 1;
        
        files.forEach((file) => {
            const documentKey = `document_${nextIndex}`;
            updatedDocuments[documentKey] = {
                originalName: file.originalname,
                filename: file.filename,
                path: file.path,
                relativePath: path.join('dossiers-etudiants', `client-${clientId}`, `dossier-${dossierId}`, file.filename),
                size: file.size,
                mimetype: file.mimetype,
                uploadDate: new Date().toISOString()
            };
            nextIndex++;
        });

        return updatedDocuments;
    }

    /**
     * Supprime un document spécifique
     * @param {string} documentKey - Clé du document à supprimer
     * @param {Object} documentsData - Données des documents du dossier
     * @param {number} clientId - ID du client
     * @param {number} dossierId - ID du dossier étudiant
     * @returns {Object} - Documents mis à jour
     */
    static removeDocument(documentKey, documentsData, clientId, dossierId) {
        const updatedDocuments = { ...documentsData };
        
        if (updatedDocuments[documentKey]) {
            const documentInfo = updatedDocuments[documentKey];
            const fullPath = path.join(uploadsDir, documentInfo.relativePath);
            
            // Supprimer le fichier physique
            deleteFile(fullPath);
            
            // Supprimer de l'objet
            delete updatedDocuments[documentKey];
        }

        return updatedDocuments;
    }

    /**
     * Supprime tous les documents d'un dossier
     * @param {number} clientId - ID du client
     * @param {number} dossierId - ID du dossier étudiant
     * @returns {boolean} - Succès de l'opération
     */
    static removeAllDocuments(clientId, dossierId) {
        return deleteDossierFolder(clientId, dossierId);
    }

    /**
     * Crée la structure de dossier pour un nouveau dossier étudiant
     * @param {number} clientId - ID du client
     * @param {number} dossierId - ID du dossier étudiant
     * @returns {string} - Chemin du dossier créé
     */
    static initializeDossierFolder(clientId, dossierId) {
        return createDossierFolder(clientId, dossierId);
    }

    /**
     * Vérifie si un fichier existe physiquement
     * @param {string} relativePath - Chemin relatif du fichier
     * @returns {boolean} - Existence du fichier
     */
    static fileExists(relativePath) {
        const fullPath = path.join(uploadsDir, relativePath);
        return fs.existsSync(fullPath);
    }

    /**
     * Obtient le chemin complet d'un fichier
     * @param {string} relativePath - Chemin relatif du fichier
     * @returns {string} - Chemin complet
     */
    static getFullPath(relativePath) {
        return path.join(uploadsDir, relativePath);
    }

    /**
     * Valide l'intégrité des documents d'un dossier
     * @param {Object} documentsData - Données des documents en base
     * @param {number} clientId - ID du client
     * @param {number} dossierId - ID du dossier étudiant
     * @returns {Object} - Rapport de validation
     */
    static validateDocumentsIntegrity(documentsData, clientId, dossierId) {
        const validation = {
            valid: true,
            missingFiles: [],
            orphanedFiles: [],
            totalDocuments: 0,
            validDocuments: 0
        };

        if (!documentsData || Object.keys(documentsData).length === 0) {
            return validation;
        }

        // Vérifier les fichiers référencés en base
        Object.keys(documentsData).forEach(key => {
            validation.totalDocuments++;
            const doc = documentsData[key];
            
            if (this.fileExists(doc.relativePath)) {
                validation.validDocuments++;
            } else {
                validation.valid = false;
                validation.missingFiles.push({
                    key,
                    filename: doc.filename,
                    originalName: doc.originalName
                });
            }
        });

        // Vérifier les fichiers orphelins dans le dossier
        const physicalFiles = this.getDocumentsList(clientId, dossierId);
        const referencedFiles = Object.values(documentsData).map(doc => doc.filename);
        
        physicalFiles.forEach(file => {
            if (!referencedFiles.includes(file.filename)) {
                validation.orphanedFiles.push(file);
                validation.valid = false;
            }
        });

        return validation;
    }
}

module.exports = DocumentService;
