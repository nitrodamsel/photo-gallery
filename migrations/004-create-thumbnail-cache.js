'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('thumbnail_cache', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
        type: Sequelize.STRING,
        allowNull: false,
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
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

    // Unique composite index on imageId + size
    await queryInterface.addIndex('thumbnail_cache', ['imageId', 'size'], {
      unique: true,
      name: 'thumbnail_cache_image_id_size_unique',
    });

    // Index for lookups by imageId
    await queryInterface.addIndex('thumbnail_cache', ['imageId'], {
      name: 'thumbnail_cache_image_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('thumbnail_cache');
  },
};