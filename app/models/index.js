// app/models/index.js
const mongoose = require('mongoose');
const dbConfig = require("../config/db.config.js");

// Подключение к MongoDB
const connectDB = async () => {
  try {
    let connectionString;
    
    if (dbConfig.USER && dbConfig.PASSWORD) {
      // Если есть логин/пароль
      connectionString = `mongodb://${dbConfig.USER}:${dbConfig.PASSWORD}@${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;
    } else {
      // Локальное подключение
      connectionString = `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;
    }
    
    await mongoose.connect(connectionString);
    console.log('✅ MongoDB подключена успешно');
  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
};

// Модели
const db = {};
db.User = require('./user.model.js');
db.Artist = require('./artist.model.js');
db.Picture = require('./picture.model.js');
db.Exhibition = require('./exhibition.model.js');

// Функция подключения
db.connectDB = connectDB;

module.exports = db;