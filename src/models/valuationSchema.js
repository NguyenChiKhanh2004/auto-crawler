module.exports = (sequelize, DataTypes) => {
  const ValuationRecord = sequelize.define('ValuationRecord', {
    index: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    postcode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fullAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bedrooms: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    propertyType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    valuationType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Dữ liệu lấy ra sau khi submit
    minValueSales: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    maxValueSales: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    minValueLettings: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    maxValueLettings: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    currentEnergyRating: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    potentialEnergyRating: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    tableName: 'valuation_records',
    timestamps: true
  });

  return ValuationRecord;
};
