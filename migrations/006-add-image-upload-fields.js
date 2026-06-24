'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('images');

    const addColumnIfMissing = async (columnName, definition) => {
      if (!tableDescription[columnName]) {
        await queryInterface.addColumn('images', columnName, definition);
      }
    };

    await addColumnIfMissing('public_url', {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });

    await addColumnIfMissing('thumbnail400_path', {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });

    await addColumnIfMissing('thumbnail400_url', {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });

    await addColumnIfMissing('thumbnail1200_path', {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });

    await addColumnIfMissing('thumbnail1200_url', {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });

    await addColumnIfMissing('camera_make', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await addColumnIfMissing('camera_model', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await addColumnIfMissing('gps_lat', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });

    await addColumnIfMissing('gps_lng', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });

    await addColumnIfMissing('date_taken', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await addColumnIfMissing('exif_data', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await addColumnIfMissing('filename', {
      type: Sequelize.STRING(512),
      allowNull: true,
    });

    await addColumnIfMissing('file_path', {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });

    await addColumnIfMissing('mime_type', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await addColumnIfMissing('file_size', {
      type: Sequelize.BIGINT,
      allowNull: true,
    });

    await addColumnIfMissing('original_name', {
      type: Sequelize.STRING(512),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const columns = [
      'public_url',
      'thumbnail400_path',
      'thumbnail400_url',
      'thumbnail1200_path',
      'thumbnail1200_url',
      'camera_make',
      'camera_model',
      'gps_lat',
      'gps_lng',
      'date_taken',
      'exif_data',
      'filename',
      'file_path',
      'mime_type',
      'file_size',
      'original_name',
    ];

    for (const col of columns) {
      try {
        await queryInterface.removeColumn('images', col);
      } catch (e) {
        // Column may not exist
      }
    }
  },
};