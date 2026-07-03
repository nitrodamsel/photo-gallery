'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Images');

    // Add rotation column if not exists
    if (!tableDescription.rotation) {
      await queryInterface.addColumn('Images', 'rotation', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Non-destructive rotation: 0, 90, 180, 270, -1 (flipH), -2 (flipV)'
      });
    }

    // Add manualExif column if not exists
    if (!tableDescription.manualExif) {
      await queryInterface.addColumn('Images', 'manualExif', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Manual EXIF overrides: { caption, location, dateTaken, camera, lens }'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Images');

    if (tableDescription.rotation) {
      await queryInterface.removeColumn('Images', 'rotation');
    }

    if (tableDescription.manualExif) {
      await queryInterface.removeColumn('Images', 'manualExif');
    }
  }
};