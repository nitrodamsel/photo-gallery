const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Image = sequelize.define('Image', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    storedName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    exifData: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('exifData');
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return raw; }
      },
      set(val) {
        this.setDataValue('exifData', val ? JSON.stringify(val) : null);
      }
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'images',
    timestamps: true
  });

  Image.associate = (models) => {
    Image.belongsToMany(models.Tag, {
      through: models.ImageTag,
      foreignKey: 'imageId',
      otherKey: 'tagId'
    });
    Image.hasMany(models.ImageTag, {
      foreignKey: 'imageId'
    });
    Image.hasMany(models.ThumbnailCache, {
      foreignKey: 'imageId'
    });
  };

  return Image;
};