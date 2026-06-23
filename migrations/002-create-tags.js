'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tags', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#3b82f6',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('tags', ['slug'], {
      unique: true,
      name: 'tags_slug_unique',
    });

    await queryInterface.addIndex('tags', ['name'], {
      unique: true,
      name: 'tags_name_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tags');
  },
};