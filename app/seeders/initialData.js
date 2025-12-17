// app/seeders/initialData.js
const db = require('../models');

async function seedInitialData() {
  try {
    console.log("🌱 Заполнение базы начальными данными...");

    // Проверяем, есть ли уже данные
    const existingPictures = await db.Picture.countDocuments();
    if (existingPictures > 0) {
      const existingUsers = await db.User.countDocuments();
      if (existingUsers > 0) {
        console.log("✅ Пользователи уже существуют.");
      }
      console.log("✅ Начальные данные картин уже существуют, пропускаем заполнение.");
      return;
    }
    
    // ====================================================================
    // 1. Создание художников
    // ====================================================================
    console.log("👨‍🎨 Создаем художников...");
    const artists = await db.Artist.insertMany([
      {
        name: "Винсент Ван Гог",
        bio: "Нидерландский художник-постимпрессионист",
        birthDate: new Date(1853, 2, 30),
        deathDate: new Date(1890, 6, 29),
        nationality: "Голландец"
      },
      {
        name: "Леонардо да Винчи",
        bio: "Итальянский художник, ученый, изобретатель",
        birthDate: new Date(1452, 3, 15),
        deathDate: new Date(1519, 4, 2),
        nationality: "Итальянец"
      },
      {
        name: "Пабло Пикассо",
        bio: "Испанский художник, скульптор, график, керамист и дизайнер",
        birthDate: new Date(1881, 9, 25),
        deathDate: new Date(1973, 3, 8),
        nationality: "Испанец"
      }
    ]);
    
    // ====================================================================
    // 2. Создание администратора
    // ====================================================================
    console.log("🔒 Создаем пользователя-администратора...");
    const adminUsername = 'Admin';
    const adminPassword = 'HG31DXz1';
    
    const existingAdmin = await db.User.findOne({ username: adminUsername });

    if (!existingAdmin) {
        const adminUser = new db.User({
            username: adminUsername,
            password: adminPassword,
            role: 'admin'
        });
        await adminUser.save();
        console.log(`✅ Учетная запись администратора '${adminUsername}' создана.`);
    } else {
        console.log(`✅ Учетная запись администратора '${adminUsername}' уже существует.`);
    }
    
    // ====================================================================
    // 3. Создание картин (Pictures)
    // ====================================================================
    console.log("🖼️  Создаем начальные данные картин...");

    // Получаем admin пользователя для привязки картин
    const adminUser = await db.User.findOne({ username: adminUsername });
    
    const pictureData = [
      {
        title: "Звездная ночь",
        artist: "Винсент Ван Гог",
        artistId: artists.find(a => a.name === "Винсент Ван Гог")._id,
        userId: adminUser._id,
        year: 1889,
        description: "Вид из восточного окна его убежища в Сен-Реми-де-Прованс",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/800px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        style: "Постимпрессионизм",
        price: 1000000.00,
        size: "73.7 × 92.1 см"
      },
      {
        title: "Мона Лиза",
        artist: "Леонардо да Винчи",
        artistId: artists.find(a => a.name === "Леонардо да Винчи")._id,
        userId: adminUser._id,
        year: 1503,
        description: "Портрет Лизы дель Джокондо",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
        style: "Ренессанс",
        price: 8600000.00,
        size: "77 × 53 см"
      },
      {
        title: "Авиньонские девицы",
        artist: "Пабло Пикассо",
        artistId: artists.find(a => a.name === "Пабло Пикассо")._id,
        userId: adminUser._id,
        year: 1907,
        description: "Ключевая работа в развитии кубизма",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Les_Demoiselles_d%27Avignon.jpg/800px-Les_Demoiselles_d%27Avignon.jpg",
        style: "Кубизм",
        price: 3500000.00,
        size: "243.9 × 233.7 см"
      }
    ];

    await db.Picture.insertMany(pictureData);
    console.log("✅ Начальные данные успешно заполнены.");

  } catch (error) {
    console.error("❌ Ошибка при заполнении начальных данных:", error.message);
  }
}

module.exports = seedInitialData;