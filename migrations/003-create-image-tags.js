'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('image_tags', {
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
      tagId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tags',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    // Unique composite index to prevent duplicate image-tag pairs
    await queryInterface.addIndex('image_tags', ['imageId', 'tagId'], {
      unique: true,
      name: 'image_tags_image_id_tag_id_unique',
    });

    // Index for lookups by imageId
    await queryInterface.addIndex('image_tags', ['imageId'], {
      name: 'image_tags_image_id',
    });

    // Index for lookups by tagId
    await queryInterface.addIndex('image_tags', ['tagId'], {
      name: 'image_tags_tag_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('image_tags');
  },
};