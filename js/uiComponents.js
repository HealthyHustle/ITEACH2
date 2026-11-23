/**
 * Reusable UI Components & Helpers
 * - Header star progress gauge & timer pill
 * - Audio toggle icons & pause toggle states
 * - Choice card icon library
 * - Finite confetti burst (respects reduced motion)
 * - Native <dialog> light-dismiss fallback for browsers without closedby
 */

import { formatMMSS } from './timerManager.js';
import { MAX_STARS } from './scoreManager.js';

export function announce(message) {
  const region = document.getElementById('live-announcer');
  if (!region) return;
  region.textContent = '';
  window.requestAnimationFrame(() => {
    region.textContent = message;
  });
}

export function renderStars(starCount, newlyEarnedIndex = null) {
  const countText = document.getElementById('star-count-text');
  if (countText) {
    countText.textContent = `${starCount}/${MAX_STARS}`;
  }

  const slots = document.querySelectorAll('.star-slot');
  slots.forEach((slot) => {
    const idx = Number(slot.dataset.starIndex);
    const earned = idx <= starCount;
    slot.classList.toggle('is-earned', earned);
    slot.classList.remove('is-just-earned');
    if (earned && idx === newlyEarnedIndex) {
      // Force restart animation cleanly
      void slot.getBoundingClientRect();
      slot.classList.add('is-just-earned');
    }
  });
}

export function renderTimer(seconds, { isPaused = false, isActive = false } = {}) {
  const display = document.getElementById('timer-display');
  const pill = document.getElementById('hud-timer-pill');
  const snapshot = document.getElementById('pause-time-snapshot');
  const formatted = formatMMSS(seconds);

  if (display) display.textContent = formatted;
  if (snapshot) snapshot.textContent = formatted;
  if (pill) {
    pill.classList.toggle('is-warning', isActive && !isPaused && seconds <= 30 && seconds > 0);
    pill.classList.toggle('is-paused', isActive && isPaused);
  }
}

export function renderPauseControl({ visible, isPaused }) {
  const btnPause = document.getElementById('btn-pause');
  const pauseLabel = document.getElementById('pause-label');
  const pauseIcon = document.getElementById('pause-icon');
  const pauseBanner = document.getElementById('pause-banner');

  if (btnPause) {
    btnPause.hidden = !visible;
    btnPause.classList.toggle('is-paused', isPaused);
  }
  if (pauseLabel) {
    pauseLabel.textContent = isPaused ? 'Lanjut' : 'Jeda';
  }
  if (pauseIcon) {
    pauseIcon.innerHTML = isPaused
      ? '<path d="M8 5v14l11-7z"></path>'
      : '<rect x="6" y="4" width="4" height="16" rx="1.5"></rect><rect x="14" y="4" width="4" height="16" rx="1.5"></rect>';
  }
  if (pauseBanner) {
    pauseBanner.hidden = !(visible && isPaused);
  }
}

export function renderAudioControls({ musicEnabled, voiceEnabled }) {
  const btnMusic = document.getElementById('btn-music-toggle');
  const musicIcon = document.getElementById('music-icon');
  const btnVoice = document.getElementById('btn-voice-toggle');
  const voiceIcon = document.getElementById('voice-icon');

  if (btnMusic) {
    btnMusic.setAttribute('aria-pressed', String(musicEnabled));
    btnMusic.setAttribute(
      'aria-label',
      musicEnabled ? 'Musik latar aktif, tekan untuk mematikan' : 'Musik latar mati, tekan untuk menyalakan'
    );
  }
  if (musicIcon) {
    musicIcon.innerHTML = musicEnabled
      ? '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>'
      : '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle><line x1="3" y1="3" x2="21" y2="21" stroke-width="2.6"></line>';
  }

  if (btnVoice) {
    btnVoice.setAttribute('aria-pressed', String(voiceEnabled));
    btnVoice.setAttribute(
      'aria-label',
      voiceEnabled ? 'Suara narasi aktif, tekan untuk mematikan' : 'Suara narasi mati, tekan untuk menyalakan'
    );
  }
  if (voiceIcon) {
    voiceIcon.innerHTML = voiceEnabled
      ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>'
      : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="22" y1="9" x2="16" y2="15"></line><line x1="16" y1="9" x2="22" y2="15"></line>';
  }
}

export function getChoiceIconSvg(iconName) {
  switch (iconName) {
    case 'help':
      return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14"></path><path d="m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"></path></svg>';
    case 'grab':
      return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0v5"></path><path d="M14 10V4a2 2 0 0 0-4 0v6"></path><path d="M10 10.5V6a2 2 0 0 0-4 0v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>';
    case 'silent':
      return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><line x1="9" y1="15" x2="15" y2="15"></line><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>';
    case 'heart':
      return '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
    case 'leave':
      return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>';
    default:
      return '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  }
}

export function triggerConfetti() {
  const container = document.getElementById('confetti-layer');
  if (!container) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  container.innerHTML = '';
  const colors = ['#E93683', '#FF9D24', '#B7D957', '#FF8FBA', '#FFFFFF', '#FFD257'];
  const count = 42;

  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.width = `${8 + Math.random() * 8}px`;
    piece.style.height = `${8 + Math.random() * 10}px`;
    piece.style.setProperty('--fall-duration', `${2.2 + Math.random() * 1.4}s`);
    piece.style.setProperty('--fall-delay', `${Math.random() * 0.45}s`);
    piece.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 140}px`);
    piece.style.setProperty('--spin-deg', `${360 + Math.random() * 480}deg`);
    container.appendChild(piece);
  }

  window.setTimeout(() => {
    container.innerHTML = '';
  }, 4200);
}

/**
 * Progressive-enhancement light-dismiss fallback for browsers lacking <dialog closedby="any">.
 * Uses pointerdown + pointerup outside dialog rect so drag-selects onto backdrop never falsely dismiss.
 */
export function setupDialogLightDismissFallback() {
  if ('closedBy' in HTMLDialogElement.prototype) return;

  const isOutside = (event, dialog) => {
    const rect = dialog.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  };

  document.querySelectorAll('dialog[closedby="any"]').forEach((dialog) => {
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = isOutside(e, dialog);
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && isOutside(e, dialog)) {
        dialog.close();
      }
      pressedOutside = false;
    });
  });
}
