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

// ===== IN-MEMORY GAME MESSAGE STORAGE =====
// Map to track game messages and their roomIds
// Key: "chatId:messageId" (for messages) or "inline:inlineMessageId" (for inline)
// Value: roomId
const gameMessages = new Map();

// Cleanup function for old game sessions (older than 24 hours)
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [key, value] of gameMessages.entries()) {
    if (now - value.createdAt > maxAge) {
      gameMessages.delete(key);
      console.log(`🧹 Cleaned up old game: ${key}`);
    }
  }
}, 60 * 60 * 1000); // Run cleanup every hour

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
  const userName = msg.from.first_name || 'Player';

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
    const gameUrl = `${APP_URL}/?roomId=${encodeURIComponent(roomId)}`;
    console.log(`📍 Game URL: ${gameUrl}`);
    
    // Always use web_app button to open Mini App (works in groups and DMs)
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

    const response = await bot.sendMessage(chatId, messageText, messageOptions);
    const messageId = response.message_id;
    
    // Track this game message
    const gameKey = `${chatId}:${messageId}`;
    gameMessages.set(gameKey, {
      roomId,
      createdAt: Date.now(),
      chatId,
      messageId
    });
    
    console.log(`✅ Game message sent with web_app to chat ${chatId}, tracked at ${gameKey}`);
    
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
    const inlineMessageKey = `inline:${roomId}`; // We'll update this later with actual inline_message_id
    
    console.log(`📱 Inline query: creating game ${roomId}`);
    
    // Use game_short_name type instead of article for web_app buttons
    const results = [
      {
        type: 'game',
        id: roomId,
        game_short_name: 'keepitall'  // Must be defined in BotFather
      }
    ];
    
    // Pre-store the roomId with a temporary key
    // When callback comes, we'll know the actual inline_message_id
    gameMessages.set(inlineMessageKey, {
      roomId,
      createdAt: Date.now(),
      isInline: true
    });
    
    console.log(`📍 Inline game ${roomId} created and tracked at ${inlineMessageKey}`);
    
    bot.answerInlineQuery(query.id, results, {
      cache_time: 0,
      is_personal: true
    });
    
    console.log(`✅ Inline result sent for game ${roomId}`);
  } catch (error) {
    console.error('❌ Error in inline_query:', error.message);
  }
});

// Callback query handler - для кнопок Play на inline сообщениях и web_app
bot.on('callback_query', async (q) => {
  try {
    if (!q.game_short_name) {
      console.log('⚠️ Callback query without game_short_name, ignoring');
      return;
    }

    console.log(`🎮 Play callback received for game ${q.id}`);
    
    // Try to find existing roomId for this game
    let roomId = null;
    let gameData = null;
    
    // Check if it's from inline message
    if (q.inline_message_id) {
      const inlineKey = `inline:${q.id}`;
      gameData = gameMessages.get(inlineKey);
      if (gameData) {
        roomId = gameData.roomId;
        console.log(`📍 Found existing inline game: ${roomId}`);
        
        // Update the key to include actual inline_message_id for future lookups
        gameMessages.delete(inlineKey);
        const newKey = `inline:${q.inline_message_id}`;
        gameMessages.set(newKey, gameData);
      }
    }
    // Check if it's from regular message
    else if (q.message && q.message.message_id) {
      const chatId = q.message.chat.id;
      const messageKey = `${chatId}:${q.message.message_id}`;
      gameData = gameMessages.get(messageKey);
      if (gameData) {
        roomId = gameData.roomId;
        console.log(`📍 Found existing chat game: ${roomId}`);
      }
    }
    
    // If no existing game found, create a new one (fallback)
    if (!roomId) {
      roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log(`⚠️ No game found, creating new: ${roomId}`);
    }
    
    const url = `${APP_URL}/?roomId=${encodeURIComponent(roomId)}`;
    console.log(`📍 Opening game ${roomId} at ${url}`);

    await bot.answerCallbackQuery(q.id, { url });
    console.log(`✅ Callback query answered - ${q.inline_message_id ? 'inline' : 'message'} game ${roomId}`);
  } catch (error) {
    console.error('❌ Error in callback_query:', error.message);
    try {
      await bot.answerCallbackQuery(q.id, { alert: true, text: '❌ Failed to open game' });
    } catch (err) {
      console.error('❌ Error answering callback query:', err.message);
    }
  }
});

bot.on('error', (error) => {
  console.error('Bot error:', error.message);
});

console.log('🤖 Telegram bot started');
console.log(`📱 App URL: ${APP_URL}`);
console.log(`🔗 API URL: ${API_URL}`);
