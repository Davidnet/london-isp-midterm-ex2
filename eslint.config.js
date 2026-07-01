const js = require('@eslint/js');
const globals = require('globals');

/*
 * The app runs as a p5.js "global mode" sketch: every file is a classic
 * <script> sharing one global scope (NOT ES modules). ESLint analyses each
 * file in isolation, so p5's API and our own cross-file functions/state must
 * be declared as globals here — otherwise `no-undef` fires on all of them.
 */
const p5Api = {
  p5: 'readonly',
  createCanvas: 'readonly',
  resizeCanvas: 'readonly',
  clear: 'readonly',
  stroke: 'readonly',
  strokeWeight: 'readonly',
  noFill: 'readonly',
  fill: 'readonly',
  line: 'readonly',
  beginShape: 'readonly',
  vertex: 'readonly',
  endShape: 'readonly',
  map: 'readonly',
  constrain: 'readonly',
  frameCount: 'readonly',
  width: 'readonly',
  height: 'readonly',
  userStartAudio: 'readonly',
  getAudioContext: 'readonly',
};

// Our own top-level symbols, shared across the app/js files. Writable because
// several (playing, volume, challenge, the audio handles…) are reassigned.
const projectGlobals = Object.fromEntries(
  [
    // state + handles (main.js / audio.js)
    'challenge', 'playing', 'volume', 'phase', 'scopeEnv',
    'myVoice', 'maskNoise', 'rumbleNoise', 'fftScope', 'noiseActive',
    'speaking', 'paused', 'speakQueue', 'qIndex', 'gapTimer',
    'pendingResume', 'wordActive',
    // challenge.js constants
    'WORDS', 'NUMBERS', 'N_TARGETS', 'N_FILLERS',
    // functions (all files)
    'shuffled', 'generateChallenge', 'rand', 'initAudio', 'pickVoiceIndex',
    'ensureNoise', 'updateNoiseAmp', 'onPlayToggle', 'replay', 'newChallenge',
    'buildSpeakQueue', 'startSpeaking', 'speakCurrent', 'handleWordStart',
    'handleWordEnd', 'finishSpeaking', 'stopSpeaking', 'pauseSpeaking',
    'resumeSpeaking', 'renderFields', 'boxes', 'onType', 'onKey',
    'wireControls', 'wireKnob', 'updateVolumeUI', 'setStatus', 'setLcd',
    'verifyChallenge', 'setup', 'draw',
  ].map((name) => [name, 'writable'])
);

module.exports = [
  { ignores: ['libraries/**', 'fonts/**', 'examples_p5_speech/**', 'node_modules/**'] },

  // Browser app (p5 global-mode sketch)
  {
    files: ['app/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, ...p5Api, ...projectGlobals },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Global-mode sketch: our functions/state are declared here as globals
      // AND defined in the files, so the "redeclaration" is intentional.
      'no-redeclare': 'off',
      // Only lint for unused LOCALS — cross-file global functions look "unused"
      // to a per-file analysis but are called from other <script> files.
      'no-unused-vars': ['warn', { vars: 'local', args: 'after-used', argsIgnorePattern: '^_' }],
    },
  },

  // Node dev server
  {
    files: ['serve.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
