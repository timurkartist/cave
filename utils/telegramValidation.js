import crypto from 'crypto';

/**
 * Validate Telegram WebApp initData using HMAC-SHA256
 * Based on Telegram's official validation method
 * https://core.telegram.org/bots/webapps#validating-data-received-from-the-client
 */
export function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) {
    return { valid: false };
  }

  try {
    // Parse initData query string
    const params = new URLSearchParams(initData);
    
    // Extract hash separately
    const hash = params.get('hash');
    if (!hash) {
      console.warn('❌ No hash in initData');
      return { valid: false };
    }

    // Remove hash from params
    params.delete('hash');

    // Sort keys and create data_check_string
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys
      .map(key => `${key}=${params.get(key)}`)
      .join('\n');

    // Create secret key using bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Compute hash of data_check_string
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Compare hashes
    if (computedHash !== hash) {
      console.warn('❌ Invalid initData hash');
      return { valid: false };
    }

    // Check auth_date is recent (not older than 1 day)
    const authDate = parseInt(params.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 1 day

    if (now - authDate > maxAge) {
      console.warn('❌ initData too old');
      return { valid: false };
    }

    // Parse and return user data
    const userStr = params.get('user');
    if (!userStr) {
      console.warn('❌ No user data in initData');
      return { valid: false };
    }

    const user = JSON.parse(userStr);
    console.log('✅ initData validated successfully, user:', user.id);
    
    return { valid: true, user };
  } catch (error) {
    console.error('❌ Error validating initData:', error);
    return { valid: false };
  }
}

/**
 * Get validated user ID from initData
 * Returns the Telegram user ID as a string for use as userId
 */
export function getUserIdFromInitData(initData, botToken) {
  const validation = validateTelegramInitData(initData, botToken);
  if (!validation.valid || !validation.user) {
    return null;
  }
  return String(validation.user.id);
}
