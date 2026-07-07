'use strict';

const { Model, DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  class ApiKey extends Model {
    static associate(models) {
      // No associations needed for now
    }

    async touch() {
      this.lastUsedAt = new Date();
      await this.save({ fields: ['lastUsedAt'] });
    }

    static generateKey() {
      return crypto.randomBytes(32).toString('hex');
    }
  }

  ApiKey.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Unnamed Key',
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  }, {
    sequelize,
    modelName: 'ApiKey',
    tableName: 'api_keys',
    timestamps: true,
    updatedAt: false,
  });

  return ApiKey;
};