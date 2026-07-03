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

    if (!tableDescription.flipH) {
      await queryInterface.addColumn('Images', 'flipH', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
    }

    if (!tableDescription.manualExif) {
      await queryInterface.addColumn('Images', 'manualExif', {
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
    if (tableDescription.flipH) {
      await queryInterface.removeColumn('Images', 'flipH');
    }
    if (tableDescription.manualExif) {
      await queryInterface.removeColumn('Images', 'manualExif');
    }
  }
};