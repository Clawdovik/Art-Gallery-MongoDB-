require('dotenv').config();

module.exports = {
  HOST: process.env.DB_HOST || 'localhost',
  PORT: process.env.DB_PORT || 27017,
  DB: process.env.DB_NAME || 'art_gallery',
  // MongoDB не требует USER/PASSWORD в таком формате
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD
};