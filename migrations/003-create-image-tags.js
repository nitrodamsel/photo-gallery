'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('image_tags', {
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

    // Unique composite index on [imageId, tagId]
    await queryInterface.addIndex('image_tags', ['imageId', 'tagId'], {
      unique: true,
      name: 'image_tags_imageId_tagId_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('image_tags');
  },
};