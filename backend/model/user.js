const db = require('../config/database');
const bcrypt = require('bcrypt');
const UserPagePermission = require('./userPagePermission');
const Page = require('./page');

class User {
    // Définir les constantes de permissions
    static PERMISSIONS = {
        CLIENTS: 'clients',
        FACTURES: 'factures',
        PAIEMENTS: 'paiements',
        DOSSIERS_VOYAGE: 'dossiers',
        USERS: 'users'
    };
    
    // Définir les rôles
    static ROLES = {
        ADMIN: 'admin',
        USER: 'user'
    };
    
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        // Map password_hash column to password property for compatibility
        this.password = data.password_hash || data.password;
        this.role = data.role || 'user'; // 'admin' ou 'user'
        this.permissions = data.permissions || [];
        this.is_active = data.is_active !== false; // Par défaut actif
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.last_login = data.last_login;
    }

    async verifyPassword(password) {
        try {
            return await bcrypt.compare(password, this.password);
        } catch (error) {
            console.error('Erreur vérification mot de passe:', error);
            return false;
        }
    }

    async updateLastLogin() {
        try {
            const query = `
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP 
                WHERE id = $1
                RETURNING last_login
            `;
            
            const result = await db.query(query, [this.id]);
            if (result.rows.length > 0) {
                this.last_login = result.rows[0].last_login;
            }
            
            return this.last_login;
        } catch (error) {
            console.error('Erreur mise à jour dernière connexion:', error);
            throw error;
        }
    }

    static async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    static async findAll() {
        const query = 'SELECT * FROM users ORDER BY username';
        const result = await db.query(query);
        return result.rows.map(row => new User(row));
    }

    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new User(result.rows[0]);
    }

    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await db.query(query, [email]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new User(result.rows[0]);
    }

    static async findByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await db.query(query, [username]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new User(result.rows[0]);
    }

    static async create(data) {
        const hashedPassword = await this.hashPassword(data.password);
        
        // S'assurer que permissions est un tableau valide
        let permissions = [];
        console.log('Création utilisateur - traitement des permissions:', {
            type: typeof data.permissions,
            value: data.permissions,
            isArray: Array.isArray(data.permissions)
        });
        
        if (data.permissions) {
            if (Array.isArray(data.permissions)) {
                permissions = data.permissions;
                console.log('Permissions reçues comme tableau:', permissions);
            } else if (typeof data.permissions === 'string') {
                try {
                    console.log('Permissions reçues comme string, tentative de parsing:', data.permissions);
                    const parsed = JSON.parse(data.permissions);
                    permissions = Array.isArray(parsed) ? parsed : [];
                    console.log('Après parsing:', permissions);
                } catch (e) {
                    console.error('Erreur de parsing des permissions:', e);
                    permissions = [];
                }
            } else if (typeof data.permissions === 'object') {
                console.log('Permissions reçues comme objet non-array:', data.permissions);
                // Si c'est un objet mais pas un tableau, vérifier s'il peut être converti
                try {
                    permissions = Object.values(data.permissions);
                    console.log('Conversion objet en tableau:', permissions);
                } catch (e) {
                    console.error('Impossible de convertir l\'objet permissions en tableau:', e);
                    permissions = [];
                }
            }
        }
        
        // Toujours s'assurer que permissions est un tableau avant stringification
        if (!Array.isArray(permissions)) {
            console.warn('Format de permissions invalide, utilisation d\'un tableau vide');
            permissions = [];
        }
        
        console.log('Permissions finales avant insertion:', permissions);
        
        const query = `
            INSERT INTO users (username, email, password_hash, role, permissions, is_active)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6)
            RETURNING *
        `;
        
        const values = [
            data.username,
            data.email,
            hashedPassword,
            data.role || 'user',
            JSON.stringify(permissions), // Assure une conversion en JSON valide
            data.is_active !== false
        ];
        
        const result = await db.query(query, values);
        const newUser = new User(result.rows[0]);
        
        // Si l'utilisateur a des permissions, les synchroniser avec la table user_page_permissions
        if (data.permissions && data.permissions.length > 0) {
            console.log('Synchronisation des permissions pour le nouvel utilisateur:', {
                userId: newUser.id,
                permissions: data.permissions
            });
            try {
                await this.syncUserPermissions(newUser.id, data.permissions);
                console.log('Synchronisation des permissions réussie');
            } catch (error) {
                console.error('Erreur lors de la synchronisation des permissions:', error);
                // Ne pas bloquer la création de l'utilisateur en cas d'erreur de synchronisation
            }
        }
        
        return newUser;
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCounter = 1;

        // Construire dynamiquement la requête
        if (data.username !== undefined) {
            fields.push(`username = $${paramCounter++}`);
            values.push(data.username);
        }
        
        if (data.email !== undefined) {
            fields.push(`email = $${paramCounter++}`);
            values.push(data.email);
        }
        
        if (data.password !== undefined) {
            const hashedPassword = await this.hashPassword(data.password);
            fields.push(`password_hash = $${paramCounter++}`);
            values.push(hashedPassword);
        }
        
        if (data.role !== undefined) {
            fields.push(`role = $${paramCounter++}`);
            values.push(data.role);
        }
        
        if (data.permissions !== undefined) {
            fields.push(`permissions = $${paramCounter++}`);
            values.push(data.permissions);
            
            // Synchroniser les permissions avec la table user_page_permissions
            await this.syncUserPermissions(id, data.permissions);
        }
        
        if (data.is_active !== undefined) {
            fields.push(`is_active = $${paramCounter++}`);
            values.push(data.is_active);
        }
        
        // Ajouter toujours updated_at
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        
        // Ajouter l'ID pour la clause WHERE
        values.push(id);

        if (fields.length === 0) {
            throw new Error('Aucun champ à mettre à jour');
        }

        const query = `
            UPDATE users 
            SET ${fields.join(', ')}
            WHERE id = $${paramCounter}
            RETURNING *
        `;
        
        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new User(result.rows[0]);
    }

    static async delete(id) {
        // D'abord supprimer toutes les permissions associées
        try {
            await db.query('DELETE FROM user_page_permissions WHERE user_id = $1', [id]);
        } catch (error) {
            console.error('Erreur suppression permissions utilisateur:', error);
            // Ne pas bloquer la suppression de l'utilisateur si erreur
        }
        
        // Supprimer l'utilisateur
        const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new User(result.rows[0]);
    }

    // Synchroniser les permissions d'un utilisateur entre le tableau 'permissions' et la table user_page_permissions
    static async syncUserPermissions(userId, permissions) {
        try {
            console.log(`Synchronisation des permissions pour l'utilisateur ${userId}: ${permissions}`);
            
            // Récupérer toutes les pages
            const pages = await Page.findAll();
            const pageMap = {};
            pages.forEach(page => {
                pageMap[page.name] = page.id;
            });
            
            // Pour chaque permission dans le tableau
            for (const pageName of permissions) {
                const pageId = pageMap[pageName];
                
                if (!pageId) {
                    console.warn(`Page "${pageName}" non trouvée, ignorée pour les permissions`);
                    continue;
                }
                
                // Créer ou mettre à jour une permission avec accès complet
                await UserPagePermission.upsert(userId, pageId, {
                    can_view: true,
                    can_create: true,
                    can_edit: true,
                    can_delete: true,
                    can_export: true
                });
            }
            
            console.log(`Permissions synchronisées avec succès pour l'utilisateur ${userId}`);
        } catch (error) {
            console.error('Erreur synchronisation permissions:', error);
            throw error;
        }
    }

    // Convertir l'objet User en un objet simple pour JSON
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            role: this.role,
            permissions: this.permissions,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at,
            last_login: this.last_login
        };
    }
    
    // Méthode statique pour récupérer toutes les permissions disponibles
    static getPermissions() {
        return Object.values(this.PERMISSIONS);
    }
    
    // Méthode statique pour récupérer tous les rôles disponibles
    static getRoles() {
        return Object.values(this.ROLES);
    }
    
    // Méthode statique pour vérifier si une permission est valide
    static isValidPermission(permission) {
        return Object.values(this.PERMISSIONS).includes(permission);
    }
    
    // Méthode statique pour vérifier si un rôle est valide
    static isValidRole(role) {
        return Object.values(this.ROLES).includes(role);
    }
}

module.exports = User;
