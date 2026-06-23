'use strict';

const { v4: uuidv4 } = require('uuid');

const IMAGES = [
  {
    filename: 'sample-forest-trail.jpg',
    originalName: 'Forest Trail.jpg',
    mimeType: 'image/jpeg',
    fileSize: 204800,
    width: 1920,
    height: 1280,
    description: 'A serene forest trail in the early morning mist.',
    tagSlug: 'nature',
  },
  {
    filename: 'sample-city-bridge.jpg',
    originalName: 'City Bridge.jpg',
    mimeType: 'image/jpeg',
    fileSize: 358400,
    width: 2560,
    height: 1440,
    description: 'An iconic suspension bridge at golden hour.',
    tagSlug: 'architecture',
  },
  {
    filename: 'sample-street-market.jpg',
    originalName: 'Street Market.jpg',
    mimeType: 'image/jpeg',
    fileSize: 174080,
    width: 1600,
    height: 1200,
    description: 'Busy street market with colourful stalls.',
    tagSlug: 'street',
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const img of IMAGES) {
      // Check image doesn't already exist
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM images WHERE filename = '${img.filename}' LIMIT 1`
      );
      if (existing && existing.length > 0) continue;

      const imageId = uuidv4();
      await queryInterface.bulkInsert('images', [
        {
          id: imageId,
          filename: img.filename,
          originalName: img.originalName,
          mimeType: img.mimeType,
          fileSize: img.fileSize,
          width: img.width,
          height: img.height,
          exifData: null,
          uploadedAt: now,
          description: img.description,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // Link to tag
      const [tags] = await queryInterface.sequelize.query(
        `SELECT id FROM tags WHERE slug = '${img.tagSlug}' LIMIT 1`
      );
      if (tags && tags.length > 0) {
        const tagId = tags[0].id;
        await queryInterface.bulkInsert('image_tags', [
          {
            id: uuidv4(),
            imageId,
            tagId,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    const filenames = IMAGES.map((i) => `'${i.filename}'`).join(', ');
    if (filenames) {
      await queryInterface.sequelize.query(
        `DELETE FROM images WHERE filename IN (${filenames})`
      );
    }
  },
};