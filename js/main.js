/**
 * DETEKTIF KEBAIKAN — Main Application Controller
 * Connects GameState, ScoreManager, TimerManager, AudioManager, QuizValidator, SceneManager, and UI.
 */

import { gameState, INITIAL_DURATION_SECONDS } from './gameState.js';
import { ScoreManager, ACHIEVEMENTS, MAX_STARS } from './scoreManager.js';
import { TimerManager, formatMMSS } from './timerManager.js';
import { AudioManager } from './audioManager.js';
import {
  NARRATIONS,
  MORAL_QUESTIONS,
  PRACTICE_WORDS,
  validatePlaygroundActivity,
  validateMoralAnswer,
} from './quizValidator.js';
import { SceneManager } from './sceneManager.js';
import {
  announce,
  renderStars,
  renderTimer,
  renderPauseControl,
  renderAudioControls,
  getChoiceIconSvg,
  triggerConfetti,
  setupDialogLightDismissFallback,
} from './uiComponents.js';

const audio = new AudioManager();

const score = new ScoreManager({
  onStarAwarded: (newCount) => {
    announce(`Hebat! Kamu mendapatkan bintang ke-${newCount} dari ${MAX_STARS}.`);
  },
  onChange: (count, newlyEarnedIndex) => {
    renderStars(count, newlyEarnedIndex);
  },
});

const timer = new TimerManager({
  onTick: (remaining) => {
    const { isPaused, isGameActive } = gameState.getState();
    renderTimer(remaining, { isPaused, isActive: isGameActive });
  },
  onPauseChange: (isPaused) => {
    const { scene, timeRemaining, isGameActive } = gameState.getState();
    const showPause = scene === 'playground' || scene === 'moral';
    renderPauseControl({ visible: showPause && isGameActive, isPaused });
    renderTimer(timeRemaining, { isPaused, isActive: isGameActive });
    if (isPaused) {
      sceneManager.cancelScheduledTransition();
    }
  },
  onTimeUp: () => {
    handleTimeUp();
  },
});

const sceneManager = new SceneManager({
  onBeforeEnter: (nextScene) => {
    const { timeRemaining, isPaused, isGameActive } = gameState.getState();

    if (nextScene === 'opening') {
      renderPauseControl({ visible: false, isPaused: false });
      renderTimer(timeRemaining, { isPaused: false, isActive: false });
    } else if (nextScene === 'playground') {
      resetPlaygroundUI();
      renderPauseControl({ visible: isGameActive, isPaused });
    } else if (nextScene === 'moral') {
      renderMoralQuestion(gameState.getState().moralQuestionIndex);
      renderPauseControl({ visible: isGameActive, isPaused });
    } else if (nextScene === 'closing') {
      timer.stop();
      renderPauseControl({ visible: false, isPaused: false });
      updateClosingSummary();
    }
  },
  onAfterEnter: (nextScene) => {
    if (nextScene === 'playground') {
      audio.speak(NARRATIONS.PLAYGROUND_PROMPT);
    } else if (nextScene === 'moral') {
      const q = MORAL_QUESTIONS[gameState.getState().moralQuestionIndex];
      if (q) audio.speak(q.narration);
    } else if (nextScene === 'closing') {
      audio.playVictory();
      triggerConfetti();
      window.setTimeout(() => {
        if (gameState.getState().scene === 'closing') {
          audio.speak(NARRATIONS.CLOSING);
        }
      }, 450);
    }
  },
});

/* ==========================================================================
   SCENE 1: OPENING / BERANDA
   ========================================================================== */
function startGame() {
  audio.unlock();
  audio.playClick();
  audio.stopNarration();

  // Reset full game progress & timer to 180s
  gameState.resetGame();
  score.reset();
  timer.reset();

  // Start timer and background music according to audio settings
  timer.start();
  if (gameState.getState().musicEnabled) {
    audio.startMusic();
  }

  sceneManager.goTo('playground');
}

function replayToOpening() {
  audio.playClick();
  audio.stopNarration();
  sceneManager.cancelScheduledTransition();

  const timeUpDialog = document.getElementById('dialog-time-up');
  if (timeUpDialog?.open) {
    timeUpDialog.close();
  }

  gameState.resetGame();
  score.reset();
  timer.reset();
  resetPlaygroundUI();

  sceneManager.goTo('opening');
}

/* ==========================================================================
   SCENE 2: PLAYGROUND HIDDEN OBJECT
   ========================================================================== */
let hintTimeoutId = null;

function resetPlaygroundUI() {
  if (hintTimeoutId !== null) {
    window.clearTimeout(hintTimeoutId);
    hintTimeoutId = null;
  }

  document.querySelectorAll('.playground-hotspot').forEach((btn) => {
    btn.classList.remove('is-hinted', 'is-solved', 'is-wrong');
    btn.disabled = false;
  });

  document.querySelectorAll('.activity-card').forEach((card) => {
    card.classList.remove('is-correct', 'is-wrong');
    card.disabled = false;
  });

  const dodoAvatar = document.getElementById('playground-dodo-avatar');
  dodoAvatar?.classList.remove('is-happy');

  const starBurst = document.getElementById('playground-star-burst');
  if (starBurst) starBurst.hidden = true;

  const solvedToast = document.getElementById('playground-solved-toast');
  if (solvedToast) solvedToast.hidden = true;

  const speechText = document.getElementById('playground-speech-text');
  if (speechText) speechText.textContent = `“${NARRATIONS.PLAYGROUND_PROMPT}”`;

  const subHint = document.getElementById('playground-sub-hint');
  if (subHint) {
    subHint.textContent =
      'Amati gambar taman bermain di bawah ini, lalu klik langsung anak yang sedang kesulitan atau pilih kartunya.';
  }

  const progressBadge = document.getElementById('playground-progress-badge');
  if (progressBadge) {
    progressBadge.textContent = 'Temukan 1 Teman';
    progressBadge.className = 'pill-badge pill-badge--lime';
  }

  const feedbackBox = document.getElementById('playground-feedback');
  if (feedbackBox) {
    feedbackBox.hidden = true;
    feedbackBox.classList.remove('feedback-strip--success', 'feedback-strip--hint');
  }

  const btnToMoral = document.getElementById('btn-to-moral');
  if (btnToMoral) btnToMoral.hidden = true;
}

function handlePlaygroundSelection(activityId) {
  const state = gameState.getState();
  if (state.scene !== 'playground' || state.playgroundSolved || state.isPaused) {
    return;
  }

  audio.unlock();
  const result = validatePlaygroundActivity(activityId);
  if (!result.valid) return;

  const hotspot = document.querySelector(`.playground-hotspot[data-activity="${activityId}"]`);
  const card = document.querySelector(`.activity-card[data-activity-card="${activityId}"]`);
  const feedbackBox = document.getElementById('playground-feedback');
  const feedbackTitle = document.getElementById('playground-feedback-title');
  const feedbackText = document.getElementById('playground-feedback-text');
  const btnToMoral = document.getElementById('btn-to-moral');

  if (result.isCorrect) {
    gameState.setState({ playgroundSolved: true });
    score.award(ACHIEVEMENTS.HIDDEN_OBJECT);
    audio.playSuccess();

    if (hintTimeoutId !== null) {
      window.clearTimeout(hintTimeoutId);
      hintTimeoutId = null;
    }

    hotspot?.classList.remove('is-hinted', 'is-wrong');
    hotspot?.classList.add('is-solved');
    card?.classList.remove('is-wrong');
    card?.classList.add('is-correct');

    // Prevent repeat clicking once target is found
    document.querySelectorAll('.playground-hotspot, .activity-card').forEach((el) => {
      el.disabled = true;
    });

    const dodoAvatar = document.getElementById('playground-dodo-avatar');
    dodoAvatar?.classList.add('is-happy');

    const starBurst = document.getElementById('playground-star-burst');
    if (starBurst) starBurst.hidden = false;

    const solvedToast = document.getElementById('playground-solved-toast');
    if (solvedToast) solvedToast.hidden = false;

    const progressBadge = document.getElementById('playground-progress-badge');
    if (progressBadge) {
      progressBadge.textContent = 'Target Ditemukan! (+1 Bintang)';
      progressBadge.className = 'pill-badge pill-badge--magenta';
    }

    if (feedbackBox && feedbackTitle && feedbackText) {
      feedbackBox.hidden = false;
      feedbackBox.classList.remove('feedback-strip--hint');
      feedbackBox.classList.add('feedback-strip--success');
      feedbackTitle.textContent = 'Hore, Hebat! Kamu berhasil menemukannya!';
      feedbackText.textContent = result.activity.hint;
      feedbackBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (btnToMoral) btnToMoral.hidden = false;

    if (gameState.getState().voiceEnabled) {
      audio.speak(NARRATIONS.PLAYGROUND_SUCCESS).then(() => {
        const cur = gameState.getState();
        if (cur.scene === 'playground' && !cur.isPaused) {
          sceneManager.scheduleTransition('moral', 700);
        }
      });
    } else {
      sceneManager.scheduleTransition('moral', 2600);
    }
  } else {
    // Friendly retry — zero point penalty; audio strictly says exact mandated phrase!
    audio.playGentleNudge();
    audio.speak(NARRATIONS.PLAYGROUND_WRONG);

    if (hotspot) {
      hotspot.classList.add('is-wrong');
      window.setTimeout(() => hotspot.classList.remove('is-wrong'), 650);
    }
    if (card) {
      card.classList.remove('is-wrong');
      void card.offsetWidth;
      card.classList.add('is-wrong');
      window.setTimeout(() => card.classList.remove('is-wrong'), 700);
    }

    if (feedbackBox && feedbackTitle && feedbackText) {
      feedbackBox.hidden = false;
      feedbackBox.classList.remove('feedback-strip--success');
      feedbackBox.classList.add('feedback-strip--hint');
      feedbackTitle.textContent = 'Yuk, Amati Lagi!';
      feedbackText.textContent = result.activity.hint;
    }
    if (btnToMoral) btnToMoral.hidden = true;
    announce(NARRATIONS.PLAYGROUND_WRONG);
  }
}

function triggerPlaygroundHint() {
  const state = gameState.getState();
  if (state.scene !== 'playground' || state.playgroundSolved || state.isPaused) return;

  audio.unlock();
  audio.playClick();
  audio.speak(NARRATIONS.PLAYGROUND_PROMPT);

  const targetHotspot = document.querySelector('.playground-hotspot[data-activity="kesulitan-bola"]');
  if (targetHotspot) {
    targetHotspot.classList.add('is-hinted');
    if (hintTimeoutId !== null) window.clearTimeout(hintTimeoutId);
    hintTimeoutId = window.setTimeout(() => {
      targetHotspot.classList.remove('is-hinted');
      hintTimeoutId = null;
    }, 3200);
  }

  const feedbackBox = document.getElementById('playground-feedback');
  const feedbackTitle = document.getElementById('playground-feedback-title');
  const feedbackText = document.getElementById('playground-feedback-text');
  if (feedbackBox && feedbackTitle && feedbackText) {
    feedbackBox.hidden = false;
    feedbackBox.classList.remove('feedback-strip--success');
    feedbackBox.classList.add('feedback-strip--hint');
    feedbackTitle.textContent = 'Petunjuk Dodo';
    feedbackText.textContent = 'Coba perhatikan anak di dekat bangku taman sebelah kanan bawah!';
  }
}

/* ==========================================================================
   SCENE 3: TANTANGAN MORAL (Q1: 3 Choices, Q2: 2 Choices)
   ========================================================================== */
function renderMoralQuestion(questionIndex) {
  const question = MORAL_QUESTIONS[questionIndex];
  if (!question) return;

  const sceneImg = document.getElementById('moral-scene-img');
  const stageBadge = document.getElementById('moral-stage-badge');
  const stepPill = document.getElementById('moral-step-pill');
  const caption = document.getElementById('moral-caption-text');
  const questionBadge = document.getElementById('moral-question-badge');
  const heading = document.getElementById('moral-heading');
  const choicesGrid = document.getElementById('moral-choices-grid');
  const feedbackBox = document.getElementById('moral-feedback');
  const btnNext = document.getElementById('btn-moral-next');
  const dodoAvatar = document.getElementById('moral-dodo-avatar');

  if (sceneImg) {
    sceneImg.src = question.imageSrc;
    sceneImg.alt = question.imageAlt;
    sceneImg.className = question.imageClass;
  }
  if (stageBadge) stageBadge.textContent = question.stageBadge;
  if (stepPill) stepPill.textContent = `Pertanyaan ${question.stepNumber} dari ${MORAL_QUESTIONS.length}`;
  if (caption) caption.textContent = question.caption;
  if (questionBadge) {
    questionBadge.textContent = `Tantangan Moral • Pertanyaan ${question.stepNumber} dari ${MORAL_QUESTIONS.length}`;
  }
  if (heading) heading.textContent = `“${question.narration}”`;
  if (dodoAvatar) dodoAvatar.classList.remove('is-happy');

  if (feedbackBox) {
    feedbackBox.hidden = true;
    feedbackBox.classList.remove('feedback-strip--success', 'feedback-strip--hint');
  }
  if (btnNext) btnNext.hidden = true;

  if (choicesGrid) {
    choicesGrid.className =
      question.options.length === 3 ? 'quiz-choices quiz-choices--3' : 'quiz-choices quiz-choices--2';
    choicesGrid.innerHTML = '';

    question.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-card';
      btn.dataset.optionId = opt.id;
      btn.innerHTML = `
        <div class="choice-card__top">
          <span class="choice-card__letter">${opt.letter}</span>
          <span class="choice-card__icon">${getChoiceIconSvg(opt.icon)}</span>
        </div>
        <p class="choice-card__text">${opt.text}</p>
        <span class="choice-card__hint">Ketuk untuk memilih jawaban ${opt.letter}</span>
      `;
      btn.addEventListener('click', () => handleMoralChoice(questionIndex, opt.id, btn));
      choicesGrid.appendChild(btn);
    });
  }
}

function handleMoralChoice(questionIndex, optionId, clickedButton) {
  const state = gameState.getState();
  if (state.scene !== 'moral' || state.isPaused) return;
  if (state.moralAnswered[questionIndex]) return;

  audio.unlock();
  const validation = validateMoralAnswer(questionIndex, optionId);
  if (!validation) return;

  const feedbackBox = document.getElementById('moral-feedback');
  const feedbackTitle = document.getElementById('moral-feedback-title');
  const feedbackText = document.getElementById('moral-feedback-text');
  const btnNext = document.getElementById('btn-moral-next');
  const nextLabel = document.getElementById('moral-next-label');
  const dodoAvatar = document.getElementById('moral-dodo-avatar');

  if (validation.isCorrect) {
    const updatedAnswered = [...state.moralAnswered];
    updatedAnswered[questionIndex] = true;
    gameState.setState({ moralAnswered: updatedAnswered });

    score.award(validation.question.achievementKey);
    audio.playSuccess();

    clickedButton.classList.remove('is-wrong');
    clickedButton.classList.add('is-correct');
    const hintSpan = clickedButton.querySelector('.choice-card__hint');
    if (hintSpan) hintSpan.textContent = 'Jawaban tepat dan sopan!';

    // Disable cards for this answered question so child cannot double-submit
    document.querySelectorAll('#moral-choices-grid .choice-card').forEach((card) => {
      card.disabled = true;
    });

    dodoAvatar?.classList.add('is-happy');

    if (feedbackBox && feedbackTitle && feedbackText) {
      feedbackBox.hidden = false;
      feedbackBox.classList.remove('feedback-strip--hint');
      feedbackBox.classList.add('feedback-strip--success');
      feedbackTitle.textContent = 'Hebat, Detektif Kebaikan! (+1 Bintang)';
      feedbackText.textContent = validation.feedbackText;
      feedbackBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (btnNext && nextLabel) {
      nextLabel.textContent = validation.question.nextButtonLabel;
      btnNext.hidden = false;
    }

    audio.speak(validation.feedbackText);
    announce(validation.feedbackText);
  } else {
    // Friendly, encouraging feedback — no point loss, no scene jump!
    audio.playGentleNudge();
    clickedButton.classList.remove('is-wrong');
    void clickedButton.offsetWidth;
    clickedButton.classList.add('is-wrong');
    window.setTimeout(() => clickedButton.classList.remove('is-wrong'), 700);

    if (feedbackBox && feedbackTitle && feedbackText) {
      feedbackBox.hidden = false;
      feedbackBox.classList.remove('feedback-strip--success');
      feedbackBox.classList.add('feedback-strip--hint');
      feedbackTitle.textContent = 'Yuk, Coba Pilih Lagi!';
      feedbackText.textContent = validation.feedbackText;
    }
    if (btnNext) btnNext.hidden = true;

    audio.speak(validation.feedbackText);
    announce(validation.feedbackText);
  }
}

function advanceMoralFlow() {
  audio.playClick();
  audio.stopNarration();

  const currentIdx = gameState.getState().moralQuestionIndex;
  if (currentIdx + 1 < MORAL_QUESTIONS.length) {
    const nextIdx = currentIdx + 1;
    gameState.setState({ moralQuestionIndex: nextIdx });
    renderMoralQuestion(nextIdx);

    const heading = document.getElementById('moral-heading');
    heading?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const nextQuestion = MORAL_QUESTIONS[nextIdx];
    audio.speak(nextQuestion.narration);
  } else {
    sceneManager.goTo('closing');
  }
}

/* ==========================================================================
   SCENE 4: CLOSING & PRAKTIK PENGUCAPAN
   ========================================================================== */
function updateClosingSummary() {
  const meta = document.getElementById('closing-summary-meta');
  if (!meta) return;
  const starCount = score.getCount();
  const elapsed = formatMMSS(timer.getElapsedSeconds());
  meta.textContent = `${starCount}/${MAX_STARS} Bintang • Waktu Bermain ${elapsed}`;
}

function handlePracticeWord(wordKey, cardEl) {
  const entry = PRACTICE_WORDS[wordKey];
  if (!entry) return;

  audio.unlock();
  document.querySelectorAll('.practice-card').forEach((c) => c.classList.remove('is-speaking'));
  cardEl.classList.add('is-speaking');

  // Strict Section G rule: speak ONLY "Tolong" or "Terima kasih" with no extra sentences!
  audio.speak(entry.speech, { rate: 0.88, pitch: 1.12 }).finally(() => {
    window.setTimeout(() => cardEl.classList.remove('is-speaking'), 350);
  });
  announce(entry.speech);
}

/* ==========================================================================
   MODALS: PANDUAN GURU & WAKTU HABIS
   ========================================================================== */
function openTeacherGuide() {
  const dialog = document.getElementById('dialog-teacher-guide');
  if (!dialog || dialog.open) return;

  audio.playClick();
  if (gameState.getState().isGameActive) {
    timer.pause('teacher-guide');
  }
  dialog.showModal();
}

function handleTimeUp() {
  sceneManager.cancelScheduledTransition();
  audio.stopNarration();
  audio.playGentleNudge();

  const starsEl = document.getElementById('time-up-stars-text');
  if (starsEl) {
    starsEl.textContent = `Perolehan Bintang: ${score.getCount()}/${MAX_STARS}`;
  }

  const teacherDialog = document.getElementById('dialog-teacher-guide');
  if (teacherDialog?.open) {
    teacherDialog.close();
  }

  const dialog = document.getElementById('dialog-time-up');
  if (dialog && !dialog.open) {
    dialog.showModal();
  }

  audio.speak(NARRATIONS.TIME_UP);
  announce('Waktu permainan habis. Kamu bisa menekan tombol Main Lagi untuk mencoba kembali.');
}

/* ==========================================================================
   EVENT BINDINGS & INITIAL BOOTSTRAP
   ========================================================================== */
function bindEvents() {
  // Header Controls
  document.getElementById('btn-music-toggle')?.addEventListener('click', () => {
    const next = !gameState.getState().musicEnabled;
    audio.setMusicEnabled(next);
    audio.playClick();
    renderAudioControls(gameState.getState());
    announce(next ? 'Musik latar dinyalakan.' : 'Musik latar dimatikan.');
  });

  document.getElementById('btn-voice-toggle')?.addEventListener('click', () => {
    const next = !gameState.getState().voiceEnabled;
    audio.setVoiceEnabled(next);
    if (next) audio.playClick();
    renderAudioControls(gameState.getState());
    announce(next ? 'Suara narasi dinyalakan.' : 'Suara narasi dimatikan.');
  });

  document.getElementById('btn-pause')?.addEventListener('click', () => {
    audio.playClick();
    timer.toggleUserPause();
    const paused = gameState.getState().isPaused;
    if (paused) audio.stopNarration();
    announce(paused ? 'Permainan dijeda.' : 'Permainan dilanjutkan.');
  });

  document.getElementById('btn-resume-inline')?.addEventListener('click', () => {
    audio.playClick();
    timer.resume('user');
    announce('Permainan dilanjutkan.');
  });

  document.getElementById('btn-teacher-guide')?.addEventListener('click', openTeacherGuide);
  document.getElementById('btn-opening-guide')?.addEventListener('click', openTeacherGuide);

  // Native <dialog> close handling (resets returnValue per Modern Web Guidance)
  const teacherDialog = document.getElementById('dialog-teacher-guide');
  teacherDialog?.addEventListener('close', () => {
    teacherDialog.returnValue = '';
    timer.resume('teacher-guide');
  });

  // Scene 1: Opening
  document.getElementById('btn-start-game')?.addEventListener('click', startGame);
  document.getElementById('btn-opening-audio')?.addEventListener('click', () => {
    audio.unlock();
    audio.playClick();
    audio.speak(NARRATIONS.OPENING);
  });

  // Scene 2: Playground
  document.getElementById('btn-playground-audio')?.addEventListener('click', () => {
    audio.unlock();
    audio.playClick();
    audio.speak(NARRATIONS.PLAYGROUND_PROMPT);
  });

  document.getElementById('btn-playground-hint')?.addEventListener('click', triggerPlaygroundHint);

  document.querySelectorAll('.playground-hotspot').forEach((hotspot) => {
    hotspot.addEventListener('click', () => {
      handlePlaygroundSelection(hotspot.dataset.activity);
    });
  });

  document.querySelectorAll('.activity-card').forEach((card) => {
    card.addEventListener('click', () => {
      handlePlaygroundSelection(card.dataset.activityCard);
    });
  });

  document.getElementById('btn-to-moral')?.addEventListener('click', () => {
    audio.playClick();
    audio.stopNarration();
    sceneManager.goTo('moral');
  });

  // Scene 3: Moral Challenge
  document.getElementById('btn-moral-audio')?.addEventListener('click', () => {
    audio.unlock();
    audio.playClick();
    const q = MORAL_QUESTIONS[gameState.getState().moralQuestionIndex];
    if (q) audio.speak(q.narration);
  });

  document.getElementById('btn-moral-next')?.addEventListener('click', advanceMoralFlow);

  // Scene 4: Closing & Practice
  document.getElementById('btn-closing-audio')?.addEventListener('click', () => {
    audio.unlock();
    audio.playClick();
    audio.speak(NARRATIONS.CLOSING);
  });

  document.querySelectorAll('.practice-card').forEach((card) => {
    card.addEventListener('click', () => {
      handlePracticeWord(card.dataset.practiceWord, card);
    });
  });

  document.getElementById('btn-play-again')?.addEventListener('click', replayToOpening);

  // Time-up Dialog Replay
  document.getElementById('btn-timeup-replay')?.addEventListener('click', replayToOpening);
}

function init() {
  setupDialogLightDismissFallback();
  bindEvents();

  renderStars(0, null);
  renderTimer(INITIAL_DURATION_SECONDS, { isPaused: false, isActive: false });
  renderPauseControl({ visible: false, isPaused: false });
  renderAudioControls(gameState.getState());
  sceneManager.goTo('opening', { animate: false });
}

document.addEventListener('DOMContentLoaded', init);
