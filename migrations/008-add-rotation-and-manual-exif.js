'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Images');

    // Add rotation field
    if (!tableDescription.rotation) {
      await queryInterface.addColumn('Images', 'rotation', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    // Add manualExif field (JSON blob for manual overrides)
    if (!tableDescription.manualExif) {
      await queryInterface.addColumn('Images', 'manualExif', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
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