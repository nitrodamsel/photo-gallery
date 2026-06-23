'use strict';

const { v4: uuidv4 } = require('uuid');

const SAMPLE_IMAGES = [
  {
    filename: 'sample-forest-001.jpg',
    originalName: 'forest-morning.jpg',
    mimeType: 'image/jpeg',
    fileSize: 204800,
    width: 1920,
    height: 1080,
    description: 'A misty forest in the early morning hours.',
    exifData: {
      make: 'Canon',
      model: 'EOS R5',
      iso: 200,
      aperture: 'f/4',
      shutterSpeed: '1/250',
      focalLength: '24mm',
    },
    tags: ['nature'],
  },
  {
    filename: 'sample-city-001.jpg',
    originalName: 'city-skyline.jpg',
    mimeType: 'image/jpeg',
    fileSize: 358400,
    width: 2560,
    height: 1440,
    description: 'Downtown skyline at golden hour.',
    exifData: {
      make: 'Sony',
      model: 'A7 IV',
      iso: 100,
      aperture: 'f/8',
      shutterSpeed: '1/500',
      focalLength: '35mm',
    },
    tags: ['architecture', 'street'],
  },
  {
    filename: 'sample-portrait-001.jpg',
    originalName: 'studio-portrait.jpg',
    mimeType: 'image/jpeg',
    fileSize: 153600,
    width: 1080,
    height: 1350,
    description: 'Studio portrait with natural window light.',
    exifData: {
      make: 'Nikon',
      model: 'Z6 II',
      iso: 400,
      aperture: 'f/1.8',
      shutterSpeed: '1/160',
      focalLength: '85mm',
    },
    tags: ['portrait'],
  },
  {
    filename: 'sample-abstract-001.jpg',
    originalName: 'color-waves.jpg',
    mimeType: 'image/jpeg',
    fileSize: 102400,
    width: 1200,
    height: 1200,
    description: 'Abstract color wave patterns.',
    exifData: null,
    tags: ['abstract'],
  },
  {
    filename: 'sample-street-001.jpg',
    originalName: 'rainy-street.jpg',
    mimeType: 'image/jpeg',
    fileSize: 286720,
    width: 1800,
    height: 1200,
    description: 'Reflections on a rainy city street at night.',
    exifData: {
      make: 'Fujifilm',
      model: 'X-T4',
      iso: 3200,
      aperture: 'f/2',
      shutterSpeed: '1/60',
      focalLength: '23mm',
    },
    tags: ['street', 'abstract'],
  },
];

module.exports = {
  async run(models) {
    const { Image, Tag } = models;
    const now = new Date();

    console.log('[Seeder] Creating sample images...');

    for (const imageData of SAMPLE_IMAGES) {
      const { tags: tagSlugs, ...fields } = imageData;

      const [image, created] = await Image.findOrCreate({
        where: { filename: fields.filename },
        defaults: {
          id: uuidv4(),
          ...fields,
          uploadedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      });

      if (created) {
        console.log(`  ✓ Created image: ${image.filename}`);
      } else {
        console.log(`  - Image already exists: ${image.filename}`);
      }

      // Associate tags
      if (tagSlugs && tagSlugs.length > 0) {
        const tags = await Tag.findAll({ where: { slug: tagSlugs } });
        await image.setTags(tags);
        console.log(`    Tags: ${tags.map((t) => t.name).join(', ')}`);
      }
    }

    console.log('[Seeder] Sample images complete.');
  },
};