/**
 * Score & Star Progress Manager (0/3)
 * Guarantees idempotent star awarding — answering the same challenge twice never adds duplicate stars.
 */

import { gameState } from './gameState.js';

export const MAX_STARS = 3;

export const ACHIEVEMENTS = Object.freeze({
  HIDDEN_OBJECT: 'hiddenObject',
  MORAL_Q1: 'moralQ1',
  MORAL_Q2: 'moralQ2',
});

export class ScoreManager {
  constructor({ onStarAwarded, onChange } = {}) {
    this._onStarAwarded = onStarAwarded || (() => {});
    this._onChange = onChange || (() => {});
  }

  getCount() {
    const { stars } = gameState.getState();
    return Number(stars.hiddenObject) + Number(stars.moralQ1) + Number(stars.moralQ2);
  }

  hasAchievement(key) {
    return Boolean(gameState.getState().stars[key]);
  }

  /**
   * Awards a star for an achievement if not already earned.
   * Returns true if a new star was granted, false if already owned.
   */
  award(key) {
    const currentStars = gameState.getState().stars;
    if (!(key in currentStars) || currentStars[key]) {
      return false;
    }

    gameState.setState({
      stars: { [key]: true },
    });

    const newCount = this.getCount();
    this._onStarAwarded(newCount, key);
    this._onChange(newCount, newCount);
    return true;
  }

  reset() {
    gameState.setState({
      stars: {
        hiddenObject: false,
        moralQ1: false,
        moralQ2: false,
      },
    });
    this._onChange(0, null);
  }
}
