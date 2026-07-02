'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Images');

    if (!tableDescription.rotation) {
      await queryInterface.addColumn('Images', 'rotation', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      });
    }

    if (!tableDescription.manualExif) {
      await queryInterface.addColumn('Images', 'manualExif', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableDescription.description) {
      await queryInterface.addColumn('Images', 'description', {
        type: Sequelize.TEXT,
        allowNull: true
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
    if (tableDescription.description) {
      await queryInterface.removeColumn('Images', 'description');
    }
  }
};