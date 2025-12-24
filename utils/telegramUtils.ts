/**
 * Telegram WebApp utilities for game client
 * Handles detection and data extraction from Telegram Mini App context
 */

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  raw: string;
}

/**
 * Initialize Telegram WebApp - MUST be called on app startup
 * This tells Telegram that the app is ready and WebApp data should be available
 */
export function initTelegramWebApp() {
  if (typeof window === 'undefined') return;
  
  const webApp = (window as any).Telegram?.WebApp;
  if (!webApp) {
    console.log('⚠️ Telegram WebApp not available');
    return;
  }
  
  console.log('🚀 Initializing Telegram WebApp...');
  
  // Check data BEFORE ready
  console.log('📋 Before webApp.ready():', {
    hasInitData: !!webApp.initData,
    hasInitDataUnsafe: !!webApp.initDataUnsafe,
    hasUser: !!webApp.initDataUnsafe?.user,
    user: webApp.initDataUnsafe?.user
  });
  
  // Signal to Telegram that app is ready
  webApp.ready();
  
  // Check data AFTER ready
  console.log('📋 After webApp.ready():', {
    hasInitData: !!webApp.initData,
    hasInitDataUnsafe: !!webApp.initDataUnsafe,
    hasUser: !!webApp.initDataUnsafe?.user,
    user: webApp.initDataUnsafe?.user
  });
  
  // Expand app to fullscreen
  webApp.expand?.();
  
  // Disable vertical swipe for back navigation
  webApp.disableVerticalSwipes?.();
  
  console.log('✅ Telegram WebApp initialized and expanded');
}

/**
 * Check if running inside Telegram WebApp
 */
export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Telegram?.WebApp;
}

/**
 * Get Telegram WebApp instance (unsafe - assumes we're in WebApp context)
 */
export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return (window as any).Telegram?.WebApp || null;
}

/**
 * Extract Telegram user data safely
 * Returns null if not in Telegram context
 */
export function getTelegramUserData(): TelegramUser | null {
  if (!isTelegramWebApp()) {
    console.log('❌ Not in Telegram WebApp');
    return null;
  }
  
  const webApp = getTelegramWebApp();
  const initDataUnsafe = webApp?.initDataUnsafe;
  const user = initDataUnsafe?.user;
  
  console.log('🔍 getTelegramUserData:', { 
    hasWebApp: !!webApp, 
    hasInitDataUnsafe: !!initDataUnsafe,
    hasUser: !!user,
    user: user ? { id: user.id, first_name: user.first_name, username: user.username } : null
  });
  
  if (!user || typeof user !== 'object') {
    console.log('⚠️ No user data in initDataUnsafe');
    return null;
  }
  
  return {
    id: user.id,
    is_bot: user.is_bot || false,
    first_name: user.first_name || '',
    last_name: user.last_name,
    username: user.username,
    language_code: user.language_code
  };
}

/**
 * Get raw initData string for backend validation
 * WARNING: Only available AFTER webApp.ready() has been called
 */
export function getTelegramInitData(): string | null {
  if (!isTelegramWebApp()) {
    console.log('❌ getTelegramInitData: Not in Telegram WebApp');
    return null;
  }
  
  const webApp = getTelegramWebApp();
  const initData = webApp?.initData || null;
  
  // Try to also check initDataUnsafe
  const initDataUnsafe = webApp?.initDataUnsafe;
  
  console.log('🔐 getTelegramInitData:', { 
    hasWebApp: !!webApp,
    hasInitData: !!initData,
    hasInitDataUnsafe: !!initDataUnsafe,
    initDataLength: initData?.length || 0,
    initDataPreview: initData ? initData.substring(0, 100) + '...' : 'null/empty',
    unsafeUser: initDataUnsafe?.user ? { id: initDataUnsafe.user.id, first_name: initDataUnsafe.user.first_name } : 'no user'
  });
  
  return initData;
}

/**
 * Extract userId from Telegram user
 * Returns telegram user id as string (e.g., "123456789")
 */
export function getTelegramUserId(): string | null {
  const user = getTelegramUserData();
  if (!user) {
    console.log('❌ No Telegram user, returning null');
    return null;
  }
  console.log('✅ Got Telegram user ID:', user.id);
  return String(user.id);
}

/**
 * Extract username/display name from Telegram user
 * Priority: @username > first_name + last_name > first_name > "Unknown"
 */
export function getTelegramUsername(): string {
  const user = getTelegramUserData();
  if (!user) return 'Unknown';
  
  // Если есть username - использовать его (без @)
  if (user.username) {
    return user.username;
  }
  
  // Комбинация first_name + last_name
  const nameParts = [user.first_name];
  if (user.last_name) {
    nameParts.push(user.last_name);
  }
  
  const fullName = nameParts.filter(Boolean).join(' ').trim();
  if (fullName) {
    return fullName;
  }
  
  return 'Unknown';
}

/**
 * Get complete Telegram identity (userId + username)
 * Returns fallback values if not in Telegram context
 */
export function getTelegramIdentity(): { userId: string; username: string; inTelegram: boolean } {
  const inTelegram = isTelegramWebApp();
  const userId = getTelegramUserId();
  const username = getTelegramUsername();
  
  console.log('🔐 getTelegramIdentity:', { inTelegram, userId, username, hasTelegramUser: !!getTelegramUserData() });
  
  if (inTelegram && userId) {
    console.log('✅ Using real Telegram identity');
    return { userId, username, inTelegram: true };
  }
  
  // Fallback для обычного браузера
  console.log('⚠️ Fallback to generated identity (not in Telegram context)');
  const fallbackUserId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const fallbackUsername = `Player_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  return {
    userId: fallbackUserId,
    username: fallbackUsername,
    inTelegram: false
  };
}
