// Dynamic API URL - Vite будет подставлять правильное значение
const getApiUrl = () => {
  // Для фронтенда в browser environment
  if (typeof window !== 'undefined') {
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    return envUrl || 'http://localhost:3001';
  }
  // Для server-side
  return 'http://localhost:3001';
};

const API_URL = getApiUrl();

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('telegramToken', token);
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('telegramToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async validateTelegramData(initData: string, userId: number) {
    const response = await this.request<{ token: string; userId: number; expiresIn: number }>(
      '/api/auth/validate',
      {
        method: 'POST',
        body: JSON.stringify({ initData, userId }),
      }
    );
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  // Game endpoints
  async createGame() {
    return this.request<{ gameId: string; game: any }>(
      '/api/games/create',
      {
        method: 'POST',
        body: JSON.stringify({ token: this.getToken() }),
      }
    );
  }

  async joinGame(gameId: string, avatar: string) {
    return this.request<{ game: any }>(
      '/api/games/join',
      {
        method: 'POST',
        body: JSON.stringify({
          token: this.getToken(),
          gameId,
          avatar,
        }),
      }
    );
  }

  async getGame(gameId: string) {
    return this.request<{ game: any }>(
      `/api/games/${gameId}?token=${this.getToken()}`,
      {
        method: 'GET',
      }
    );
  }

  async performAction(gameId: string, action: string, data: any) {
    return this.request<{ success: boolean; game: any }>(
      `/api/games/${gameId}/action`,
      {
        method: 'POST',
        body: JSON.stringify({
          token: this.getToken(),
          action,
          data,
        }),
      }
    );
  }
}

export default new ApiService();
