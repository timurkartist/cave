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
  if (!isTelegramWebApp()) return null;
  
  const webApp = getTelegramWebApp();
  const user = webApp?.initDataUnsafe?.user;
  
  if (!user || typeof user !== 'object') return null;
  
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
 */
export function getTelegramInitData(): string | null {
  if (!isTelegramWebApp()) return null;
  
  const webApp = getTelegramWebApp();
  return webApp?.initData || null;
}

/**
 * Extract userId from Telegram user
 * Returns telegram user id as string (e.g., "123456789")
 */
export function getTelegramUserId(): string | null {
  const user = getTelegramUserData();
  if (!user) return null;
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
