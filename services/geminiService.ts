import { GameCard, CardType, HazardType } from '../types';

/**
 * Game Logic Service
 * Все операции полностью детерминированные (нет внешних API вызовов)
 * Используется для:
 * - Генерации карт
 * - AI логики (если добавим)
 * - Вычисления результатов
 */

class GameLogicService {
  /**
   * Генерирует детерминированную очередность карт на основе seed
   */
  static shuffleDeck(cards: GameCard[], seed: number): GameCard[] {
    const sorted = [...cards];
    
    // Детерминированный shuffle используя seed
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom(seed + i) * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
    
    return sorted;
  }

  /**
   * Seeded random number generator (0-1)
   */
  private static seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Определяет AI решение игрока на основе детерминированной логики
   * (для будущего использования с AI оппонентами)
   */
  static getAIDecision(
    playerId: string,
    currentScore: number,
    currentDepth: number,
    remainingCardsCount: number,
    seed: number
  ): 'stay' | 'leave' {
    // Простая детерминированная стратегия для AI
    const depthRisk = currentDepth / 5; // 0-1, где 1 = максимальная глубина
    const scoreValue = currentScore / 100; // Нормализуем по среднему
    
    // Генерируем детерминированное число на основе параметров
    const riskFactor = this.seededRandom(seed + currentScore + currentDepth);
    
    // AI выходит если:
    // 1. Глубоко и есть хороший скор
    // 2. Много опасностей (мало карт осталось)
    const shouldLeave = 
      depthRisk > 0.6 && scoreValue > 0.5 || // Deep with good score
      remainingCardsCount < 5 || // Few cards left
      riskFactor > 0.7; // Random factor
    
    return shouldLeave ? 'leave' : 'stay';
  }

  /**
   * Вычисляет распределение сокровища между игроками
   */
  static calculateTreasureShare(
    treasureValue: number,
    playerCount: number
  ): { share: number; remainder: number } {
    const share = Math.floor(treasureValue / playerCount);
    const remainder = treasureValue % playerCount;
    
    return { share, remainder };
  }

  /**
   * Определяет был ли раунд успешен (не повторилась опасность)
   */
  static isRoundSuccessful(hazardTypes: HazardType[]): boolean {
    // Раунд успешен если все опасности уникальны
    const uniqueHazards = new Set(hazardTypes);
    return uniqueHazards.size === hazardTypes.length;
  }

  /**
   * Генерирует детерминированный Room Code на основе timestamp и seed
   */
  static generateRoomCode(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${(timestamp % 1000000).toString(16).toUpperCase()}${random.toString(16).toUpperCase()}`
      .substring(0, 8)
      .padEnd(8, '0');
  }

  /**
   * Валидирует целостность игровой сессии (детерминированная проверка)
   */
  static validateGameState(
    roundNumber: number,
    playersCount: number,
    revealedCardsCount: number
  ): boolean {
    // Базовые проверки
    if (roundNumber < 1 || roundNumber > 5) return false;
    if (playersCount < 2 || playersCount > 10) return false;
    if (revealedCardsCount < 0 || revealedCardsCount > 30) return false;
    
    return true;
  }

  /**
   * Вычисляет финальный скор игрока
   */
  static calculateFinalScore(
    totalScore: number,
    currentRoundScore: number,
    bankedGems: number,
    bonusMultiplier: number = 1.0
  ): number {
    return Math.floor((totalScore + currentRoundScore + bankedGems) * bonusMultiplier);
  }

  /**
   * Определяет рейтинг игрока на основе скора
   */
  static getPlayerRating(score: number): string {
    if (score >= 500) return '💎 Legend';
    if (score >= 400) return '🏆 Master';
    if (score >= 300) return '⭐ Expert';
    if (score >= 200) return '📈 Skilled';
    if (score >= 100) return '🌟 Novice';
    return '🔰 Beginner';
  }

  /**
   * Детерминированное определение характера опасности на основе типа
   */
  static getHazardDamageScale(hazardType: HazardType): number {
    const damageScales: Record<HazardType, number> = {
      [HazardType.SNAKE]: 0.8,      // Легкая
      [HazardType.SPIDER]: 0.9,     // Легкая-средняя
      [HazardType.ROCKFALL]: 1.0,   // Средняя
      [HazardType.FIRE]: 1.1,       // Средняя-тяжелая
      [HazardType.MUMMY]: 1.2,      // Тяжелая
    };
    
    return damageScales[hazardType] || 1.0;
  }

  /**
   * Проверяет может ли игрок выйти из пещеры
   */
  static canPlayerLeave(isInside: boolean, hasExitPoint: boolean): boolean {
    return isInside && hasExitPoint;
  }

  /**
   * Вычисляет время хода (для future: timeout система)
   */
  static getTurnTimeLimit(playersCount: number): number {
    // Больше игроков = больше времени на обдумывание
    const baseTime = 30; // секунд
    const additionalTime = playersCount * 5;
    return baseTime + additionalTime;
  }
}

export default GameLogicService;
