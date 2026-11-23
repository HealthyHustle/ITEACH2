/**
 * Audio Manager
 * - Natural Human Neural Indonesian Narration (pre-generated studio MP3 clips via id-ID-GadisNeural)
 *   with automatic Web Speech API fallback if an MP3 ever cannot load.
 * - Strict zero-overlap audio playback (starting any narration stops the previous clip immediately).
 * - Warm kids-friendly marimba & soft chord background music (Web Audio API — zero broken files).
 * - Independent Music ON/OFF and Voice/Sound ON/OFF toggles.
 */

import { gameState } from './gameState.js';

// Exact text -> pre-generated studio neural MP3 clip map
const NARRATION_CLIPS = Object.freeze({
  'Halo teman-teman! Aku Dodo. Yuk, bantu Dodo mencari teman yang membutuhkan bantuan!':
    'assets/audio/opening.mp3',
  'Coba cari teman yang terlihat kesulitan, yuk!':
    'assets/audio/playground-prompt.mp3',
  'Hore, Hebat! Kamu berhasil menemukannya!':
    'assets/audio/playground-success.mp3?v=2',
  'Teman kita kesulitan mengambil bola. Kalau kamu membutuhkan bantuan, apa yang harus kamu katakan?':
    'assets/audio/moral-q1.mp3',
  'Hebat! Kalau membutuhkan bantuan, kita harus meminta tolong dengan sopan.':
    'assets/audio/moral-q1-correct.mp3',
  'Merebut bola bisa membuat teman terkejut. Yuk, pilih ucapan yang sopan saat meminta bantuan!':
    'assets/audio/moral-q1-wrong-b.mp3',
  'Kalau diam saja, teman belum tahu kamu membutuhkan bantuan. Yuk, coba pilih jawaban yang sopan!':
    'assets/audio/moral-q1-wrong-c.mp3',
  'Kalau teman sudah membantu kita, apa yang harus kita ucapkan?':
    'assets/audio/moral-q2.mp3',
  'Hebat sekali! Setelah dibantu teman, kita harus mengucapkan terima kasih dengan gembira.':
    'assets/audio/moral-q2-correct.mp3',
  'Kalau pergi begitu saja, teman yang membantu bisa merasa sedih. Yuk, pilih ucapan yang sopan!':
    'assets/audio/moral-q2-wrong-b.mp3',
  'Yeay! Teman kita sudah mendapatkan bantuannya. Jangan lupa mengucapkan terima kasih, ya!':
    'assets/audio/closing.mp3',
  'Tolong':
    'assets/audio/practice-tolong.mp3',
  'Terima kasih':
    'assets/audio/practice-terima-kasih.mp3',
  'Hebat! Kamu sudah berusaha bersama Dodo hari ini. Yuk, kita main lagi!':
    'assets/audio/time-up.mp3',
});

// Warm cheerful C-major pentatonic kids melody (Hz)
const MELODY_NOTES = [
  523.25, 659.25, 783.99, 659.25,
  587.33, 659.25, 523.25, 0,
  659.25, 783.99, 880.0, 783.99,
  659.25, 587.33, 523.25, 0,
];

// Gentle bass harmony every 4 beats (C4, G3, F3, G3)
const BASS_CHORD_ROOTS = [261.63, 196.0, 174.61, 196.0];

export class AudioManager {
  constructor() {
    this._ctx = null;
    this._bgmMaster = null;
    this._bgmTimer = null;
    this._noteIndex = 0;
    this._isSpeaking = false;
    this._speechToken = 0;
    this._preferredVoice = null;
    this._bgmShouldPlay = false;

    // Reusable single HTMLAudioElement guarantees zero overlapping narration
    this._narrationAudio = typeof Audio !== 'undefined' ? new Audio() : null;
    if (this._narrationAudio) {
      this._narrationAudio.preload = 'auto';
    }
    this._pendingResolve = null;

    this._initVoices();
  }

  _initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      const indonesianVoices = voices.filter((v) =>
        (v.lang || '').toLowerCase().startsWith('id')
      );
      if (indonesianVoices.length > 0) {
        this._preferredVoice =
          indonesianVoices.find((v) => /natural|online|google|gadis|damayanti/i.test(v.name)) ||
          indonesianVoices[0];
      }
    };

    pickVoice();
    window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
  }

  _ensureContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this._ctx) {
      this._ctx = new AudioCtx();
      this._bgmMaster = this._ctx.createGain();
      this._bgmMaster.gain.value = 0.055;
      this._bgmMaster.connect(this._ctx.destination);
    }

    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  unlock() {
    this._ensureContext();
    if (gameState.getState().musicEnabled && this._bgmShouldPlay) {
      this.startMusic();
    }
  }

  /* ------------------------------------------------------------------------
     BACKGROUND MUSIC (Independent from Narration)
     ------------------------------------------------------------------------ */
  startMusic() {
    this._bgmShouldPlay = true;
    if (!gameState.getState().musicEnabled) return;

    const ctx = this._ensureContext();
    if (!ctx || this._bgmTimer !== null) return;

    this._updateBgmVolume();

    const playStep = () => {
      if (!gameState.getState().musicEnabled || !this._ctx || this._ctx.state !== 'running') {
        return;
      }
      const step = this._noteIndex % MELODY_NOTES.length;
      const freq = MELODY_NOTES[step];
      if (step % 4 === 0) {
        const bass = BASS_CHORD_ROOTS[Math.floor(step / 4) % BASS_CHORD_ROOTS.length];
        this._playSoftPad(bass, 1.5);
      }
      if (freq > 0) {
        this._playKalimbaNote(freq, 0.42);
      }
      this._noteIndex += 1;
    };

    playStep();
    this._bgmTimer = window.setInterval(playStep, 480);
  }

  stopMusic() {
    if (this._bgmTimer !== null) {
      window.clearInterval(this._bgmTimer);
      this._bgmTimer = null;
    }
  }

  setMusicEnabled(enabled) {
    gameState.setState({ musicEnabled: enabled });
    if (enabled) {
      this._bgmShouldPlay = true;
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  _updateBgmVolume() {
    if (!this._ctx || !this._bgmMaster) return;
    // Duck music gently whenever Dodo is talking so voice stays crystal-clear
    const target = this._isSpeaking ? 0.016 : 0.055;
    this._bgmMaster.gain.setTargetAtTime(target, this._ctx.currentTime, 0.08);
  }

  _playKalimbaNote(freq, duration) {
    const ctx = this._ctx;
    if (!ctx || !this._bgmMaster) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const gain = ctx.createGain();
    const harmGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.65, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    harmGain.gain.setValueAtTime(0.0001, now);
    harmGain.gain.linearRampToValueAtTime(0.14, now + 0.015);
    harmGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.55);

    osc.connect(gain);
    harmonic.connect(harmGain);
    gain.connect(this._bgmMaster);
    harmGain.connect(this._bgmMaster);

    osc.start(now);
    harmonic.start(now);
    osc.stop(now + duration + 0.02);
    harmonic.stop(now + duration + 0.02);
  }

  _playSoftPad(freq, duration) {
    const ctx = this._ctx;
    if (!ctx || !this._bgmMaster) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this._bgmMaster);

    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  /* ------------------------------------------------------------------------
     SOUND EFFECTS (Respects Voice/Sound Toggle)
     ------------------------------------------------------------------------ */
  _playTone(freq, delay, duration, type = 'sine', volume = 0.13) {
    if (!gameState.getState().voiceEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  playClick() {
    this._playTone(540, 0, 0.08, 'sine', 0.08);
  }

  playSuccess() {
    this._playTone(523.25, 0, 0.16, 'triangle', 0.14);
    this._playTone(659.25, 0.09, 0.16, 'triangle', 0.14);
    this._playTone(783.99, 0.18, 0.18, 'triangle', 0.14);
    this._playTone(1046.5, 0.27, 0.32, 'sine', 0.16);
  }

  playGentleNudge() {
    this._playTone(392.0, 0, 0.14, 'sine', 0.09);
    this._playTone(349.23, 0.11, 0.18, 'sine', 0.09);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, i) => {
      this._playTone(n, i * 0.1, i === notes.length - 1 ? 0.5 : 0.18, 'triangle', 0.15);
    });
  }

  /* ------------------------------------------------------------------------
     HUMAN NEURAL INDONESIAN NARRATION (Zero Overlap + Fallback TTS)
     ------------------------------------------------------------------------ */
  setVoiceEnabled(enabled) {
    gameState.setState({ voiceEnabled: enabled });
    if (!enabled) {
      this.stopNarration();
    }
  }

  stopNarration() {
    this._speechToken += 1;
    this._isSpeaking = false;
    this._updateBgmVolume();

    if (this._narrationAudio) {
      try {
        this._narrationAudio.onended = null;
        this._narrationAudio.onerror = null;
        this._narrationAudio.pause();
        this._narrationAudio.currentTime = 0;
      } catch {
        // Safe cleanup
      }
    }

    if (this._pendingResolve) {
      const done = this._pendingResolve;
      this._pendingResolve = null;
      done(false);
    }

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore browser speech cancellation edge errors
      }
    }
  }

  /**
   * Plays Dodo's natural neural Indonesian voice clip for the given text.
   * Falls back to browser SpeechSynthesis only if no clip exists or playback fails.
   */
  speak(text, { rate = 0.92, pitch = 1.08 } = {}) {
    if (!gameState.getState().voiceEnabled || !text) {
      return Promise.resolve(false);
    }

    // Cancel any currently playing clip or speech immediately (zero overlap)
    this.stopNarration();
    const token = this._speechToken;

    const clipUrl = NARRATION_CLIPS[text];
    if (clipUrl && this._narrationAudio) {
      return this._playClip(clipUrl, token).then((played) => {
        if (played || this._speechToken !== token) {
          return played;
        }
        return this._speakFallbackTTS(text, token, { rate, pitch });
      });
    }

    return this._speakFallbackTTS(text, token, { rate, pitch });
  }

  _playClip(clipUrl, token) {
    return new Promise((resolve) => {
      const player = this._narrationAudio;
      if (!player) {
        resolve(false);
        return;
      }

      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (this._pendingResolve === finish) {
          this._pendingResolve = null;
        }
        if (this._speechToken === token) {
          this._isSpeaking = false;
          this._updateBgmVolume();
        }
        resolve(ok);
      };

      this._pendingResolve = finish;

      player.onended = () => finish(true);
      player.onerror = () => finish(false);

      this._isSpeaking = true;
      this._updateBgmVolume();

      player.src = clipUrl;
      player.currentTime = 0;
      player.volume = 1;

      const playPromise = player.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => finish(false));
      }
    });
  }

  _speakFallbackTTS(text, token, { rate = 0.92, pitch = 1.08 } = {}) {
    return new Promise((resolve) => {
      if (!gameState.getState().voiceEnabled || this._speechToken !== token) {
        resolve(false);
        return;
      }
      if (!('speechSynthesis' in window)) {
        resolve(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1;

      if (this._preferredVoice) {
        utterance.voice = this._preferredVoice;
      }

      let settled = false;
      const finish = (completed) => {
        if (settled) return;
        settled = true;
        if (this._speechToken === token) {
          this._isSpeaking = false;
          this._updateBgmVolume();
        }
        resolve(completed);
      };

      utterance.onstart = () => {
        if (this._speechToken === token) {
          this._isSpeaking = true;
          this._updateBgmVolume();
        }
      };
      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);

      const maxWaitMs = Math.max(3500, text.length * 130);
      window.setTimeout(() => finish(false), maxWaitMs);

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        finish(false);
      }
    });
  }
}

export { NARRATION_CLIPS };
