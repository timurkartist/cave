#!/usr/bin/env node

import http from 'http';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const ngrokUrl = process.env.VITE_API_URL || '';

console.log('\n🔍 Ngrok Status Check\n');
console.log('═'.repeat(50));

if (!ngrokUrl || ngrokUrl === 'http://localhost:3001') {
  console.log('⚠️  VITE_API_URL is not set to ngrok URL');
  console.log('   Current: ' + ngrokUrl);
  console.log('\n📝 Make sure ngrok is running:');
  console.log('   npm run start:ngrok\n');
  process.exit(1);
}

console.log('🌐 Testing ngrok URL:', ngrokUrl);
console.log('');

// выбираем http или https автоматически
const client = ngrokUrl.startsWith('https') ? https : http;

const checkNgrok = () => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('❌ TIMEOUT - ngrok not responding');
      resolve(false);
    }, 5000);

    client
      .get(ngrokUrl + '/health', (res) => {
        clearTimeout(timeout);

        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Ngrok is ONLINE');
            console.log('   Status:', res.statusCode);

            try {
              const json = JSON.parse(data);
              console.log('   Response:', JSON.stringify(json));
            } catch {
              console.log('   Response: OK');
            }

            resolve(true);
          } else {
            console.log('⚠️  Ngrok returned status:', res.statusCode);
            resolve(false);
          }
        });
      })
      .on('error', (error) => {
        clearTimeout(timeout);
        console.log('❌ Error connecting to ngrok:', error.message);
        console.log('   Make sure ngrok is running: npm run start:ngrok');
        resolve(false);
      });
  });
};

(async () => {
  const isOnline = await checkNgrok();

  console.log('\n' + '═'.repeat(50));

  if (isOnline) {
    console.log('\n✅ Everything is ready!');
    console.log('\n🎮 Services status:');
    console.log('   ✅ Backend:', ngrokUrl);
    console.log('   ✅ Frontend: http://localhost:3000');

    console.log('\n📱 Test URL:');
    console.log(
      '   ' +
        ngrokUrl +
        '/?roomId=test&userId=test123&username=Test'
    );

    process.exit(0);
  } else {
    console.log('\n❌ Ngrok is not accessible');
    console.log('\n🔧 Fix:');
    console.log('   1. Run: npm run start:ngrok');
    console.log('   2. Wait for ngrok URL to appear');
    console.log('   3. Run this check again\n');
    process.exit(1);
  }
})();
