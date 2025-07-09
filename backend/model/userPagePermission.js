const db = require('../config/database');

class UserPagePermission {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.page_id = data.page_id;
        this.can_view = data.can_view || false;
        this.can_create = data.can_create || false;
        this.can_edit = data.can_edit || false;
        this.can_delete = data.can_delete || false;
        this.can_export = data.can_export || false;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        
        // Données jointes si disponibles
        this.page_name = data.page_name;
        this.page_display_name = data.page_display_name;
        this.username = data.username;
    }

    // Récupérer les permissions d'un utilisateur
    static async findByUserId(userId) {
        const query = `
            SELECT upp.*, p.name as page_name, p.display_name as page_display_name
            FROM user_page_permissions upp
            JOIN pages p ON upp.page_id = p.id
            WHERE upp.user_id = $1 AND p.is_active = true
            ORDER BY p.display_name
        `;
        const result = await db.query(query, [userId]);
        return result.rows.map(row => new UserPagePermission(row));
    }

    // Récupérer les permissions d'un utilisateur pour une page spécifique
    static async findByUserAndPage(userId, pageId) {
        const query = `
            SELECT upp.*, p.name as page_name, p.display_name as page_display_name
            FROM user_page_permissions upp
            JOIN pages p ON upp.page_id = p.id
            WHERE upp.user_id = $1 AND upp.page_id = $2
        `;
        const result = await db.query(query, [userId, pageId]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new UserPagePermission(result.rows[0]);
    }

    // Récupérer les permissions d'un utilisateur pour une page par nom
    static async findByUserAndPageName(userId, pageName) {
        const query = `
            SELECT upp.*, p.name as page_name, p.display_name as page_display_name
            FROM user_page_permissions upp
            JOIN pages p ON upp.page_id = p.id
            WHERE upp.user_id = $1 AND p.name = $2 AND p.is_active = true
        `;
        const result = await db.query(query, [userId, pageName]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new UserPagePermission(result.rows[0]);
    }

    // Créer ou mettre à jour les permissions d'un utilisateur pour une page
    static async upsert(userId, pageId, permissions) {
        const query = `
            INSERT INTO user_page_permissions 
            (user_id, page_id, can_view, can_create, can_edit, can_delete, can_export, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, page_id)
            DO UPDATE SET
                can_view = EXCLUDED.can_view,
                can_create = EXCLUDED.can_create,
                can_edit = EXCLUDED.can_edit,
                can_delete = EXCLUDED.can_delete,
                can_export = EXCLUDED.can_export,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        const values = [
            userId,
            pageId,
            permissions.can_view || false,
            permissions.can_create || false,
            permissions.can_edit || false,
            permissions.can_delete || false,
            permissions.can_export || false
        ];

        const result = await db.query(query, values);
        return new UserPagePermission(result.rows[0]);
    }

    // Définir les permissions complètes d'un utilisateur
    static async setUserPermissions(userId, permissionsArray) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');
            
            // Supprimer toutes les permissions existantes de l'utilisateur
            await client.query('DELETE FROM user_page_permissions WHERE user_id = $1', [userId]);
            
            // Insérer les nouvelles permissions
            for (const perm of permissionsArray) {
                const query = `
                    INSERT INTO user_page_permissions 
                    (user_id, page_id, can_view, can_create, can_edit, can_delete, can_export)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `;
                const values = [
                    userId,
                    perm.page_id,
                    perm.can_view || false,
                    perm.can_create || false,
                    perm.can_edit || false,
                    perm.can_delete || false,
                    perm.can_export || false
                ];
                await client.query(query, values);
            }
            
            await client.query('COMMIT');
            
            // Retourner les permissions mises à jour
            return await UserPagePermission.findByUserId(userId);
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Supprimer les permissions d'un utilisateur pour une page
    static async removeUserPagePermission(userId, pageId) {
        const query = 'DELETE FROM user_page_permissions WHERE user_id = $1 AND page_id = $2';
        await db.query(query, [userId, pageId]);
    }

    // Supprimer toutes les permissions d'un utilisateur
    static async removeAllUserPermissions(userId) {
        const query = 'DELETE FROM user_page_permissions WHERE user_id = $1';
        await db.query(query, [userId]);
    }

    // Définir une permission spécifique pour un utilisateur et une page
    static async setPagePermission(userId, pageId, permissions) {
        // Utiliser la méthode upsert existante
        return await this.upsert(userId, pageId, permissions);
    }
    
    // Vérifier si un utilisateur a une permission spécifique
    static async hasPermission(userId, pageName, permissionType = 'can_view') {
        const query = `
            SELECT upp.${permissionType}
            FROM user_page_permissions upp
            JOIN pages p ON upp.page_id = p.id
            WHERE upp.user_id = $1 AND p.name = $2 AND p.is_active = true
        `;
        const result = await db.query(query, [userId, pageName]);
        
        return result.rows.length > 0 && result.rows[0][permissionType];
    }

    // Récupérer tous les utilisateurs avec leurs permissions
    static async findAllWithUsers() {
        const query = `
            SELECT u.id as user_id, u.username, u.email, u.role,
                   p.id as page_id, p.name as page_name, p.display_name as page_display_name,
                   upp.can_view, upp.can_create, upp.can_edit, upp.can_delete, upp.can_export
            FROM users u
            CROSS JOIN pages p
            LEFT JOIN user_page_permissions upp ON u.id = upp.user_id AND p.id = upp.page_id
            WHERE u.is_active = true AND p.is_active = true
            ORDER BY u.username, p.display_name
        `;
        const result = await db.query(query);
        
        // Grouper par utilisateur
        const userPermissions = {};
        result.rows.forEach(row => {
            if (!userPermissions[row.user_id]) {
                userPermissions[row.user_id] = {
                    user_id: row.user_id,
                    username: row.username,
                    email: row.email,
                    role: row.role,
                    permissions: []
                };
            }
            
            userPermissions[row.user_id].permissions.push({
                page_id: row.page_id,
                page_name: row.page_name,
                page_display_name: row.page_display_name,
                can_view: row.can_view || false,
                can_create: row.can_create || false,
                can_edit: row.can_edit || false,
                can_delete: row.can_delete || false,
                can_export: row.can_export || false
            });
        });
        
        return Object.values(userPermissions);
    }

    // Convertir en JSON pour l'API
    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            page_id: this.page_id,
            page_name: this.page_name,
            page_display_name: this.page_display_name,
            permissions: {
                can_view: this.can_view,
                can_create: this.can_create,
                can_edit: this.can_edit,
                can_delete: this.can_delete,
                can_export: this.can_export
            },
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = UserPagePermission;
