const express = require('express');
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const router = express.Router();

// Middleware d'authentification
const { authenticateToken: authenticate } = require('../middleware/auth');

// Obtenir le chemin absolu du répertoire uploads
const uploadsDir = path.join(__dirname, '../uploads');

// Route pour servir un document par son chemin relatif
router.get('/:clientId/:filename', authenticate, (req, res) => {
    try {
        const { clientId, filename } = req.params;
        console.log(`Tentative d'accès au document: clientId=${clientId}, filename=${filename}`);
        
        // Vérifier si le nom de fichier contient des tentatives de traversée de répertoire
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({
                success: false,
                message: 'Nom de fichier invalide'
            });
        }
        
        // Construire le chemin vers le fichier
        let filePath;
        
        // Essayer plusieurs chemins possibles pour trouver le fichier
        const possiblePaths = [
            // 1. Chemin spécifique au dossier d'étudiant
            path.join(uploadsDir, 'dossiers-etudiants', `client-${clientId}`, filename),
            // 2. Chemin spécifique au client (sans sous-dossier de dossier)
            path.join(uploadsDir, 'dossiers-etudiants', `client-${clientId}`, filename),
            // 3. Chemin spécifique au client avec préfixe "dossier-" dans le nom
            path.join(uploadsDir, 'dossiers-etudiants', `client-${clientId}`, `dossier-*`, filename),
            // 4. Chemin dans la racine du dossier uploads avec préfixe "client-{id}"
            path.join(uploadsDir, `client-${clientId}-*`),
            // 5. Chemin général dans la racine du dossier uploads
            path.join(uploadsDir, filename)
        ];
        
        // Vérifier chaque chemin possible
        console.log("Recherche du fichier dans les chemins suivants:");
        
        // Fonction pour tester l'existence d'un chemin, y compris avec des wildcards
        const findFile = (pathPattern) => {
            console.log(`- Vérification: ${pathPattern}`);
            
            // Si le chemin contient un astérisque, utiliser glob pour le trouver
            if (pathPattern.includes('*')) {
                try {
                    // Utiliser glob pour trouver le fichier
                    const files = glob.sync(pathPattern);
                    if (files.length > 0) {
                        console.log(`  Trouvé via glob: ${files[0]}`);
                        return files[0];
                    }
                } catch (err) {
                    console.error('Erreur lors de la recherche avec glob:', err);
                }
                return null;
            } 
            
            // Chemin simple sans wildcard
            return fs.existsSync(pathPattern) ? pathPattern : null;
        };
        
        // Essayer chaque chemin possible
        for (const possiblePath of possiblePaths) {
            const foundPath = findFile(possiblePath);
            if (foundPath) {
                filePath = foundPath;
                console.log(`Fichier trouvé: ${filePath}`);
                break;
            }
        }
        
        // Si aucun fichier trouvé après toutes les tentatives
        if (!filePath) {
            console.log('Document non trouvé après recherche dans tous les chemins possibles');
            return res.status(404).json({
                success: false,
                message: 'Document non trouvé'
            });
        }
        
        // Déterminer le type MIME
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        // Configurer les en-têtes de réponse
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        
        // Envoyer le fichier
        res.sendFile(filePath);
        
    } catch (error) {
        console.error('Erreur lors de la récupération du document:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du document',
            error: error.message
        });
    }
});

// IMPORTANT: Déplacer cette route avant la route paramétrée pour éviter les conflits
// Route alternative pour servir un document par son chemin complet
router.get('/bypath/*', authenticate, (req, res) => {
    try {
        // Extraire le chemin relatif à partir de l'URL
        const relativePath = req.params[0];
        
        // Vérifier si le chemin contient des tentatives de traversée de répertoire
        if (relativePath.includes('..')) {
            return res.status(400).json({
                success: false,
                message: 'Chemin invalide'
            });
        }
        
        // Construire le chemin absolu
        const filePath = path.join(uploadsDir, relativePath);
        
        // Vérifier si le fichier existe
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Document non trouvé'
            });
        }
        
        // Déterminer le type MIME
        const ext = path.extname(relativePath).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        // Configurer les en-têtes de réponse
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${path.basename(relativePath)}"`);
        
        // Envoyer le fichier
        res.sendFile(filePath);
        
    } catch (error) {
        console.error('Erreur lors de la récupération du document:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du document',
            error: error.message
        });
    }
});

module.exports = router;
