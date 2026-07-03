'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Images');

    if (!tableDescription.rotation) {
      await queryInterface.addColumn('Images', 'rotation', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Non-destructive rotation in degrees: 0, 90, 180, 270'
      });
    }

    if (!tableDescription.manualExif) {
      await queryInterface.addColumn('Images', 'manualExif', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON string of manually entered EXIF overrides (caption, locationName, dateTaken)'
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