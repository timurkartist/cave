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

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
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
});

// Обработка команды /newgame
bot.onText(/\/newgame/, async (msg) => {
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
            url: gameUrl
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

// Обработка команды /help
bot.onText(/\/help/, (msg) => {
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
});

// Обработка неизвестных команд
bot.onText(/\/(.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const command = match[1];
  
  if (!['start', 'newgame', 'help'].includes(command)) {
    bot.sendMessage(chatId, 
      `❓ Unknown command: /${command}\n\n` +
      `Use /help to see available commands.`
    );
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
