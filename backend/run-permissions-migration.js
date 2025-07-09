// Script pour exécuter la migration des permissions par page
const migration = require('./migrations/20250702T120000_create_page_permissions_system');

async function runMigration() {
    try {
        console.log('🚀 Exécution de la migration des permissions par page...');
        await migration.up();
        console.log('✅ Migration terminée avec succès !');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        process.exit(1);
    }
}

runMigration();
