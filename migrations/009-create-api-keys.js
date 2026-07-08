'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Index on key for fast lookups
    await queryInterface.addIndex('api_keys', ['key'], {
      unique: true,
      name: 'api_keys_key_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('api_keys');
  },
};