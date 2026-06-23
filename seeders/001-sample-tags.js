'use strict';

const { v4: uuidv4 } = require('uuid');

const sampleTags = [
  {
    id: uuidv4(),
    name: 'Nature',
    slug: 'nature',
    color: '#22c55e',
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    name: 'Architecture',
    slug: 'architecture',
    color: '#3b82f6',
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    name: 'Portrait',
    slug: 'portrait',
    color: '#ec4899',
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    name: 'Street',
    slug: 'street',
    color: '#f97316',
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    name: 'Abstract',
    slug: 'abstract',
    color: '#8b5cf6',
    createdAt: new Date(),
  },
];

module.exports = {
  async up(queryInterface) {
    // Use bulkInsert but skip if tags already exist
    for (const tag of sampleTags) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM tags WHERE slug = '${tag.slug}' LIMIT 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        await queryInterface.bulkInsert('tags', [tag], {});
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tags', {
      slug: sampleTags.map((t) => t.slug),
    });
  },
};