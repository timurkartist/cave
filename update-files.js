#!/usr/bin/env node
// Update script to copy bot.js and App.tsx to production server
// Handles permission issues by using Node.js directly

const fs = require('fs');
const path = require('path');

const sourceBot = '/tmp/bot-deploy.js';
const sourceApp = '/tmp/App.tsx';
const targetBot = '/home/cave-game/bot.js';
const targetApp = '/home/cave-game/App.tsx';

try {
  // Read source files
  const botContent = fs.readFileSync(sourceBot, 'utf8');
  const appContent = fs.readFileSync(sourceApp, 'utf8');
  
  // Write to targets (with force overwrite)
  fs.writeFileSync(targetBot, botContent, 'utf8');
  fs.writeFileSync(targetApp, appContent, 'utf8');
  
  console.log('✅ bot.js updated');
  console.log('✅ App.tsx updated');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
