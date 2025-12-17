// app/models/artist.model.js
const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    default: ''
  },
  birthDate: {
    type: Date
  },
  deathDate: {
    type: Date
  },
  nationality: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Artist', artistSchema);