/**
 * Scene Manager
 * Coordinates transitions between the 4 scenes using the View Transitions API
 * with progressive fallback, programmatic focus routing, and dynamic page titles.
 */

import { gameState } from './gameState.js';

const SCENE_META = Object.freeze({
  opening: {
    elementId: 'scene-opening',
    headingId: 'opening-heading',
    title: 'Detektif Kebaikan — Beranda Game PAUD',
  },
  playground: {
    elementId: 'scene-playground',
    headingId: 'playground-heading',
    title: 'Yuk, Cari Teman! — Detektif Kebaikan',
  },
  moral: {
    elementId: 'scene-moral',
    headingId: 'moral-heading',
    title: 'Tantangan Moral — Detektif Kebaikan',
  },
  closing: {
    elementId: 'scene-closing',
    headingId: 'closing-heading',
    title: 'Selamat! Detektif Kebaikan',
  },
});

export class SceneManager {
  constructor({ onBeforeEnter, onAfterEnter } = {}) {
    this._onBeforeEnter = onBeforeEnter || (() => {});
    this._onAfterEnter = onAfterEnter || (() => {});
    this._scheduledTimer = null;
  }

  cancelScheduledTransition() {
    if (this._scheduledTimer !== null) {
      window.clearTimeout(this._scheduledTimer);
      this._scheduledTimer = null;
    }
  }

  scheduleTransition(sceneName, delayMs) {
    this.cancelScheduledTransition();
    this._scheduledTimer = window.setTimeout(() => {
      this._scheduledTimer = null;
      if (!gameState.getState().isPaused) {
        this.goTo(sceneName);
      }
    }, delayMs);
  }

  goTo(sceneName, { animate = true } = {}) {
    const targetMeta = SCENE_META[sceneName];
    if (!targetMeta) return;

    this.cancelScheduledTransition();
    const prevScene = gameState.getState().scene;

    const applyDOMUpdate = () => {
      gameState.setState({ scene: sceneName });
      this._onBeforeEnter(sceneName, prevScene);

      for (const [key, meta] of Object.entries(SCENE_META)) {
        const el = document.getElementById(meta.elementId);
        if (el) {
          el.hidden = key !== sceneName;
        }
      }

      document.title = targetMeta.title;
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    const routeFocusAndFinalize = () => {
      const heading = document.getElementById(targetMeta.headingId);
      if (heading) {
        heading.focus({ preventScroll: true });
      }
      this._onAfterEnter(sceneName, prevScene);
    };

    if (!animate || !document.startViewTransition) {
      applyDOMUpdate();
      routeFocusAndFinalize();
      return;
    }

    const transition = document.startViewTransition(() => {
      applyDOMUpdate();
    });

    transition.finished.finally(() => {
      routeFocusAndFinalize();
    });
  }
}
