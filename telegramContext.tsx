import React, { createContext, useContext, useEffect, useState } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramContextType {
  tg: any;
  user: TelegramUser | null;
  sessionToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tg] = useState(() => (window as any).Telegram?.WebApp);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initTelegram = async () => {
      try {
        if (!tg) {
          console.warn('Telegram WebApp not available');
          setIsLoading(false);
          return;
        }

        // Инициализируем Telegram WebApp
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation();

        const initData = tg.initData;
        const initDataUnsafe = tg.initDataUnsafe;

        if (!initDataUnsafe?.user) {
          setError('No user data from Telegram');
          setIsLoading(false);
          return;
        }

        setUser(initDataUnsafe.user);

        // Отправляем initData на backend для валидации
        if (process.env.VITE_API_URL) {
          const response = await fetch(`${process.env.VITE_API_URL}/api/auth/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData, userId: initDataUnsafe.user.id })
          });

          if (response.ok) {
            const data = await response.json();
            setSessionToken(data.token);
            localStorage.setItem('telegramToken', data.token);
          } else {
            setError('Failed to validate session');
          }
        } else {
          // Для локальной разработки без backend
          setSessionToken(`local_${initDataUnsafe.user.id}`);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Telegram init error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    initTelegram();
  }, [tg]);

  return (
    <TelegramContext.Provider value={{ tg, user, sessionToken, isLoading, error }}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }
  return context;
};
