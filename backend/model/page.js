const db = require('../config/database');

class Page {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.display_name = data.display_name;
        this.description = data.description;
        this.route_pattern = data.route_pattern;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
    }

    // Récupérer toutes les pages actives
    static async findAll() {
        const query = 'SELECT * FROM pages WHERE is_active = true ORDER BY display_name';
        const result = await db.query(query);
        return result.rows.map(row => new Page(row));
    }

    // Récupérer une page par son nom
    static async findByName(name) {
        const query = 'SELECT * FROM pages WHERE name = $1 AND is_active = true';
        const result = await db.query(query, [name]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new Page(result.rows[0]);
    }

    // Récupérer une page par son ID
    static async findById(id) {
        const query = 'SELECT * FROM pages WHERE id = $1';
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new Page(result.rows[0]);
    }

    // Créer une nouvelle page
    static async create(pageData) {
        const query = `
            INSERT INTO pages (name, display_name, description, route_pattern, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [
            pageData.name,
            pageData.display_name,
            pageData.description,
            pageData.route_pattern,
            pageData.is_active !== undefined ? pageData.is_active : true
        ];

        const result = await db.query(query, values);
        return new Page(result.rows[0]);
    }

    // Mettre à jour une page
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramCounter = 1;

        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                fields.push(`${key} = $${paramCounter}`);
                values.push(updateData[key]);
                paramCounter++;
            }
        });

        if (fields.length === 0) {
            throw new Error('Aucun champ à mettre à jour');
        }

        values.push(this.id);
        const query = `
            UPDATE pages 
            SET ${fields.join(', ')}
            WHERE id = $${paramCounter}
            RETURNING *
        `;

        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Page non trouvée');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Supprimer une page (soft delete)
    async delete() {
        const query = 'UPDATE pages SET is_active = false WHERE id = $1 RETURNING *';
        const result = await db.query(query, [this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Page non trouvée');
        }
        
        this.is_active = false;
        return this;
    }

    // Récupérer toutes les pages actives (alias pour findAll pour plus de clarté)
    static async getAllActive() {
        return await this.findAll();
    }

    // Convertir en JSON pour l'API
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            display_name: this.display_name,
            description: this.description,
            route_pattern: this.route_pattern,
            is_active: this.is_active,
            created_at: this.created_at
        };
    }
}

module.exports = Page;
