const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration du stockage pour un seul fichier (rétrocompatibilité)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Générer un nom unique pour le fichier
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const clientId = req.params.id || 'unknown';
        cb(null, `client-${clientId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// Configuration du stockage pour les dossiers étudiants (plusieurs fichiers)
const dossierEtudiantStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Créer un dossier spécifique pour le dossier étudiant
        const clientId = req.params.clientId || req.body.client_id || 'unknown';
        const dossierId = req.params.id || 'nouveau';
        const dossierPath = path.join(uploadsDir, 'dossiers-etudiants', `client-${clientId}`, `dossier-${dossierId}`);
        
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(dossierPath)) {
            fs.mkdirSync(dossierPath, { recursive: true });
        }
        
        cb(null, dossierPath);
    },
    filename: function (req, file, cb) {
        // Nettoyer le nom original du fichier et ajouter un timestamp
        const timestamp = Date.now();
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const finalName = `${timestamp}-${cleanName}`;
        cb(null, finalName);
    }
});

// Filtre pour accepter seulement les fichiers PDF
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Seuls les fichiers PDF sont autorisés!'), false);
    }
};

// Configuration de multer pour un seul fichier
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limite de 10MB
    }
});

// Configuration de multer pour les dossiers étudiants (plusieurs fichiers)
const uploadDossierEtudiant = multer({
    storage: dossierEtudiantStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limite de 10MB par fichier
        files: 10 // Limite de 10 fichiers
    }
});

// Configuration de multer pour plusieurs fichiers (documents clients)
const uploadMultipleClient = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limite de 10MB par fichier
        files: 10 // Limite de 10 fichiers
    }
});

// Middleware pour l'upload d'un seul fichier PDF
const uploadSinglePDF = upload.single('document_pdf');

// Middleware pour l'upload de plusieurs fichiers PDF pour les clients
const uploadMultipleClientPDFs = uploadMultipleClient.array('documents', 10);

// Middleware pour l'upload de plusieurs fichiers PDF pour les dossiers étudiants
const uploadMultiplePDFs = uploadDossierEtudiant.array('documents_requis', 10);

// Wrapper pour gérer les erreurs d'un seul fichier
const handleUpload = (req, res, next) => {
    uploadSinglePDF(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'Le fichier est trop volumineux. Taille maximale: 10MB'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Erreur lors de l\'upload du fichier',
                error: err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        next();
    });
};

// Wrapper pour gérer les erreurs de plusieurs fichiers
const handleMultipleUpload = (req, res, next) => {
    uploadMultiplePDFs(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'Un ou plusieurs fichiers sont trop volumineux. Taille maximale: 10MB par fichier'
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Trop de fichiers. Maximum autorisé: 10 fichiers'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Erreur lors de l\'upload des fichiers',
                error: err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        next();
    });
};

// Configuration multer flexible qui accepte à la fois un seul et plusieurs fichiers
const uploadFlexible = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limite de 10MB par fichier
        files: 10 // Limite de 10 fichiers
    }
});

// Middleware flexible qui accepte les deux formats
const uploadFlexibleFields = uploadFlexible.fields([
    { name: 'document_pdf', maxCount: 1 },     // Pour un seul fichier
    { name: 'documents', maxCount: 10 }        // Pour plusieurs fichiers
]);

// Wrapper pour gérer l'upload flexible (un seul ou plusieurs fichiers)
const handleFlexibleUpload = (req, res, next) => {
    // Essayer d'abord l'upload multiple avec le champ 'documents'
    uploadMultipleClientPDFs(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Si c'est une erreur "UNEXPECTED_FILE", essayer avec un seul fichier
            if (err.code === 'UNEXPECTED_FILE') {
                uploadSinglePDF(req, res, function (singleErr) {
                    if (singleErr instanceof multer.MulterError) {
                        if (singleErr.code === 'LIMIT_FILE_SIZE') {
                            return res.status(400).json({
                                success: false,
                                message: 'Le fichier est trop volumineux. Taille maximale: 10MB'
                            });
                        }
                        if (singleErr.code === 'UNEXPECTED_FILE') {
                            return res.status(400).json({
                                success: false,
                                message: 'Nom de champ invalide. Utilisez "documents" pour plusieurs fichiers ou "document_pdf" pour un seul fichier'
                            });
                        }
                        return res.status(400).json({
                            success: false,
                            message: 'Erreur lors de l\'upload du fichier',
                            error: singleErr.message
                        });
                    } else if (singleErr) {
                        return res.status(400).json({
                            success: false,
                            message: singleErr.message
                        });
                    }
                    next();
                });
                return;
            }
            
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'Un ou plusieurs fichiers sont trop volumineux. Taille maximale: 10MB par fichier'
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Trop de fichiers. Maximum autorisé: 10 fichiers'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Erreur lors de l\'upload des fichiers',
                error: err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        
        next();
    });
};

// Fonction utilitaire pour créer la structure de dossier
const createDossierFolder = (clientId, dossierId) => {
    const dossierPath = path.join(uploadsDir, 'dossiers-etudiants', `client-${clientId}`, `dossier-${dossierId}`);
    if (!fs.existsSync(dossierPath)) {
        fs.mkdirSync(dossierPath, { recursive: true });
    }
    return dossierPath;
};

// Fonction utilitaire pour supprimer un fichier
const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erreur lors de la suppression du fichier:', error);
        return false;
    }
};

// Fonction utilitaire pour supprimer un dossier complet
const deleteDossierFolder = (clientId, dossierId) => {
    try {
        const dossierPath = path.join(uploadsDir, 'dossiers-etudiants', `client-${clientId}`, `dossier-${dossierId}`);
        if (fs.existsSync(dossierPath)) {
            fs.rmSync(dossierPath, { recursive: true, force: true });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erreur lors de la suppression du dossier:', error);
        return false;
    }
};

// Fonction utilitaire pour lister les fichiers d'un dossier
const listDossierFiles = (clientId, dossierId) => {
    try {
        const dossierPath = path.join(uploadsDir, 'dossiers-etudiants', `client-${clientId}`, `dossier-${dossierId}`);
        if (fs.existsSync(dossierPath)) {
            const files = fs.readdirSync(dossierPath);
            return files.map(file => ({
                filename: file,
                originalName: file.substring(file.indexOf('-') + 1), // Enlever le timestamp
                path: path.join(dossierPath, file),
                relativePath: path.join('dossiers-etudiants', `client-${clientId}`, `dossier-${dossierId}`, file),
                size: fs.statSync(path.join(dossierPath, file)).size,
                uploadDate: fs.statSync(path.join(dossierPath, file)).mtime
            }));
        }
        return [];
    } catch (error) {
        console.error('Erreur lors de la lecture du dossier:', error);
        return [];
    }
};

module.exports = {
    handleUpload,
    handleMultipleUpload,
    handleFlexibleUpload,
    handleMultipleClientUpload: (req, res, next) => {
        console.log('Middleware handleMultipleClientUpload appelé');
        console.log('Méthode:', req.method);
        console.log('URL:', req.originalUrl);
        console.log('Headers Content-Type:', req.headers['content-type']);
        
        uploadMultipleClientPDFs(req, res, function (err) {
            console.log('Upload terminé, fichiers reçus:', req.files ? req.files.length : 0);
            
            if (err instanceof multer.MulterError) {
                console.error('Erreur Multer:', err.code, err.message);
                
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'Un ou plusieurs fichiers sont trop volumineux. Taille maximale: 10MB par fichier'
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        message: 'Trop de fichiers. Maximum autorisé: 10 fichiers'
                    });
                }
                if (err.code === 'UNEXPECTED_FILE') {
                    return res.status(400).json({
                        success: false,
                        message: 'Utilisez le champ "documents" pour uploader plusieurs fichiers'
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: 'Erreur lors de l\'upload des fichiers',
                    error: err.message
                });
            } else if (err) {
                console.error('Autre erreur:', err);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            
            // Si des fichiers ont été uploadés, les afficher
            if (req.files && req.files.length > 0) {
                console.log('Fichiers uploadés avec succès:', req.files.length);
                req.files.forEach((file, index) => {
                    console.log(`Fichier ${index + 1}:`, file.originalname, file.mimetype, file.size, 'octets');
                });
            } else {
                console.log('Aucun fichier uploadé');
            }
            
            next();
        });
    },
    uploadsDir,
    createDossierFolder,
    deleteFile,
    deleteDossierFolder,
    listDossierFiles
};
