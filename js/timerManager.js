/**
 * Timer Manager (180 seconds / 03:00)
 * - Does not run during Opening
 * - Persists across scene transitions (never resets between scenes)
 * - Supports user pause and modal auto-pause independently
 * - Triggers friendly Time-Up callback at 00:00
 */

import { gameState, INITIAL_DURATION_SECONDS } from './gameState.js';

export function formatMMSS(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export class TimerManager {
  constructor({ onTick, onTimeUp, onPauseChange } = {}) {
    this._onTick = onTick || (() => {});
    this._onTimeUp = onTimeUp || (() => {});
    this._onPauseChange = onPauseChange || (() => {});
    this._intervalId = null;
    this._pauseReasons = new Set();
  }

  start() {
    if (this._intervalId !== null) return;
    if (gameState.getState().timeRemaining <= 0) return;

    this._pauseReasons.clear();
    gameState.setState({ isGameActive: true, isPaused: false });
    this._onPauseChange(false);
    this._onTick(gameState.getState().timeRemaining);

    this._intervalId = window.setInterval(() => {
      const { timeRemaining, isPaused, isGameActive } = gameState.getState();
      if (!isGameActive || isPaused) return;

      const next = Math.max(0, timeRemaining - 1);
      gameState.setState({ timeRemaining: next });
      this._onTick(next);

      if (next <= 0) {
        this.stop();
        this._onTimeUp();
      }
    }, 1000);
  }

  pause(reason = 'user') {
    if (!gameState.getState().isGameActive) return;
    this._pauseReasons.add(reason);
    if (!gameState.getState().isPaused) {
      gameState.setState({ isPaused: true });
      this._onPauseChange(true, reason);
    }
  }

  resume(reason = 'user') {
    this._pauseReasons.delete(reason);
    if (this._pauseReasons.size === 0 && gameState.getState().isPaused && gameState.getState().isGameActive) {
      gameState.setState({ isPaused: false });
      this._onPauseChange(false, reason);
    }
  }

  toggleUserPause() {
    if (!gameState.getState().isGameActive) return;
    if (this._pauseReasons.has('user')) {
      this.resume('user');
    } else {
      this.pause('user');
    }
  }

  isUserPaused() {
    return this._pauseReasons.has('user');
  }

  stop() {
    if (this._intervalId !== null) {
      window.clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._pauseReasons.clear();
    gameState.setState({ isGameActive: false, isPaused: false });
    this._onPauseChange(false);
  }

  reset() {
    this.stop();
    gameState.setState({ timeRemaining: INITIAL_DURATION_SECONDS });
    this._onTick(INITIAL_DURATION_SECONDS);
  }

  getElapsedSeconds() {
    return Math.max(0, INITIAL_DURATION_SECONDS - gameState.getState().timeRemaining);
  }
}
