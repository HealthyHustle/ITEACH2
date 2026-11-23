/**
 * Game State Store (Single Source of Truth)
 * Manages scene flow, timer snapshot, stars, quiz progress, and independent audio flags.
 */

export const INITIAL_DURATION_SECONDS = 180;

function createDefaultState(audioPrefs = { musicEnabled: true, voiceEnabled: true }) {
  return {
    scene: 'opening', // 'opening' | 'playground' | 'moral' | 'closing'
    isGameActive: false,
    isPaused: false,
    timeRemaining: INITIAL_DURATION_SECONDS,
    stars: {
      hiddenObject: false,
      moralQ1: false,
      moralQ2: false,
    },
    playgroundSolved: false,
    moralQuestionIndex: 0, // 0 = Q1 (Tolong), 1 = Q2 (Terima Kasih)
    moralAnswered: [false, false],
    musicEnabled: audioPrefs.musicEnabled,
    voiceEnabled: audioPrefs.voiceEnabled,
  };
}

class GameStateStore {
  constructor() {
    this._state = createDefaultState();
    this._listeners = new Set();
  }

  getState() {
    return this._state;
  }

  setState(partial) {
    const prev = this._state;
    this._state = {
      ...prev,
      ...partial,
      stars: partial.stars ? { ...prev.stars, ...partial.stars } : prev.stars,
      moralAnswered: partial.moralAnswered ? [...partial.moralAnswered] : prev.moralAnswered,
    };
    this._notify(prev);
  }

  resetGame() {
    const prev = this._state;
    this._state = createDefaultState({
      musicEnabled: prev.musicEnabled,
      voiceEnabled: prev.voiceEnabled,
    });
    this._notify(prev);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify(prev) {
    for (const listener of this._listeners) {
      listener(this._state, prev);
    }
  }
}

export const gameState = new GameStateStore();
