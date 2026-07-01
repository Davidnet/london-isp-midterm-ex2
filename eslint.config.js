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

// Mutable shared state/handles — reassigned across files, so writable.
const mutableState = [
  'challenge',
  'playing',
  'volume',
  'phase',
  'scopeEnv',
  'myVoice',
  'maskNoise',
  'rumbleNoise',
  'fftScope',
  'noiseActive',
  'speaking',
  'paused',
  'speakQueue',
  'qIndex',
  'gapTimer',
  'pendingResume',
  'wordActive',
];

// Constants + functions — never reassigned, so readonly. Keeping these readonly
// lets ESLint flag accidental clobbering (e.g. `generateChallenge = …`).
const constantsAndFns = [
  // challenge.js constants
  'WORDS',
  'NUMBERS',
  'N_TARGETS',
  'N_FILLERS',
  // functions (all files)
  'shuffled',
  'generateChallenge',
  'rand',
  'initAudio',
  'pickVoiceIndex',
  'ensureNoise',
  'updateNoiseAmp',
  'onPlayToggle',
  'replay',
  'newChallenge',
  'buildSpeakQueue',
  'startSpeaking',
  'speakCurrent',
  'handleWordStart',
  'handleWordEnd',
  'finishSpeaking',
  'stopSpeaking',
  'pauseSpeaking',
  'resumeSpeaking',
  'renderFields',
  'boxes',
  'onType',
  'onKey',
  'wireControls',
  'wireKnob',
  'updateVolumeUI',
  'setStatus',
  'setLcd',
  'verifyChallenge',
  'setup',
  'draw',
];

// Our own top-level symbols, shared across the app/js files (p5 global mode).
const projectGlobals = {
  ...Object.fromEntries(mutableState.map((name) => [name, 'writable'])),
  ...Object.fromEntries(constantsAndFns.map((name) => [name, 'readonly'])),
};

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

  // Node scripts: the dev server + this config file itself
  {
    files: ['serve.js', 'eslint.config.js'],
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
