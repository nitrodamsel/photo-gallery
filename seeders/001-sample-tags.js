'use strict';

const { v4: uuidv4 } = require('uuid');

const SAMPLE_TAGS = [
  { name: 'Nature',       slug: 'nature',       color: '#38A169' },
  { name: 'Architecture', slug: 'architecture', color: '#3182CE' },
  { name: 'Portrait',     slug: 'portrait',     color: '#D53F8C' },
  { name: 'Street',       slug: 'street',       color: '#DD6B20' },
  { name: 'Abstract',     slug: 'abstract',     color: '#805AD5' },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const rows = SAMPLE_TAGS.map((tag) => ({
      id: uuidv4(),
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      createdAt: now,
      updatedAt: now,
    }));

    // Avoid duplicate key errors on re-run by checking existence first
    for (const row of rows) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM tags WHERE name = ? OR slug = ? LIMIT 1`,
        {
          replacements: [row.name, row.slug],
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      if (existing.length === 0) {
        await queryInterface.bulkInsert('tags', [row], {});
      }
    }
  },

  async down(queryInterface) {
    const names = SAMPLE_TAGS.map((t) => t.name);
    await queryInterface.bulkDelete('tags', { name: names }, {});
  },
};