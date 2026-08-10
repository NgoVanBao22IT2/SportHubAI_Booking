'use strict';

module.exports = (sequelize, DataTypes) => {
  const VenueImage = sequelize.define('VenueImage', {
    image_id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    target_type: {
      type: DataTypes.ENUM('VENUE', 'COURT'),
      allowNull: false
    },
    target_id: {
      type: DataTypes.STRING(36),
      allowNull: false
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'venue_images',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  VenueImage.associate = function(models) {
    // Polymorphic association handling would go here if needed
  };

  return VenueImage;
};
