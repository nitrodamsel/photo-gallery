'use strict';

const { DataTypes, Model } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  class ApiKey extends Model {
    async touch() {
      this.lastUsedAt = new Date();
      await this.save({ fields: ['lastUsedAt'] });
    }
  }

  ApiKey.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      key: {
        type: DataTypes.STRING(64),
        unique: true,
        allowNull: false,
        defaultValue: () => crypto.randomBytes(32).toString('hex'),
      },
      label: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Default',
      },
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      modelName: 'ApiKey',
      tableName: 'api_keys',
      updatedAt: false,
    }
  );

  return ApiKey;
};