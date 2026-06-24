'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('images');

    const columnsToAdd = {
      originalFilename: { type: Sequelize.DataTypes.STRING, allowNull: true },
      publicUrl: { type: Sequelize.DataTypes.STRING, allowNull: true },
      mimeType: { type: Sequelize.DataTypes.STRING, allowNull: true },
      fileSize: { type: Sequelize.DataTypes.INTEGER, allowNull: true },
      exifData: { type: Sequelize.DataTypes.TEXT, allowNull: true },
      dateTaken: { type: Sequelize.DataTypes.DATE, allowNull: true },
      cameraMake: { type: Sequelize.DataTypes.STRING, allowNull: true },
      cameraModel: { type: Sequelize.DataTypes.STRING, allowNull: true },
      lens: { type: Sequelize.DataTypes.STRING, allowNull: true },
      focalLength: { type: Sequelize.DataTypes.STRING, allowNull: true },
      aperture: { type: Sequelize.DataTypes.STRING, allowNull: true },
      shutterSpeed: { type: Sequelize.DataTypes.STRING, allowNull: true },
      iso: { type: Sequelize.DataTypes.INTEGER, allowNull: true },
      gpsLat: { type: Sequelize.DataTypes.FLOAT, allowNull: true },
      gpsLng: { type: Sequelize.DataTypes.FLOAT, allowNull: true },
      orientation: { type: Sequelize.DataTypes.INTEGER, allowNull: true },
      width: { type: Sequelize.DataTypes.INTEGER, allowNull: true },
      height: { type: Sequelize.DataTypes.INTEGER, allowNull: true },
      thumb400Url: { type: Sequelize.DataTypes.STRING, allowNull: true },
      thumb1200Url: { type: Sequelize.DataTypes.STRING, allowNull: true },
    };

    for (const [columnName, columnDef] of Object.entries(columnsToAdd)) {
      if (!tableDescription[columnName]) {
        await queryInterface.addColumn('images', columnName, columnDef);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const columnsToRemove = [
      'originalFilename',
      'publicUrl',
      'mimeType',
      'fileSize',
      'exifData',
      'dateTaken',
      'cameraMake',
      'cameraModel',
      'lens',
      'focalLength',
      'aperture',
      'shutterSpeed',
      'iso',
      'gpsLat',
      'gpsLng',
      'orientation',
      'width',
      'height',
      'thumb400Url',
      'thumb1200Url',
    ];

    for (const columnName of columnsToRemove) {
      try {
        await queryInterface.removeColumn('images', columnName);
      } catch (err) {
        console.warn(`Could not remove column ${columnName}:`, err.message);
      }
    }
  },
};