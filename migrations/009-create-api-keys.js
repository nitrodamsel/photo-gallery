'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('api_keys', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      key: {
        type: Sequelize.STRING(64),
        unique: true,
        allowNull: false,
      },
      label: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Unnamed Key',
      },
      lastUsedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        field: 'last_used_at',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at',
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('api_keys');
  },
};