// server.js - НАЧАЛО (первая часть)
require('dotenv').config();
const express = require("express");
const mongoose = require('mongoose');
const path = require("path");

// Сессии и аутентификация
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');

// Импорт моделей
const db = require("./app/models");

const app = express();

const PORT = process.env.PORT || 6868;

async function startServer() {
  try {
    console.log(`🚀 Сервер будет запущен на порту: ${PORT}`);
    console.log(`🌍 Режим: ${process.env.NODE_ENV || 'development'}`);

    // Подключаем MongoDB
    await db.connectDB();
    
    // Middleware
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // === Настройка хранилища сессий (MongoDB) ===
    app.use(session({
      store: MongoStore.create({
        mongoUrl: mongoose.connection.client.s.url,
        collectionName: 'user_sessions'
      }),
      secret: process.env.SESSION_SECRET || 'my-super-secret-key-12345',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      }
    }));

    // Логирование всех запросов
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // Заполняем базу начальными данными
    try {
      const seedInitialData = require('./app/seeders/initialData');
      await seedInitialData();
    } catch (error) {
      console.log("⚠️  Ошибка при заполнении начальных данных:", error.message);
    }

    // server.js - ПРОДОЛЖЕНИЕ (маршруты)

// ========== Middleware для защиты маршрутов ==========
const checkAuth = (req, res, next, requiredRole = null) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Доступ запрещен. Пожалуйста, войдите." });
  }
  
  if (requiredRole && req.session.role !== requiredRole) {
      return res.status(403).json({ error: "Недостаточно прав. Требуется роль: " + requiredRole });
  }

  next();
};

const checkAdmin = (req, res, next) => checkAuth(req, res, next, 'admin');

// ==================== МАРШРУТЫ АУТЕНТ. ====================

// Регистрация
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Имя пользователя и пароль обязательны" });
  }

  try {
    const existingUser = await db.User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Пользователь с таким именем уже существует" });
    }

    // Создаем пользователя с ролью 'user' по умолчанию
    const newUser = new db.User({ username, password, role: 'user' });
    await newUser.save();

    // Сразу логиним пользователя
    req.session.userId = newUser._id.toString();
    req.session.username = newUser.username;
    req.session.role = newUser.role;

    res.status(201).json({ 
      id: newUser._id, 
      username: newUser.username, 
      role: newUser.role 
    });
  } catch (err) {
    console.error("❌ Ошибка регистрации:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Вход
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Имя пользователя и пароль обязательны" });
  }

  try {
    const user = await db.User.findOne({ username });
    
    if (!user) {
      return res.status(401).json({ error: "Неверное имя пользователя или пароль" });
    }

    const isValid = await user.validatePassword(password);
    
    if (!isValid) {
      return res.status(401).json({ error: "Неверное имя пользователя или пароль" });
    }

    // Сохраняем в сессию
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({ 
      id: user._id, 
      username: user.username, 
      role: user.role 
    });
  } catch (err) {
    console.error("❌ Ошибка входа:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Выход
app.post("/api/auth/logout", (req, res) => {
  if (!req.session) {
    return res.json({ message: "Сессия отсутствует" });
  }
  req.session.destroy(err => {
    if (err) {
      console.error("❌ Ошибка при уничтожении сессии:", err);
      return res.status(500).json({ error: "Не удалось выйти из системы" });
    }
    res.json({ message: "Выход выполнен успешно" });
  });
});

// Получение информации о пользователе и сессии
app.get("/api/auth/session", (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ 
      isAuthenticated: true, 
      userId: req.session.userId, 
      username: req.session.username,
      role: req.session.role
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// ==================== МАРШРУТЫ АДМИНИСТРИРОВАНИЯ ====================

// Просмотр всех пользователей и количества их картин (Только для Админа)
app.get("/api/admin/users", checkAdmin, async (req, res) => {
  try {
    const users = await db.User.aggregate([
      {
        $lookup: {
          from: 'pictures',
          localField: '_id',
          foreignField: 'userId',
          as: 'pictures'
        }
      },
      {
        $project: {
          id: '$_id',
          username: 1,
          role: 1,
          createdAt: 1,
          pictureCount: { $size: '$pictures' }
        }
      },
      { $sort: { id: 1 } }
    ]);

    res.json(users);
  } catch (err) {
    console.error("❌ Ошибка при получении списка пользователей:", err);
    res.status(500).json({ error: "Не удалось получить список пользователей" });
  }
});

// ==================== МАРШРУТЫ КАРТИН ====================

// Получение списка всех картин (Public)
app.get("/api/pictures", async (req, res) => {
    try {
        const pictures = await db.Picture.find()
          .populate('artistId')
          .populate('userId', 'username');
        res.json(pictures);
    } catch (err) {
        console.error("❌ Ошибка при получении списка картин:", err);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
});

// Создание новой картины (Protected)
app.post("/api/pictures", (req, res, next) => checkAuth(req, res, next), async (req, res) => {
  const { title, artist, artistId, year, description, imageUrl, style, price, size } = req.body;
  
  if (!title || !imageUrl) {
    return res.status(400).json({ error: "Название и URL изображения обязательны" });
  }

  try {
    const newPicture = new db.Picture({
      title,
      artist,
      artistId,
      userId: req.session.userId,
      year,
      description,
      imageUrl,
      style,
      price,
      size
    });
    
    await newPicture.save();
    
    // Возвращаем картину с populated данными
    const populatedPicture = await db.Picture.findById(newPicture._id)
      .populate('artistId')
      .populate('userId', 'username');
      
    res.status(201).json(populatedPicture);
  } catch (err) {
    console.error("❌ Ошибка при создании картины:", err);
    res.status(500).json({ error: err.message || "Внутренняя ошибка сервера при создании" });
  }
});

// Обновление картины по ID (Protected, с проверкой прав)
app.put("/api/pictures/:id", (req, res, next) => checkAuth(req, res, next), async (req, res) => {
  const pictureId = req.params.id;
  const { title, artist, artistId, year, description, imageUrl, style, price, size } = req.body;
  
  try {
    const picture = await db.Picture.findById(pictureId);

    if (!picture) {
      return res.status(404).json({ error: "Картина не найдена" });
    }
    
    // !!! ПРОВЕРКА ПРАВ: Администратор или владелец картины
    const isOwner = picture.userId.toString() === req.session.userId;
    const isAdmin = req.session.role === 'admin';
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "У вас нет прав для изменения этой картины" });
    }
    
    // Обновление
    const updatedPicture = await db.Picture.findByIdAndUpdate(
      pictureId,
      { title, artist, artistId, year, description, imageUrl, style, price, size },
      { new: true, runValidators: true }
    ).populate('artistId').populate('userId', 'username');

    if (updatedPicture) {
      res.json(updatedPicture);
    } else {
      res.status(500).json({ error: "Не удалось обновить картину" });
    }

  } catch (err) {
    console.error("❌ Ошибка при обновлении картины:", err);
    res.status(500).json({ error: "Внутренняя ошибка сервера при обновлении" });
  }
});

// Удаление картины по ID (Protected, с проверкой прав)
app.delete("/api/pictures/:id", (req, res, next) => checkAuth(req, res, next), async (req, res) => {
  const pictureId = req.params.id;
  
  try {
    const picture = await db.Picture.findById(pictureId);

    if (!picture) {
      return res.status(404).json({ error: "Картина не найдена" });
    }

    // !!! ПРОВЕРКА ПРАВ: Администратор или владелец картины
    const isOwner = picture.userId.toString() === req.session.userId;
    const isAdmin = req.session.role === 'admin';
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "У вас нет прав для удаления этой картины" });
    }

    await db.Picture.findByIdAndDelete(pictureId);

    res.json({ message: "Картина успешно удалена" });

  } catch (err) {
    console.error("❌ Ошибка при удалении картины:", err);
    res.status(500).json({ error: "Внутренняя ошибка сервера при удалении" });
  }
});

// Получение информации о картине по ID (Public)
app.get("/api/pictures/:id", async (req, res) => {
    try {
        const picture = await db.Picture.findById(req.params.id)
          .populate('artistId')
          .populate('userId', 'username');

        if (!picture) {
            return res.status(404).json({ error: "Картина не найдена" });
        }

        res.json(picture);
    } catch (err) {
        console.error("❌ Ошибка при получении картины по ID:", err);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
});

// ==================== МАРШРУТЫ АРТИСТОВ ====================

// Получение списка художников (Public)
app.get("/api/artists", async (req, res) => {
  try {
    const artists = await db.Artist.find().sort({ name: 1 });
    res.json(artists);
  } catch (err) {
    console.error("❌ Ошибка при получении списка художников:", err);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// Получение художника по ID (Public)
app.get("/api/artists/:id", async (req, res) => {
  try {
    const artist = await db.Artist.findById(req.params.id);
    if (!artist) {
      return res.status(404).json({ error: "Художник не найден" });
    }
    res.json(artist);
  } catch (err) {
    console.error("❌ Ошибка при получении художника по ID:", err);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// Получение картин художника (Public)
app.get("/api/artists/:id/pictures", async (req, res) => {
  try {
    const pictures = await db.Picture.find({ artistId: req.params.id })
      .populate('artistId')
      .populate('userId', 'username');
      
    res.json(pictures);
  } catch (err) {
    console.error("❌ Ошибка при получении картин художника:", err);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// ==================== ОБРАБОТКА ОСТАЛЬНЫХ ЗАПРОСОВ ====================

// !!! КРИТИЧЕСКИ ВАЖНЫЙ БЛОК ДЛЯ SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка 404 для API
app.use("/api/*", (req, res) => {
  console.log(`❌ API маршрут не найден: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: "API маршрут не найден",
    path: req.originalUrl 
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error("💥 Необработанная ошибка:", err);
  res.status(500).json({ 
    error: "Внутренняя ошибка сервера"
  });
});

console.log("🔄 Загруженные маршруты:");
console.log("   ... (Маршруты для справки) ...");

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен. Прослушивание порта: ${PORT}`);
});
    
  } catch (error) {
    console.error("💥 Критическая ошибка при запуске сервера:", error);
    process.exit(1);
  }
}

startServer();