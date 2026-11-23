/**
 * Quiz & Hidden Object Validator
 * Holds exact game text, activity metadata, moral challenge questions, and strict audio phrases.
 */

export const NARRATIONS = Object.freeze({
  OPENING:
    'Halo teman-teman! Aku Dodo. Yuk, bantu Dodo mencari teman yang membutuhkan bantuan!',
  PLAYGROUND_PROMPT: 'Coba cari teman yang terlihat kesulitan, yuk!',
  PLAYGROUND_WRONG: 'Coba cari teman yang terlihat kesulitan, yuk!',
  PLAYGROUND_SUCCESS: 'Hore, Hebat! Kamu berhasil menemukannya!',
  CLOSING:
    'Yeay! Teman kita sudah mendapatkan bantuannya. Jangan lupa mengucapkan terima kasih, ya!',
  TIME_UP:
    'Hebat! Kamu sudah berusaha bersama Dodo hari ini. Yuk, kita main lagi!',
});

export const PLAYGROUND_ACTIVITIES = Object.freeze({
  'bermain-ayunan': {
    id: 'bermain-ayunan',
    label: 'Bermain Ayunan',
    isTarget: false,
    hint: 'Anak di ayunan terlihat sedang bermain dengan gembira. Yuk, perhatikan dekat bangku taman!',
  },
  'bermain-bola': {
    id: 'bermain-bola',
    label: 'Bermain Bola',
    isTarget: false,
    hint: 'Anak yang menendang bola sedang bermain riang. Coba lihat teman lain yang butuh bantuan!',
  },
  'membaca-buku': {
    id: 'membaca-buku',
    label: 'Membaca Buku',
    isTarget: false,
    hint: 'Anak di bawah pohon sedang tenang membaca buku. Coba cari teman yang kesulitan mengambil bolanya!',
  },
  'kesulitan-bola': {
    id: 'kesulitan-bola',
    label: 'Kesulitan Mengambil Bola',
    isTarget: true,
    hint: 'Benar! Anak di dekat bangku taman sedang kesulitan mengambil bola merah yang tersangkut.',
  },
  'bermain-perosotan': {
    id: 'bermain-perosotan',
    label: 'Bermain Perosotan',
    isTarget: false,
    hint: 'Anak di perosotan kuning sedang meluncur dengan senang. Coba lihat ke arah bangku taman!',
  },
});

export const MORAL_QUESTIONS = Object.freeze([
  {
    id: 'q1',
    stepNumber: 1,
    achievementKey: 'moralQ1',
    stageBadge: 'Investigasi Dekat • Bola Tersangkut di Bawah Bangku',
    caption:
      'Lihat, bola merah teman kita tersangkut di bawah bangku taman. Yuk bantu pilih ucapan yang baik!',
    imageSrc: 'assets/images/taman-bermain.png',
    imageAlt:
      'Tampilan lebih dekat anak yang berusaha mengambil bola merah di bawah bangku taman',
    imageClass: 'moral-spotlight__img moral-spotlight__img--closeup-stuck',
    narration:
      'Teman kita kesulitan mengambil bola. Kalau kamu membutuhkan bantuan, apa yang harus kamu katakan?',
    correctFeedback:
      'Hebat! Kalau membutuhkan bantuan, kita harus meminta tolong dengan sopan.',
    nextButtonLabel: 'Lanjut ke Pertanyaan 2',
    options: [
      {
        id: 'A',
        letter: 'A',
        text: '“Tolong bantu aku mengambil bola itu.”',
        icon: 'help',
        isCorrect: true,
        wrongFeedback: '',
      },
      {
        id: 'B',
        letter: 'B',
        text: '“Merebut bola teman.”',
        icon: 'grab',
        isCorrect: false,
        wrongFeedback:
          'Merebut bola bisa membuat teman terkejut. Yuk, pilih ucapan yang sopan saat meminta bantuan!',
      },
      {
        id: 'C',
        letter: 'C',
        text: '“Diam saja.”',
        icon: 'silent',
        isCorrect: false,
        wrongFeedback:
          'Kalau diam saja, teman belum tahu kamu membutuhkan bantuan. Yuk, coba pilih jawaban yang sopan!',
      },
    ],
  },
  {
    id: 'q2',
    stepNumber: 2,
    achievementKey: 'moralQ2',
    stageBadge: 'Momen Kebaikan • Teman Sudah Membantu',
    caption:
      'Wah, teman kita sudah mengambilkan bola merahnya! Apa yang sebaiknya kita ucapkan?',
    imageSrc: 'assets/images/teman-membantu.png',
    imageAlt:
      'Anak yang membantu menyerahkan bola merah kepada temannya dengan gembira di dekat Dodo',
    imageClass: 'moral-spotlight__img moral-spotlight__img--helping',
    narration: 'Kalau teman sudah membantu kita, apa yang harus kita ucapkan?',
    correctFeedback:
      'Hebat sekali! Setelah dibantu teman, kita harus mengucapkan terima kasih dengan gembira.',
    nextButtonLabel: 'Lanjut ke Perayaan & Praktik Bersama!',
    options: [
      {
        id: 'A',
        letter: 'A',
        text: '“Terima kasih!”',
        icon: 'heart',
        isCorrect: true,
        wrongFeedback: '',
      },
      {
        id: 'B',
        letter: 'B',
        text: '“Pergi begitu saja.”',
        icon: 'leave',
        isCorrect: false,
        wrongFeedback:
          'Kalau pergi begitu saja, teman yang membantu bisa merasa sedih. Yuk, pilih ucapan yang sopan!',
      },
    ],
  },
]);

export const PRACTICE_WORDS = Object.freeze({
  tolong: {
    label: 'TOLONG',
    speech: 'Tolong',
  },
  'terima-kasih': {
    label: 'TERIMA KASIH',
    speech: 'Terima kasih',
  },
});

export function validatePlaygroundActivity(activityId) {
  const activity = PLAYGROUND_ACTIVITIES[activityId];
  if (!activity) {
    return { valid: false, isCorrect: false, activity: null };
  }
  return {
    valid: true,
    isCorrect: activity.isTarget,
    activity,
  };
}

export function validateMoralAnswer(questionIndex, optionId) {
  const question = MORAL_QUESTIONS[questionIndex];
  if (!question) return null;

  const option = question.options.find((opt) => opt.id === optionId);
  if (!option) return null;

  return {
    question,
    option,
    isCorrect: option.isCorrect,
    feedbackText: option.isCorrect ? question.correctFeedback : option.wrongFeedback,
  };
}
