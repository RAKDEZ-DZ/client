// Script pour vérifier et corriger la structure des documents dans la base de données
const db = require('./config/database');

async function fixDocumentsStructure() {
    try {
        console.log('Début de la vérification et correction de la structure des documents...');
        
        // 1. Récupérer tous les clients avec leur champ documents
        const clientsResult = await db.query('SELECT id, documents FROM clients');
        console.log(`${clientsResult.rows.length} clients trouvés au total.`);
        
        // Compteurs pour les statistiques
        let fixed = 0;
        let alreadyValid = 0;
        let errors = 0;
        
        // 2. Pour chaque client, vérifier et corriger la structure des documents
        for (const client of clientsResult.rows) {
            try {
                const { id, documents } = client;
                
                // Si documents est null, initialiser comme tableau vide
                if (documents === null) {
                    await db.query('UPDATE clients SET documents = $1::jsonb WHERE id = $2', ['[]', id]);
                    console.log(`Client #${id}: documents null corrigé en tableau vide`);
                    fixed++;
                    continue;
                }
                
                // Vérifier si documents est déjà un tableau valide
                if (Array.isArray(documents)) {
                    // Vérifier que chaque document a la structure attendue
                    const fixedDocs = documents.map(doc => ({
                        id: doc.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        name: doc.name || doc.originalName || doc.filename || 'document.pdf',
                        originalName: doc.originalName || doc.originalname || doc.name || doc.filename || 'document.pdf',
                        filename: doc.filename || doc.name || doc.originalName || 'document.pdf',
                        path: doc.path || `uploads/${doc.filename || 'document.pdf'}`,
                        relativePath: doc.relativePath || doc.path?.replace(/^uploads[\/\\]/, '') || doc.filename || 'document.pdf',
                        size: doc.size || 0,
                        date_upload: doc.date_upload || doc.uploadDate || new Date().toISOString()
                    }));
                    
                    // Mettre à jour avec la structure corrigée
                    await db.query('UPDATE clients SET documents = $1::jsonb WHERE id = $2', [JSON.stringify(fixedDocs), id]);
                    console.log(`Client #${id}: structure de ${documents.length} document(s) normalisée`);
                    fixed++;
                } else {
                    // Si ce n'est pas un tableau, essayer de le parser
                    try {
                        let parsedDocs;
                        if (typeof documents === 'string') {
                            parsedDocs = JSON.parse(documents);
                        } else {
                            // Si ce n'est pas une chaîne, initialiser comme tableau vide
                            parsedDocs = [];
                        }
                        
                        if (!Array.isArray(parsedDocs)) {
                            parsedDocs = [];
                        }
                        
                        // Mise à jour avec le tableau corrigé
                        await db.query('UPDATE clients SET documents = $1::jsonb WHERE id = $2', [JSON.stringify(parsedDocs), id]);
                        console.log(`Client #${id}: format de documents corrigé`);
                        fixed++;
                    } catch (parseError) {
                        console.error(`Client #${id}: Impossible de parser les documents, réinitialisation en tableau vide`, parseError);
                        await db.query('UPDATE clients SET documents = $1::jsonb WHERE id = $2', ['[]', id]);
                        fixed++;
                    }
                }
            } catch (clientError) {
                console.error(`Erreur lors du traitement du client #${client.id}:`, clientError);
                errors++;
            }
        }
        
        console.log('\nRésumé des corrections:');
        console.log(`- Clients corrigés: ${fixed}`);
        console.log(`- Clients déjà valides: ${alreadyValid}`);
        console.log(`- Erreurs: ${errors}`);
        console.log('\nTerminé!');
        
    } catch (error) {
        console.error('Erreur lors de la correction de la structure des documents:', error);
    } finally {
        // Fermer la connexion à la base de données
        await db.end();
    }
}

// Exécuter le script
fixDocumentsStructure();
