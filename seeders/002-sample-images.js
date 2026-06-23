'use strict';

const { v4: uuidv4 } = require('uuid');

const now = new Date();

const sampleImages = [
  {
    id: uuidv4(),
    filename: 'sample-forest-001.jpg',
    originalName: 'forest.jpg',
    mimeType: 'image/jpeg',
    fileSize: 204800,
    width: 1920,
    height: 1080,
    exifData: JSON.stringify({ camera: 'Canon EOS R5', iso: 100, aperture: 'f/2.8' }),
    uploadedAt: now,
    description: 'A lush green forest in early morning light.',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuidv4(),
    filename: 'sample-city-002.jpg',
    originalName: 'cityscape.jpg',
    mimeType: 'image/jpeg',
    fileSize: 358400,
    width: 2560,
    height: 1440,
    exifData: JSON.stringify({ camera: 'Sony A7 IV', iso: 400, aperture: 'f/5.6' }),
    uploadedAt: now,
    description: 'Downtown skyline at dusk.',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuidv4(),
    filename: 'sample-portrait-003.jpg',
    originalName: 'portrait.jpg',
    mimeType: 'image/jpeg',
    fileSize: 153600,
    width: 1080,
    height: 1350,
    exifData: JSON.stringify({ camera: 'Nikon Z7', iso: 200, aperture: 'f/1.8' }),
    uploadedAt: now,
    description: 'Studio portrait with natural lighting.',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuidv4(),
    filename: 'sample-street-004.jpg',
    originalName: 'street.jpg',
    mimeType: 'image/jpeg',
    fileSize: 276480,
    width: 1920,
    height: 1280,
    exifData: JSON.stringify({ camera: 'Fujifilm X-T4', iso: 800, aperture: 'f/4.0' }),
    uploadedAt: now,
    description: 'Busy street scene in the rain.',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuidv4(),
    filename: 'sample-abstract-005.jpg',
    originalName: 'abstract.jpg',
    mimeType: 'image/jpeg',
    fileSize: 184320,
    width: 1600,
    height: 1600,
    exifData: JSON.stringify({ camera: 'iPhone 14 Pro', iso: 50, aperture: 'f/1.78' }),
    uploadedAt: now,
    description: 'Abstract macro photography of water droplets.',
    createdAt: now,
    updatedAt: now,
  },
];

module.exports = {
  async up(queryInterface) {
    for (const image of sampleImages) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM images WHERE filename = '${image.filename}' LIMIT 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        await queryInterface.bulkInsert('images', [image], {});
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('images', {
      filename: sampleImages.map((i) => i.filename),
    });
  },
};