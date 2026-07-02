'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('Images');

    // Add rotation column
    if (!tableDesc.rotation) {
      await queryInterface.addColumn('Images', 'rotation', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Non-destructive rotation in degrees: 0, 90, 180, 270'
      });
    }

    // Add manualExif column
    if (!tableDesc.manualExif) {
      await queryInterface.addColumn('Images', 'manualExif', {
        type: Sequelize.JSON,
        defaultValue: {},
        allowNull: true,
        comment: 'Manual EXIF override fields: caption, locationName, dateTaken, camera'
      });
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable('Images');

    if (tableDesc.rotation) {
      await queryInterface.removeColumn('Images', 'rotation');
    }

    if (tableDesc.manualExif) {
      await queryInterface.removeColumn('Images', 'manualExif');
    }
  }
};