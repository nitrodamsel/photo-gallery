'use strict';

const { v4: uuidv4 } = require('uuid');

const SAMPLE_IMAGES = [
  {
    filename: 'sample-nature-001.jpg',
    originalName: 'forest-morning.jpg',
    mimeType: 'image/jpeg',
    fileSize: 204800,
    width: 1920,
    height: 1280,
    description: 'A peaceful forest path during early morning light.',
    exifData: { camera: 'Canon EOS R5', iso: 200, aperture: 'f/4', shutterSpeed: '1/200s' },
  },
  {
    filename: 'sample-architecture-001.jpg',
    originalName: 'city-skyline.jpg',
    mimeType: 'image/jpeg',
    fileSize: 358400,
    width: 2560,
    height: 1440,
    description: 'Downtown skyline at dusk with reflections on the river.',
    exifData: { camera: 'Sony A7 IV', iso: 400, aperture: 'f/8', shutterSpeed: '1/60s' },
  },
  {
    filename: 'sample-portrait-001.jpg',
    originalName: 'studio-portrait.jpg',
    mimeType: 'image/jpeg',
    fileSize: 153600,
    width: 1080,
    height: 1350,
    description: 'Studio portrait with soft natural window light.',
    exifData: { camera: 'Nikon Z6 II', iso: 100, aperture: 'f/2.8', shutterSpeed: '1/125s' },
  },
  {
    filename: 'sample-street-001.jpg',
    originalName: 'rainy-street.jpg',
    mimeType: 'image/jpeg',
    fileSize: 276480,
    width: 1800,
    height: 1200,
    description: 'Reflections on a wet cobblestone street at night.',
    exifData: { camera: 'Fujifilm X-T5', iso: 3200, aperture: 'f/1.8', shutterSpeed: '1/30s' },
  },
  {
    filename: 'sample-abstract-001.jpg',
    originalName: 'color-splash.jpg',
    mimeType: 'image/jpeg',
    fileSize: 122880,
    width: 1600,
    height: 1600,
    description: 'Abstract macro shot of paint droplets on canvas.',
    exifData: { camera: 'Canon EOS R5', iso: 100, aperture: 'f/16', shutterSpeed: '1/250s' },
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const img of SAMPLE_IMAGES) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM images WHERE filename = ? LIMIT 1`,
        {
          replacements: [img.filename],
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      if (existing.length === 0) {
        await queryInterface.bulkInsert('images', [
          {
            id: uuidv4(),
            filename: img.filename,
            originalName: img.originalName,
            mimeType: img.mimeType,
            fileSize: img.fileSize,
            width: img.width,
            height: img.height,
            exifData: JSON.stringify(img.exifData),
            description: img.description,
            uploadedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    const filenames = SAMPLE_IMAGES.map((i) => i.filename);
    await queryInterface.bulkDelete('images', { filename: filenames }, {});
  },
};