'use strict';

const { v4: uuidv4 } = require('uuid');

const TAGS = [
  { name: 'Nature',       slug: 'nature',       color: '#2ecc71' },
  { name: 'Architecture', slug: 'architecture', color: '#3498db' },
  { name: 'Portrait',     slug: 'portrait',     color: '#e74c3c' },
  { name: 'Street',       slug: 'street',       color: '#f39c12' },
  { name: 'Abstract',     slug: 'abstract',     color: '#9b59b6' },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = TAGS.map((t) => ({
      id: uuidv4(),
      name: t.name,
      slug: t.slug,
      color: t.color,
      createdAt: now,
      updatedAt: now,
    }));

    // Only insert tags that don't already exist (idempotent seeder)
    for (const row of rows) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM tags WHERE slug = '${row.slug}' LIMIT 1`
      );
      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert('tags', [row]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tags', {
      slug: TAGS.map((t) => t.slug),
    });
  },
};