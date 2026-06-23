'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('thumbnail_cache', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      imageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'images',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      generatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('thumbnail_cache', ['imageId', 'size'], {
      unique: true,
      name: 'thumbnail_cache_imageId_size_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('thumbnail_cache');
  },
};