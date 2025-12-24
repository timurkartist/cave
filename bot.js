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
// Key: "queryId" for inline results, or "roomId" for tracking
// Value: { roomId, createdAt, isInline, queryId }
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
    '⚡ <b>How to play:</b>\n' +
    '• Type <b>@CaveOfGreedBot</b> in any chat to create a game\n' +
    '• Other players click the <b>Join Game</b> button\n' +
    '• Game starts when 2+ players ready!\n\n' +
    '📖 Use /help for more info',
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

// Функция обработки команды /help
const handleHelpCommand = (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId,
    '📖 <b>Cave of Greed - How to Play</b>\n\n' +
    '<b>/start</b> - Show welcome\n' +
    '<b>/help</b> - Show this message\n\n' +
    '🎮 <b>Game modes:</b>\n' +
    '1. <b>Inline Mode (Recommended)</b> - Type <b>@CaveOfGreedBot</b> in any chat\n' +
    '2. <b>Solo Mode</b> - Play against AI treasure traps\n\n' +
    '👥 <b>Multiplayer Rules:</b>\n' +
    '• Create game with <b>@CaveOfGreedBot</b>\n' +
    '• Click <b>Join Game</b> to enter\n' +
    '• 2+ players needed to start\n' +
    '• Explore the cave 🕳️ collect treasure 💎\n\n' +
    '⚡ <b>Tip:</b> One button click per game - everyone joins same lobby!',
    { parse_mode: 'HTML' }
  );
};

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

// Inline query handler - создание игры через @BotName в любом чате
bot.on('inline_query', (query) => {
  try {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const gameUrl = `${APP_URL}/?roomId=${encodeURIComponent(roomId)}`;
    
    console.log(`📱 Inline query: creating game ${roomId}`);
    
    // Store the roomId with a temporary key using query.id
    // When callback comes, we'll update it with actual inline_message_id
    const inlineKey = `inline:${query.id}`;
    gameMessages.set(inlineKey, {
      roomId,
      createdAt: Date.now(),
      isInline: true,
      queryId: query.id
    });
    
    console.log(`✅ Inline game ${roomId} tracked at ${inlineKey}`);
    
    // Use article type with inline web_app button
    const results = [
      {
        type: 'article',
        id: roomId,
        title: '🎮 Join Game',
        description: 'Play multiplayer game',
        input_message_content: {
          message_text: `🎮 <b>Cave of Greed Game Lobby</b>\n\n🆔 Game ID: <code>${roomId}</code>\n\n👥 Waiting for players...\n2+ players needed to start!`,
          parse_mode: 'HTML'
        },
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🎮 Join Game',
              callback_data: `join_game:${roomId}`
            }
          ]]
        }
      }
    ];
    
    bot.answerInlineQuery(query.id, results, {
      cache_time: 0,
      is_personal: true
    });
    
    console.log(`✅ Inline result sent for game ${roomId}`);
  } catch (error) {
    console.error('❌ Error in inline_query:', error.message);
  }
});

// Callback query handler - для кнопок Join Game на inline сообщениях
bot.on('callback_query', async (q) => {
  try {
    // Check if this is a join_game callback
    if (q.data && q.data.startsWith('join_game:')) {
      const roomId = q.data.substring(10); // Remove "join_game:" prefix
      
      console.log(`🎮 Join game callback: ${roomId}`);
      
      // Try to find the game in gameMessages
      let found = false;
      for (const [key, value] of gameMessages.entries()) {
        if (value.roomId === roomId) {
          console.log(`📍 Found game ${roomId} at key ${key}`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log(`⚠️ Game ${roomId} not found in gameMessages, but creating anyway`);
      }
      
      const url = `${APP_URL}/?roomId=${encodeURIComponent(roomId)}`;
      console.log(`📍 Opening game ${roomId} at ${url}`);

      await bot.answerCallbackQuery(q.id, { url });
      console.log(`✅ Join callback answered for game ${roomId}`);
      
      return;
    }
    
    // Handle old game_short_name callbacks (backwards compatibility)
    if (q.game_short_name) {
      console.log(`🎮 Game short name callback received for ${q.id}`);
      
      let roomId = null;
      let gameData = null;
      
      // Check if it's from inline message
      if (q.inline_message_id) {
        const inlineKey = `inline:${q.id}`;
        gameData = gameMessages.get(inlineKey);
        if (gameData) {
          roomId = gameData.roomId;
          console.log(`📍 Found existing inline game: ${roomId}`);
          
          // Update the key to include actual inline_message_id
          gameMessages.delete(inlineKey);
          const newKey = `inline:${q.inline_message_id}`;
          gameMessages.set(newKey, gameData);
        }
      }
      
      // If no existing game found, create fallback
      if (!roomId) {
        roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log(`⚠️ No game found, creating new: ${roomId}`);
      }
      
      const url = `${APP_URL}/?roomId=${encodeURIComponent(roomId)}`;
      console.log(`📍 Opening game ${roomId} at ${url}`);

      await bot.answerCallbackQuery(q.id, { url });
      console.log(`✅ Callback query answered for game ${roomId}`);
      
      return;
    }
    
    // Unknown callback
    console.log('⚠️ Unknown callback query:', q.data);
    await bot.answerCallbackQuery(q.id, { alert: true, text: 'Unknown action' });
    
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
