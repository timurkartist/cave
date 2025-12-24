import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.hetzner' : '.env';
dotenv.config({ path: envFile });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'https://keep-it-all.com';

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

console.log('🤖 Bot Configuration:');
console.log(`  BOT_TOKEN: ${BOT_TOKEN.substring(0, 10)}...`);
console.log(`  APP_URL: ${APP_URL}`);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Функция обработки команды /start
const handleStartCommand = (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type; // 'private', 'group', 'supergroup', 'channel'
  const userId = msg.from.id;
  
  let messageText = '🎮 <b>Welcome to Cave of Greed!</b>\n\n' +
    '🏴‍☠️ <i>A multiplayer treasure hunting game</i>\n\n';
  
  const buttons = [];
  
  if (chatType === 'private') {
    // For DM: show solo mode
    messageText += '⚡ <b>Game modes:</b>\n' +
      '1. <b>Solo Mode</b> - Play alone\n\n' +
      '📖 Use /help for more info';
    
    buttons.push({ 
      text: '🎮 Start Game', 
      web_app: { url: `${APP_URL}?startapp=solo` }
    });
  } else {
    // For groups: show multiplayer mode
    messageText += '👥 <b>Multiplayer Mode</b>\n' +
      'Click the button below to join a shared game with other group members!\n\n' +
      '⚡ <b>Rules:</b>\n' +
      '• Everyone in the group plays together\n' +
      '• 2+ players needed to start\n' +
      '• Explore the cave 🕳️ collect treasure 💎\n\n' +
      '📖 Use /help for more info';
    
    buttons.push({ 
      text: '🎮 Join Group Game', 
      web_app: { url: `${APP_URL}?startapp=group` }
    });
  }
  
  bot.sendMessage(chatId, messageText, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [buttons]
    }
  });
};

// Функция обработки команды /help
const handleHelpCommand = (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId,
    '📖 <b>Cave of Greed - How to Play</b>\n\n' +
    '<b>/start</b> - Show welcome and play button\n' +
    '<b>/help</b> - Show this message\n\n' +
    '🎮 <b>Game modes:</b>\n' +
    '• <b>Group Game</b> - All members in one group share the same lobby\n' +
    '• <b>Solo Game</b> - Play alone against AI\n\n' +
    '👥 <b>How to play in groups:</b>\n' +
    '1. Use /start to show the game button\n' +
    '2. Click "Join Group Game" button\n' +
    '3. Everyone who clicks joins the SAME game\n' +
    '4. Game starts when 2+ players ready\n' +
    '5. Explore the cave and collect treasure!\n\n' +
    '⚡ <b>Important:</b> Each group has its own game room!\n' +
    '🔐 Secure: Only group members can see and join',
    { parse_mode: 'HTML' }
  );
};

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

// Inline query handler - использую Telegram Game API
bot.on('inline_query', async (q) => {
  try {
    console.log(`📱 Inline game query from user ${q.from.id}`);
    
    const results = [{
      type: 'game',
      id: 'keepitall',
      game_short_name: 'keepitall'
    }];

    await bot.answerInlineQuery(q.id, results, { cache_time: 0, is_personal: true });
    console.log(`✅ Game result sent`);
  } catch (error) {
    console.error('❌ Error in inline_query:', error.message);
  }
});

// Callback query handler - обработка клика на Play в игре
bot.on('callback_query', async (q) => {
  try {
    if (!q.game_short_name) {
      console.log('⚠️ Callback query without game_short_name, ignoring');
      return;
    }

    console.log(`🎮 Game callback from user ${q.from.id}, game: ${q.game_short_name}`);

    // Используем inline_message_id (для inline) или message_id (для обычных сообщений)
    // как идентификатор лобби - все кто кликнет на одно сообщение попадут в одно лобби
    const messageId = q.inline_message_id || q.message?.message_id;
    
    if (!messageId) {
      console.warn('⚠️ No message_id or inline_message_id found');
      await bot.answerCallbackQuery(q.id, {
        text: '❌ Error: could not identify game session',
        show_alert: true
      });
      return;
    }
    
    // Кодируем messageId как start_param для передачи в мини-приложение
    // Telegram передаст это в initDataUnsafe.start_param
    const startParam = Buffer.from(`msg_${messageId}`).toString('base64');
    const url = `${APP_URL}?startapp=game`;
    
    console.log(`📍 Opening game with message_id: ${messageId} (encoded: ${startParam})`);

    await bot.answerCallbackQuery(q.id, { url });
    console.log(`✅ Game URL sent to user`);
  } catch (error) {
    console.error('❌ Error in callback_query:', error.message);
  }
});

// Обработка всех сообщений (работает в личных чатах и группах)
bot.on('message', (msg) => {
  const text = msg.text || '';
  
  if (!text) return;
  
  // Обработка команд (с и без @BotName)
  if (text === '/start' || text === '/start@CaveOfGreedBot' || text.startsWith('/start ')) {
    handleStartCommand(msg);
  } else if (text === '/help' || text === '/help@CaveOfGreedBot') {
    handleHelpCommand(msg);
  } else if (text.match(/^\/\w+/)) {
    // Unknown command
    const command = text.match(/^\/(\w+)/)[1];
    bot.sendMessage(msg.chat.id,
      `❓ Unknown command: /${command}\n\nUse /help to see available commands.`
    );
  }
});

bot.on('error', (error) => {
  console.error('Bot error:', error.message);
});

console.log('🤖 Telegram bot started');
console.log(`📱 App URL: ${APP_URL}`);
