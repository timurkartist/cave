#!/usr/bin/env node

import http from 'http';

const checks = {
  'Frontend (Vite)': { url: 'http://localhost:5173', expected: 200 },
  'API Server': { url: 'http://localhost:3001/health', expected: 200 },
  'WebSocket Server': { url: 'http://localhost:3002/health', expected: 200 },
};

function checkUrl(urlString) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Timeout' });
    }, 3000);

    http.get(urlString, (res) => {
      clearTimeout(timeout);
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ success: res.statusCode === 200, status: res.statusCode, data: json });
        } catch {
          resolve({ success: res.statusCode === 200, status: res.statusCode });
        }
      });
    }).on('error', (error) => {
      clearTimeout(timeout);
      resolve({ success: false, error: error.message });
    });
  });
}

console.log('\n🔍 Connection Diagnostics\n');
console.log('═'.repeat(50));

let allHealthy = true;

for (const [name, { url }] of Object.entries(checks)) {
  const result = await checkUrl(url);
  
  if (result.success) {
    console.log(`✅ ${name.padEnd(25)} ${url}`);
    if (result.data) {
      console.log(`   └─ ${JSON.stringify(result.data)}\n`);
    } else {
      console.log('   └─ OK\n');
    }
  } else {
    console.log(`❌ ${name.padEnd(25)} ${url}`);
    console.log(`   └─ Error: ${result.error || `Status ${result.status}`}\n`);
    allHealthy = false;
  }
}

console.log('═'.repeat(50));

if (allHealthy) {
  console.log('\n✅ All services healthy!\n');
  console.log('🎮 Open: http://localhost:5173\n');
} else {
  console.log('\n❌ Some services are not running:\n');
  console.log('Run in separate terminals:');
  console.log('  Terminal 1: npm run dev');
  console.log('  Terminal 2: npm run dev:server');
  console.log('  Terminal 3: npm run dev:ws');
  console.log('  Terminal 4: npm run dev:bot\n');
  process.exit(1);
}
