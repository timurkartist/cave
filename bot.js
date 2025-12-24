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

console.log('🤖 Bot Configuration:');
console.log(`  BOT_TOKEN: ${BOT_TOKEN.substring(0, 10)}...`);
console.log(`  API_URL: ${API_URL}`);
console.log(`  APP_URL: ${APP_URL}`);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Функция обработки команды /start
const handleStartCommand = (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  bot.sendMessage(chatId, 
    '🎮 <b>Welcome to Cave of Greed!</b>\n\n' +
    '🏴‍☠️ <i>A multiplayer treasure hunting game</i>\n\n' +
    '⚡ <b>Quick Start:</b>\n' +
    '• <b>/newgame</b> - Create game in this chat\n' +
    '• <b>@CaveOfGreedBot</b> - Use inline mode in any chat\n\n' +
    '📖 Use /help for full commands',
    { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '🎮 Play Solo', web_app: { url: `${APP_URL}?mode=solo&userId=${userId}` } }
        ]]
      }
    }
  );
};

// Функция обработки команды /newgame
const handleNewGameCommand = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.first_name;

  try {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log(`🎮 Creating game ${roomId} in chat ${chatId}`);
    
    // Optional: Log game creation to backend (non-critical)
    try {
      const registerUrl = `${API_URL}/api/telegram/register-game`;
      console.log(`📤 Registering game at: ${registerUrl}`);
      const response = await axios.post(registerUrl, {
        roomId,
        chatId,
        creatorId: userId,
        creatorName: userName
      }, { timeout: 3000 });
      console.log('✅ Game registered on server:', roomId);
    } catch (error) {
      console.warn('⚠️ Server registration failed (non-critical):', {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url
      });
      // Continue anyway - game creation doesn't depend on this
    }
    
    // Use query parameter (?roomId=...) instead of hash (#roomId=...)
    // userId and username will be extracted from Telegram WebApp on the client side
    const gameUrl = `${APP_URL}/?roomId=${encodeURIComponent(roomId)}`;
    console.log(`📍 Game URL: ${gameUrl}`);
    
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
      `🎮 <b>New Game Created!</b>\n\n` +
      `👤 Created by: <b>${userName}</b>\n` +
      `🆔 Game ID: <code>${roomId}</code>\n\n` +
      `🎯 Waiting for players...\n` +
      `2+ players needed to start!`;

    await bot.sendMessage(chatId, messageText, messageOptions);
    console.log(`✅ Game message sent with web_app to chat ${chatId}`);

  } catch (error) {
    console.error('❌ Error in handleNewGameCommand:', error.message);
    console.error('Stack:', error.stack);
    try {
      await bot.sendMessage(msg.chat.id, '❌ Failed to create game. Try again later.');
    } catch (err) {
      console.error('❌ Error sending error message:', err.message);
    }
  }
};

// Функция обработки команды /help
const handleHelpCommand = (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId,
    '📖 <b>Commands:</b>\n\n' +
    '<b>/start</b> - Show welcome message\n' +
    '<b>/newgame</b> - Create new game session\n' +
    '<b>/help</b> - Show this help message\n\n' +
    '🎮 <b>How to play:</b>\n' +
    '1. Use <b>/newgame</b> in any chat\n' +
    '2. Other players click <b>Join Game Lobby</b>\n' +
    '3. Select your character emoji\n' +
    '4. Game starts when 2+ players ready\n' +
    '5. Explore the cave 🕳️ collect treasure 💎\n\n' +
    '💡 <b>Tip:</b> Type <b>@CaveOfGreedBot</b> in any chat to create a game inline!',
    { parse_mode: 'HTML' }
  );
};

// Функция обработки неизвестных команд
const handleUnknownCommand = (msg) => {
  const chatId = msg.chat.id;
  const match = msg.text.match(/^\/(\w+)/);
  if (!match) return;
  
  const command = match[1];
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
  
  if (!text) return;
  
  // Обработка команд
  if (text === '/start' || text === '/start@CaveOfGreedBot') {
    handleStartCommand(msg);
  } else if (text === '/newgame' || text === '/newgame@CaveOfGreedBot') {
    handleNewGameCommand(msg);
  } else if (text === '/help' || text === '/help@CaveOfGreedBot') {
    handleHelpCommand(msg);
  } else if (text.match(/^\/\w+/)) {
    handleUnknownCommand(msg);
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

// Inline query handler - для использования бота без добавления в группу (@BotName)
bot.on('inline_query', (query) => {
  try {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const gameUrl = `${APP_URL}/?roomId=${encodeURIComponent(roomId)}`;
    
    console.log(`📱 Inline query: creating game ${roomId}`);
    
    // Use game_short_name type instead of article for web_app buttons
    const results = [
      {
        type: 'game',
        id: roomId,
        game_short_name: 'cave'  // Must be defined in BotFather
      }
    ];
    
    // If game_short_name doesn't work, fallback to article with input_message_content
    // (input_message_content doesn't support reply_markup with web_app)
    if (!results || results.length === 0) {
      results.push({
        type: 'article',
        id: roomId,
        title: '🎮 Cave of Greed - Treasure Hunt',
        description: '🏴‍☠️ Explore the cave and collect treasure with friends',
        input_message_content: {
          message_text: 
            `🎮 <b>Game Lobby Created</b>\n\n` +
            `🆔 Game ID: <code>${roomId}</code>\n` +
            `📍 Join: ${gameUrl}`,
          parse_mode: 'HTML'
        }
      });
    }
    
    bot.answerInlineQuery(query.id, results, {
      cache_time: 0,
      is_personal: true
    });
    
    console.log(`✅ Inline result sent for game ${roomId}`);
  } catch (error) {
    console.error('❌ Error in inline_query:', error.message);
  }
});

bot.on('error', (error) => {
  console.error('Bot error:', error.message);
});

console.log('🤖 Telegram bot started');
console.log(`📱 App URL: ${APP_URL}`);
console.log(`🔗 API URL: ${API_URL}`);
