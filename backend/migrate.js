#!/usr/bin/env node

const MigrationManager = require('./config/migrations');
const migrationManager = new MigrationManager();

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);
const command = args[0];
const migrationName = args[1];

async function main() {
    try {
        switch (command) {
            case 'run':
                console.log('🚀 Lancement des migrations...');
                await migrationManager.runMigrations();
                break;

            case 'rollback':
                console.log('🔄 Rollback de la dernière migration...');
                await migrationManager.rollbackLastMigration();
                break;

            case 'generate':
                if (!migrationName) {
                    console.error('❌ Veuillez spécifier un nom pour la migration');
                    console.log('Usage: node migrate.js generate <nom_migration>');
                    process.exit(1);
                }
                migrationManager.generateMigrationFile(migrationName);
                break;

            case 'status':
                console.log('📊 Statut des migrations...');
                const executed = await migrationManager.getExecutedMigrations();
                const all = migrationManager.getMigrationFiles();
                
                console.log(`✅ Migrations exécutées: ${executed.length}`);
                console.log(`📋 Total des migrations: ${all.length}`);
                console.log(`⏳ Migrations en attente: ${all.length - executed.length}`);
                
                if (executed.length > 0) {
                    console.log('\n📝 Migrations exécutées:');
                    executed.forEach(migration => console.log(`  - ${migration}`));
                }
                break;

            default:
                console.log('📖 Usage:');
                console.log('  node migrate.js run                    - Exécuter toutes les migrations en attente');
                console.log('  node migrate.js rollback               - Annuler la dernière migration');
                console.log('  node migrate.js generate <nom>         - Générer un nouveau fichier de migration');
                console.log('  node migrate.js status                 - Afficher le statut des migrations');
                break;
        }
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

main();
