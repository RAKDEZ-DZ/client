const db = require('../config/database');

const migration = {
    name: '20250702T120000_create_page_permissions_system',
    
    up: async () => {
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Table des pages/modules du système
            await client.query(`
                CREATE TABLE IF NOT EXISTS pages (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    display_name VARCHAR(200) NOT NULL,
                    description TEXT,
                    route_pattern VARCHAR(255),
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Table des permissions utilisateur par page
            await client.query(`
                CREATE TABLE IF NOT EXISTS user_page_permissions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
                    can_view BOOLEAN DEFAULT false,
                    can_create BOOLEAN DEFAULT false,
                    can_edit BOOLEAN DEFAULT false,
                    can_delete BOOLEAN DEFAULT false,
                    can_export BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, page_id)
                )
            `);
            
            // Insérer les pages de base du système
            await client.query(`
                INSERT INTO pages (name, display_name, description, route_pattern) VALUES
                ('clients', 'Gestion des Clients', 'Accès à la liste et gestion des clients', '/api/clients'),
                ('factures', 'Gestion des Factures', 'Accès à la liste et gestion des factures', '/api/factures'),
                ('paiements', 'Gestion des Paiements', 'Accès à la liste et gestion des paiements', '/api/paiements'),
                ('dossiers_voyage', 'Dossiers de Voyage', 'Accès aux dossiers de voyage', '/api/dossiers-voyage'),
                ('users', 'Gestion des Utilisateurs', 'Accès à la gestion des utilisateurs (admin)', '/api/users')
                ON CONFLICT (name) DO NOTHING
            `);
            
            await client.query('COMMIT');
            console.log('Migration 20250702T120000_create_page_permissions_system applied successfully');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    
    down: async () => {
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            await client.query('DROP TABLE IF EXISTS user_page_permissions');
            await client.query('DROP TABLE IF EXISTS pages');
            
            await client.query('COMMIT');
            console.log('Migration 20250702T120000_create_page_permissions_system rolled back successfully');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = migration;
