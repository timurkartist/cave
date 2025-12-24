import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.hetzner' : '.env';
dotenv.config({ path: envFile });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = process.env.BACKEND_URL || process.env.VITE_API_URL || 'https://keep-it-all.com/api';
const APP_URL = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'https://keep-it-all.com';

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Функция обработки команды /start
const handleStartCommand = (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  bot.sendMessage(chatId, 
    '🎮 *Welcome to Cave of Greed!*\n\n' +
    'A multiplayer treasure hunting game\n\n' +
    'Use /newgame to start a new game session with your friends!',
    { parse_mode: 'Markdown', reply_markup: {
      inline_keyboard: [[
        { text: '🎮 Play Solo', web_app: { url: `${APP_URL}?mode=solo&userId=${userId}` } }
      ]]
    }}
  );
};

// Функция обработки команды /newgame
const handleNewGameCommand = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.first_name;

  try {
    // ===== Генерируем короткий уникальный roomId =====
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Отправляем на сервер для регистрации
    try {
      const response = await axios.post(`${API_URL}/api/telegram/register-game`, {
        roomId,
        chatId,
        creatorId: userId,
        creatorName: userName
      });
      console.log('✅ Game registered:', response.data);
    } catch (error) {
      console.warn('⚠️ Could not register game on server:', error.message);
      // Продолжаем всё равно - это не критично
    }
    
    // ===== ЖЕЛЕЗОБЕТОННО: Используем hash (#roomId=...) вместо query параметров =====
    // Это работает через ngrok прокси, в отличие от query параметров которые удаляются
    const gameUrl = `${APP_URL}/#roomId=${roomId}`;
    
    const messageOptions = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { 
            text: '🎮 Join Game Lobby',
            web_app: { url: gameUrl }
          }
        ]]
      }
    };

    const messageText = 
      `🎮 New Game Created!\n\n` +
      `👤 Created by: ${userName}\n` +
      `🆔 Game ID: ${roomId}\n\n` +
      `Click the button below to join!`;

    bot.sendMessage(chatId, messageText, messageOptions)
      .then(() => {
        console.log(`✅ Game lobby link sent to chat ${chatId} by ${userName}`);
        console.log(`📍 Room ID: ${roomId}`);
      })
      .catch(err => {
        console.error(`❌ Error sending message to chat ${chatId}:`, err.message);
      });

  } catch (error) {
    console.error('Error creating game:', error.message);
    bot.sendMessage(chatId, '❌ Failed to create game. Try again later.')
      .catch(err => console.error('Error sending error message:', err.message));
  }
});

// Функция обработки команды /help
const handleHelpCommand = (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId,
    '📖 *Commands:*\n\n' +
    '/start - Show welcome message\n' +
    '/newgame - Create new game session\n' +
    '/help - Show this help message\n\n' +
    '🎮 *How to play:*\n' +
    '1. Use /newgame to create a game\n' +
    '2. Share the game with friends\n' +
    '3. Each player joins via the button\n' +
    '4. Once 2+ players join, game starts\n' +
    '5. Explore the cave and collect treasure!',
    { parse_mode: 'Markdown' }
  );
};

// Функция обработки неизвестных команд
const handleUnknownCommand = (msg) => {
  const chatId = msg.chat.id;
  const command = msg.text.match(/^\/(\w+)/)[1];
  
  if (!['start', 'newgame', 'help'].includes(command)) {
    bot.sendMessage(chatId, 
      `❓ Unknown command: /${command}\n\n` +
      `Use /help to see available commands.`
    );
  }
};

// Обработка всех сообщений (работает в личных чатах и группах)
bot.on('message', (msg) => {
  const text = msg.text || '';
  console.log(`📨 Message from ${msg.from.first_name} (${msg.chat.id}): "${text}"`);
  
  // Игнорируем сообщения без текста
  if (!text) return;
  
  // Обработка команд (поддерживаем оба формата: /command и /command@BotName)
  if (text === '/start' || text === '/start@CaveOfGreedBot') {
    handleStartCommand(msg);
  } else if (text === '/newgame' || text === '/newgame@CaveOfGreedBot') {
    handleNewGameCommand(msg);
  } else if (text === '/help' || text === '/help@CaveOfGreedBot') {
    handleHelpCommand(msg);
  } else if (text.match(/^\/\w+/)) {
    // Неизвестная команда
    handleUnknownCommand(msg);
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});

console.log('🤖 Telegram bot started');
console.log(`📱 App URL: ${APP_URL}`);
console.log(`🔗 API URL: ${API_URL}`);
