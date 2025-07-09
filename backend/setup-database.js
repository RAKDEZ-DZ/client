const { Client } = require('pg');
require('dotenv').config();

async function createDatabaseIfNotExists() {
    // Connexion à PostgreSQL sans spécifier de base de données spécifique
    const adminClient = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: 'postgres', // Base de données par défaut
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        console.log('🔌 Connexion au serveur PostgreSQL...');
        await adminClient.connect();
        
        // Vérifier si la base de données existe
        const checkDbQuery = `
            SELECT 1 FROM pg_database WHERE datname = $1
        `;
        const result = await adminClient.query(checkDbQuery, [process.env.DB_NAME]);
        
        if (result.rows.length === 0) {
            console.log(`📊 Création de la base de données "${process.env.DB_NAME}"...`);
            
            // Créer la base de données
            const createDbQuery = `CREATE DATABASE "${process.env.DB_NAME}" WITH OWNER = ${process.env.DB_USER}`;
            await adminClient.query(createDbQuery);
            
            console.log(`✅ Base de données "${process.env.DB_NAME}" créée avec succès !`);
        } else {
            console.log(`✅ La base de données "${process.env.DB_NAME}" existe déjà.`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de la base de données:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n🔧 Solutions possibles:');
            console.log('1. Vérifiez que PostgreSQL est démarré');
            console.log('2. Vérifiez les paramètres de connexion dans .env');
            console.log('3. Vérifiez que le port 5432 est libre');
        } else if (error.code === '28P01') {
            console.log('\n🔧 Erreur d\'authentification:');
            console.log('1. Vérifiez le nom d\'utilisateur et mot de passe dans .env');
            console.log('2. Vérifiez que l\'utilisateur postgres existe');
        }
        
        throw error;
    } finally {
        await adminClient.end();
    }
}

// Exécuter le script
if (require.main === module) {
    createDatabaseIfNotExists()
        .then(() => {
            console.log('\n🎉 Script terminé avec succès !');
            console.log('📝 Vous pouvez maintenant lancer: npm run migrate');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Échec du script:', error.message);
            process.exit(1);
        });
}

module.exports = createDatabaseIfNotExists;
