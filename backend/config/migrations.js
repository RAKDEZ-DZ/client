const fs = require('fs');
const path = require('path');
const db = require('../config/database');

class MigrationManager {
    constructor() {
        this.migrationsPath = path.join(__dirname, '../migrations');
    }

    // Créer la table de migrations si elle n'existe pas
    async createMigrationsTable() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await db.query(createTableQuery);
        console.log('✅ Table migrations créée ou vérifiée');
    }

    // Obtenir les migrations déjà exécutées
    async getExecutedMigrations() {
        const result = await db.query('SELECT filename FROM migrations ORDER BY id ASC');
        return result.rows.map(row => row.filename);
    }

    // Obtenir tous les fichiers de migration
    getMigrationFiles() {
        if (!fs.existsSync(this.migrationsPath)) {
            return [];
        }
        return fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.js'))
            .sort();
    }

    // Exécuter les migrations en attente
    async runMigrations() {
        try {
            await this.createMigrationsTable();
            
            const executedMigrations = await this.getExecutedMigrations();
            const migrationFiles = this.getMigrationFiles();
            
            const pendingMigrations = migrationFiles.filter(
                file => !executedMigrations.includes(file)
            );

            if (pendingMigrations.length === 0) {
                console.log('✅ Aucune migration en attente');
                return;
            }

            console.log(`🔄 Exécution de ${pendingMigrations.length} migration(s)...`);

            for (const migrationFile of pendingMigrations) {
                await this.runSingleMigration(migrationFile);
            }

            console.log('✅ Toutes les migrations ont été exécutées avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de l\'exécution des migrations:', error);
            throw error;
        }
    }

    // Exécuter une migration spécifique
    async runSingleMigration(filename) {
        const migrationPath = path.join(this.migrationsPath, filename);
        
        try {
            console.log(`🔄 Exécution de la migration: ${filename}`);
            
            const migration = require(migrationPath);
            await migration.up(db);
            
            // Marquer la migration comme exécutée
            await db.query(
                'INSERT INTO migrations (filename) VALUES ($1)',
                [filename]
            );
            
            console.log(`✅ Migration ${filename} exécutée avec succès`);
        } catch (error) {
            console.error(`❌ Erreur lors de l'exécution de la migration ${filename}:`, error);
            throw error;
        }
    }

    // Rollback de la dernière migration
    async rollbackLastMigration() {
        try {
            const executedMigrations = await this.getExecutedMigrations();
            
            if (executedMigrations.length === 0) {
                console.log('❌ Aucune migration à annuler');
                return;
            }

            const lastMigration = executedMigrations[executedMigrations.length - 1];
            const migrationPath = path.join(this.migrationsPath, lastMigration);
            
            console.log(`🔄 Rollback de la migration: ${lastMigration}`);
            
            const migration = require(migrationPath);
            if (migration.down) {
                await migration.down(db);
            }
            
            // Supprimer l'entrée de la table migrations
            await db.query(
                'DELETE FROM migrations WHERE filename = $1',
                [lastMigration]
            );
            
            console.log(`✅ Rollback de ${lastMigration} effectué avec succès`);
        } catch (error) {
            console.error('❌ Erreur lors du rollback:', error);
            throw error;
        }
    }

    // Générer un nouveau fichier de migration
    generateMigrationFile(name) {
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
        const filename = `${timestamp}_${name}.js`;
        const filepath = path.join(this.migrationsPath, filename);
        
        const template = `// Migration: ${name}
// Créée le: ${new Date().toISOString()}

module.exports = {
    // Fonction d'application de la migration
    up: async (db) => {
        // Écrire ici le code pour appliquer la migration
        // Exemple:
        // await db.query(\`
        //     CREATE TABLE exemple (
        //         id SERIAL PRIMARY KEY,
        //         name VARCHAR(255) NOT NULL
        //     );
        // \`);
    },

    // Fonction de rollback de la migration (optionnel)
    down: async (db) => {
        // Écrire ici le code pour annuler la migration
        // Exemple:
        // await db.query('DROP TABLE IF EXISTS exemple;');
    }
};
`;

        fs.writeFileSync(filepath, template);
        console.log(`✅ Fichier de migration créé: ${filename}`);
        return filename;
    }
}

module.exports = MigrationManager;
