'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('images');

    // Add rotation field
    if (!tableDescription.rotation) {
      await queryInterface.addColumn('images', 'rotation', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    // Add manualExif field
    if (!tableDescription.manualExif) {
      await queryInterface.addColumn('images', 'manualExif', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      });
    }

    // Add description field if not already present
    if (!tableDescription.description) {
      await queryInterface.addColumn('images', 'description', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('images');

    if (tableDescription.rotation) {
      await queryInterface.removeColumn('images', 'rotation');
    }

    if (tableDescription.manualExif) {
      await queryInterface.removeColumn('images', 'manualExif');
    }
  }
};