/* ==========================================================================
   CHALLENGE GENERATION
   --------------------------------------------------------------------------
   The clip speaks several "word number" pairs. The user must type the number
   that follows each on-screen TARGET word, in order.
       pairs  = apple nine, blue three, table five, river eight, chair one
       target = blue, river, chair   ->   answer = 3 8 1
   Only the target words are shown; the full pair list is spoken only.
   (We are NOT trying to hide this logic from the source — see verify.js.)
   ========================================================================== */

/* Word bank — short, common, phonetically distinct nouns (easy to hear). */
const WORDS = [
  'apple',
  'blue',
  'table',
  'river',
  'chair',
  'tiger',
  'cloud',
  'stone',
  'bread',
  'lemon',
  'glass',
  'horse',
  'plant',
  'brick',
  'ocean',
  'candle',
  'window',
  'garden',
  'pencil',
  'rocket',
];

/* Number bank — spoken word + the digit we compare against. */
const NUMBERS = [
  { word: 'one', digit: '1' },
  { word: 'two', digit: '2' },
  { word: 'three', digit: '3' },
  { word: 'four', digit: '4' },
  { word: 'five', digit: '5' },
  { word: 'six', digit: '6' },
  { word: 'seven', digit: '7' },
  { word: 'eight', digit: '8' },
  { word: 'nine', digit: '9' },
];

const N_TARGETS = 3; // shown on screen  -> answer length
const N_FILLERS = 2; // decoys, spoken but not shown

/* Fisher–Yates, returns a shuffled COPY (never mutates the source bank). */
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Builds the global `challenge` = { targetWords, pairs, answer }. */
function generateChallenge() {
  const targetWords = shuffled(WORDS).slice(0, N_TARGETS);

  const fillerWords = shuffled(WORDS.filter((w) => !targetWords.includes(w))).slice(0, N_FILLERS);

  // Spoken order mixes targets + fillers so position gives nothing away.
  const allChallengeWords = shuffled([...targetWords, ...fillerWords]);

  // Distinct numbers, one per spoken word.
  const chosenNumbers = shuffled(NUMBERS).slice(0, allChallengeWords.length);

  const pairs = allChallengeWords.map((word, i) => ({
    word,
    numberWord: chosenNumbers[i].word,
    numberDigit: chosenNumbers[i].digit,
  }));

  // Answer = digits after each TARGET word, in the target-word order shown.
  const answer = targetWords
    .map((targetWord) => pairs.find((p) => p.word === targetWord).numberDigit)
    .join('');

  challenge = { targetWords, pairs, answer };
  return challenge;
}
