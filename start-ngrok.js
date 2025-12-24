import ngrok from "@ngrok/ngrok";
import fs from "fs";
import dotenv from "dotenv";

// Load current env
dotenv.config();

async function startNgrok() {
  try {
    // Check if authtoken exists
    if (!process.env.NGROK_AUTHTOKEN) {
      console.error("❌ NGROK_AUTHTOKEN not found in .env file");
      console.error("📝 Please add your ngrok authtoken to .env:");
      console.error("   1. Get token: https://dashboard.ngrok.com/get-started/your-authtoken");
      console.error("   2. Add to .env: NGROK_AUTHTOKEN=your_token_here");
      process.exit(1);
    }

    // ===== ДВА ОТДЕЛЬНЫХ ТУННЕЛЯ ДЛЯ ФРОНТЕНДА И БЭКЕНДА =====
    // Туннель 1: Фронтенд на localhost:3000 → cave.ngrok.app
    const frontendTunnel = await ngrok.connect({
      addr: 'http://localhost:3000',
      authtoken: process.env.NGROK_AUTHTOKEN,
      proto: 'http',
      domain: 'cave.ngrok.app'  // ✅ Платный custom domain для фронтенда
    });
    
    const frontendUrl = frontendTunnel.url();
    if (!frontendUrl) {
      throw new Error("Failed to get ngrok URL for frontend");
    }
    
    console.log(`✅ Frontend tunnel started: ${frontendUrl}`);
    
    // Туннель 2: Бэкенд на localhost:3001 → для WebSocket
    // Используем второй reserved domain или автоматический
    const backendTunnel = await ngrok.connect({
      addr: 'http://localhost:3001',
      authtoken: process.env.NGROK_AUTHTOKEN,
      proto: 'http'
      // Без domain - будет автоматический домен ngrok-free.app
    });
    
    const backendUrl = backendTunnel.url();
    if (!backendUrl) {
      throw new Error("Failed to get ngrok URL for backend");
    }
    
    console.log(`✅ Backend tunnel started: ${backendUrl}`);
    
    // Извлекаем hostname из backend URL для WebSocket
    const backendHostname = new URL(backendUrl).hostname;
    const wsUrl = `wss://${backendHostname}`;
    
    // Update .env с обоими туннелями
    let envContent = fs.readFileSync(".env", "utf-8");
    let newEnvContent = envContent;
    
    // Update VITE_APP_URL (фронтенд)
    if (newEnvContent.includes('VITE_APP_URL=')) {
      newEnvContent = newEnvContent.replace(
        /VITE_APP_URL=.*/,
        `VITE_APP_URL=${frontendUrl}`
      );
    } else {
      newEnvContent += `\nVITE_APP_URL=${frontendUrl}`;
    }
    
    // Update VITE_API_URL (бэкенд для API запросов)
    if (newEnvContent.includes('VITE_API_URL=')) {
      newEnvContent = newEnvContent.replace(
        /VITE_API_URL=.*/,
        `VITE_API_URL=${backendUrl}`
      );
    } else {
      newEnvContent += `\nVITE_API_URL=${backendUrl}`;
    }
    
    // Update VITE_WS_URL (бэкенд для WebSocket - используем backend домен)
    if (newEnvContent.includes('VITE_WS_URL=')) {
      newEnvContent = newEnvContent.replace(
        /VITE_WS_URL=.*/,
        `VITE_WS_URL=${wsUrl}`
      );
    } else {
      newEnvContent += `\nVITE_WS_URL=${wsUrl}`;
    }
    
    // Update TELEGRAM_APP_URL (указываем на фронтенд)
    if (newEnvContent.includes('TELEGRAM_APP_URL=')) {
      newEnvContent = newEnvContent.replace(
        /TELEGRAM_APP_URL=.*/,
        `TELEGRAM_APP_URL=${frontendUrl}`
      );
    } else {
      newEnvContent += `\nTELEGRAM_APP_URL=${frontendUrl}`;
    }
    
    fs.writeFileSync(".env", newEnvContent);
    console.log(`✅ Updated .env:`);
    console.log(`   VITE_APP_URL=${frontendUrl}`);
    console.log(`   VITE_API_URL=${backendUrl}`);
    console.log(`   VITE_WS_URL=${wsUrl}`);
    console.log(`   TELEGRAM_APP_URL=${frontendUrl}`);
    
    // Keep ngrok running indefinitely
    console.log("\n🔗 Ngrok tunnels are running (2 separate tunnels):");
    console.log(`🌐 Frontend:  http://localhost:3000 → ${frontendUrl}`);
    console.log(`🔌 Backend:   http://localhost:3001 → ${backendUrl}`);
    console.log(`📡 WebSocket: ws://localhost:3001 → ${wsUrl}`);
    console.log("\n✨ Frontend custom domain: cave.ngrok.app (PERMANENT & STABLE)");
    console.log(`✨ Backend auto domain: ${backendHostname}`);
    console.log("\n📱 Share this URL with other players: " + frontendUrl);
    console.log("Press Ctrl+C to stop.");
    
    // Also handle process termination gracefully
    process.on("SIGINT", async () => {
      console.log("\n🛑 Shutting down ngrok...");
      await ngrok.disconnect();
      process.exit(0);
    });
  } catch (err) {
    console.error("❌ Error starting ngrok:", err.message);
    console.error("❌ Full error:", err);
    
    // Если ошибка про custom domain - дайте подсказку
    if (err.message && err.message.includes('domain')) {
      console.error("\n💡 ВНИМАНИЕ:");
      console.error("   Ваш аккаунт ngrok не имеет зарезервированный domain cave.ngrok.app");
      console.error("   Решение 1: Купите PRO аккаунт и зарезервируйте domain");
      console.error("   Решение 2: Используйте ngrok CLI с бесплатным доменом:");
      console.error("      ngrok http 3000");
      console.error("   Решение 3: Обновите domain в start-ngrok.js на ваш reserved domain");
    }
    process.exit(1);
  }
}

startNgrok();
