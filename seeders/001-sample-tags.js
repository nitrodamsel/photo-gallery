'use strict';

const { v4: uuidv4 } = require('uuid');

const SAMPLE_TAGS = [
  { name: 'Nature',       slug: 'nature',       color: '#2ecc71' },
  { name: 'Architecture', slug: 'architecture', color: '#3498db' },
  { name: 'Portrait',     slug: 'portrait',     color: '#e74c3c' },
  { name: 'Street',       slug: 'street',       color: '#f39c12' },
  { name: 'Abstract',     slug: 'abstract',     color: '#9b59b6' },
];

module.exports = {
  async run(models) {
    const { Tag } = models;
    const now = new Date();

    console.log('[Seeder] Creating sample tags...');

    for (const tagData of SAMPLE_TAGS) {
      const [tag, created] = await Tag.findOrCreate({
        where: { slug: tagData.slug },
        defaults: {
          id: uuidv4(),
          name: tagData.name,
          slug: tagData.slug,
          color: tagData.color,
          createdAt: now,
        },
      });

      if (created) {
        console.log(`  ✓ Created tag: ${tag.name}`);
      } else {
        console.log(`  - Tag already exists: ${tag.name}`);
      }
    }

    console.log('[Seeder] Sample tags complete.');
  },
};