// Этот скрипт устанавливает Custom Claims (роли) для пользователей Firebase.
// Запускайте его из терминала: node set-admin-claims.js
// Или через Google Cloud Shell.

const admin = require('firebase-admin');

// ВАЖНО:
// При запуске в Google Cloud Shell или другой среде Google Cloud,
// инициализация происходит автоматически без файла ключа.
// При локальном запуске - убедитесь, что у вас настроены учетные данные
// через `gcloud auth application-default login` или есть serviceAccountKey.json
try {
  admin.initializeApp();
  console.log("Инициализация Firebase Admin SDK прошла успешно (через учетные данные среды).");
} catch (e) {
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Инициализация Firebase Admin SDK прошла успешно (через файл serviceAccountKey.json).");
  } catch (e2) {
      console.error('\x1b[31m%s\x1b[0m', 'Критическая ошибка: Не удалось инициализировать Firebase Admin SDK.');
      console.error('Причина 1: Не найдена конфигурация в среде Google Cloud.');
      console.error('Причина 2: Файл serviceAccountKey.json не найден или некорректен.');
      process.exit(1);
  }
}


// 2. Вставьте UID нужных пользователей сюда
const usersToUpdate = [
  {
    uid: 'ЗАМЕНИТЕ_НА_UID_АДМИНИСТРАТОРА', // Пользователь с email yaroslav_system.admin@trafficdevils.net
    claims: { isAdmin: true, isTechLead: false }
  },
  {
    uid: 'ЗАМЕНИТЕ_НА_UID_ТЕХЛИДА', // Пользователь с email yaroslav_system.admin@newdevils.net
    claims: { isAdmin: false, isTechLead: true }
  }
  // При необходимости добавьте других пользователей
];

async function setClaims() {
  if (usersToUpdate.some(u => u.uid.startsWith('ЗАМЕНИТЕ_НА'))) {
    console.error('\x1b[31m%s\x1b[0m', 'Ошибка: Пожалуйста, замените UID-плейсхолдеры в скрипте set-admin-claims.js на реальные UID пользователей из вашей Firebase Authentication.');
    return;
  }
  
  console.log('Начало установки ролей...');
  
  for (const user of usersToUpdate) {
    try {
      await admin.auth().setCustomUserClaims(user.uid, user.claims);
      console.log(`\x1b[32mУспех:\x1b[0m Роли ${JSON.stringify(user.claims)} установлены для пользователя с UID: ${user.uid}`);
    } catch (error) {
      console.error(`\x1b[31mОшибка для UID ${user.uid}:\x1b[0m`, error.message);
    }
  }

  console.log('Установка ролей завершена.');
}

setClaims();
