/* ==========================================================================
   AUDIO  —  p5.speech (TTS challenge)  +  p5.sound (masking / scramble)
   --------------------------------------------------------------------------
   HOW THE "SCRAMBLE" WORKS (and its one hard limit):
   The browser Web Speech API speaks straight to the speakers and exposes NO
   audio buffer/stream, so we cannot run DSP *on the voice itself* or feed the
   voice into an FFT. So the scramble is two-pronged:
     1. Synthesis-time voice jitter — random pitch / rate / voice PER WORD
        (these are utterance params, applied before the browser synthesizes).
     2. A concurrent p5.sound MASKING BED — band-passed pink noise sitting in
        the speech band + a low brown-noise rumble, amplitude-wobbled so it
        can't be cleanly subtracted. The human ear separates voice from noise;
        a tab-recording ASR bot gets them smeared together.
   The oscilloscope visualises the masking bed (a real p5.sound signal we CAN
   analyse) — which is exactly the "SCRAMBLED SIGNAL" the LCD advertises.

   p5.speech reuses ONE utterance object, so per-word params only take effect
   if we speak SEQUENTIALLY (chain on end), never by queuing all words at once.
   ========================================================================== */

/* p5.speech handle ---------------------------------------------------------- */
let myVoice = null;

/* p5.sound masking graph (names avoid p5 globals like noise()/filter()) ----- */
let maskNoise = null; // pink noise, band-passed into the speech band
let rumbleNoise = null; // brown noise, low-passed for a subtle rumble
let fftScope = null; // analyses the main output (i.e. the masking bed)
let noiseActive = false; // is the masking bed currently "on"?

/* Speaking sequencer state -------------------------------------------------- */
let speaking = false; // a challenge is in progress (playing OR paused)
let paused = false; // paused mid-challenge
let speakQueue = []; // [{ text, pitch, rate, voiceIndex }]
let qIndex = 0; // which pair we're on
let gapTimer = null; // setTimeout handle for the inter-word gap
let pendingResume = false; // paused during a gap -> resume should re-fire speak
let wordActive = false; // true only while a word is actually being spoken
// (drives the masking-bed swell -> the scope pulse)

function rand(min, max) {
  return min + Math.random() * (max - min);
}

/* ---- init ---------------------------------------------------------------- */
function initAudio() {
  if (typeof p5 === 'undefined' || !p5.Speech) {
    console.warn('p5.speech unavailable — TTS will not work in this browser.');
    return;
  }
  myVoice = new p5.Speech();

  // Prime the voice list (some browsers only populate on demand)...
  if (window.speechSynthesis && window.speechSynthesis.getVoices) {
    window.speechSynthesis.getVoices();
  }
  // ...and defensively bind start/end-of-utterance ourselves. p5.speech only
  // wires these inside onvoiceschanged, which may never fire when voices are
  // cached — so we guarantee the sequencer + scope envelope stay in sync.
  myVoice.utterance.onstart = () => {
    if (myVoice.onStart) myVoice.onStart();
  };
  myVoice.utterance.onend = () => {
    if (myVoice.onEnd) myVoice.onEnd();
  };
  myVoice.onStart = handleWordStart;
  myVoice.onEnd = handleWordEnd;
}

/* Pick a random English voice index, or null to use the browser default. */
function pickVoiceIndex() {
  const voices = (myVoice && myVoice.voices) || [];
  const en = [];
  for (let i = 0; i < voices.length; i++) {
    if (voices[i].lang && voices[i].lang.toLowerCase().indexOf('en') === 0) en.push(i);
  }
  if (!en.length) return null;
  return en[Math.floor(Math.random() * en.length)];
}

/* ---- masking bed (created lazily, after the AudioContext is unlocked) ----- */
function ensureNoise() {
  if (maskNoise) return;

  // Speech-band masker: pink noise -> band-pass ~1.4 kHz.
  maskNoise = new p5.Noise('pink');
  const band = new p5.Filter('bandpass');
  band.set(1400, 1.4);
  maskNoise.disconnect();
  maskNoise.connect(band);
  maskNoise.amp(0);
  maskNoise.start();

  // Low rumble: brown noise -> low-pass ~320 Hz.
  rumbleNoise = new p5.Noise('brown');
  const low = new p5.Filter('lowpass');
  low.set(320, 0.9);
  rumbleNoise.disconnect();
  rumbleNoise.connect(low);
  rumbleNoise.amp(0);
  rumbleNoise.start();

  // No setInput -> FFT analyses the whole p5.sound main output = the bed.
  fftScope = new p5.FFT(0.85, 512);
}

/* Called every frame from draw(): wobble the bed so it isn't a flat hiss,
   and scale it with the volume knob. amp() ramps smoothly to avoid clicks. */
function updateNoiseAmp() {
  if (!maskNoise) return;
  const on = noiseActive ? 1 : 0;
  const wobble = 0.55 + 0.45 * Math.sin(frameCount * 0.05);
  // The bed swells while a word is spoken and eases back in the gaps, so the
  // scope visibly pulses with the voice even though the voice isn't in the graph.
  const speechEnv = wordActive ? 1.0 : 0.4;
  maskNoise.amp(on * 0.06 * volume * wobble * speechEnv, 0.05);
  rumbleNoise.amp(on * 0.035 * volume * (0.6 + 0.4 * speechEnv), 0.12);
}

/* ==========================================================================
   TRANSPORT  (wired to the buttons in ui.js)
   ========================================================================== */
function onPlayToggle() {
  // The click IS the user gesture that unlocks audio (autoplay policy).
  if (typeof userStartAudio === 'function') userStartAudio();
  ensureNoise();

  if (!speaking)
    startSpeaking(); // idle -> start
  else if (paused)
    resumeSpeaking(); // paused -> resume
  else pauseSpeaking(); // playing -> pause
}

function replay() {
  if (typeof userStartAudio === 'function') userStartAudio();
  ensureNoise();
  stopSpeaking();
  startSpeaking();
}

/* Called by ui.js "NEW CHALLENGE": regenerate, re-render, then auto-play. */
function newChallenge() {
  stopSpeaking();
  generateChallenge();
  renderFields();
  setStatus('idle');
  if (typeof userStartAudio === 'function') userStartAudio();
  ensureNoise();
  startSpeaking();
}

/* ---- sequencer ----------------------------------------------------------- */
function buildSpeakQueue() {
  speakQueue = challenge.pairs.map((p) => ({
    text: p.word + ' ' + p.numberWord,
    pitch: rand(0.85, 1.25),
    rate: rand(0.85, 1.15),
    voiceIndex: pickVoiceIndex(),
  }));
  qIndex = 0;
}

function startSpeaking() {
  if (!myVoice) return;
  buildSpeakQueue();
  speaking = true;
  paused = false;
  pendingResume = false;
  noiseActive = true;
  playing = true;
  setLcd(true);
  speakCurrent();
}

function speakCurrent() {
  if (!speaking || paused) return;
  if (qIndex >= speakQueue.length) {
    finishSpeaking();
    return;
  }
  const item = speakQueue[qIndex];
  if (item.voiceIndex != null) myVoice.setVoice(item.voiceIndex);
  myVoice.setPitch(item.pitch);
  myVoice.setRate(item.rate);
  myVoice.setVolume(volume);
  myVoice.speak(item.text);
}

/* Fires when the browser BEGINS speaking a word -> swell the masking bed. */
function handleWordStart() {
  wordActive = true;
}

/* Fires when the browser finishes (or cancels) an utterance. */
function handleWordEnd() {
  wordActive = false; // ease the bed back down during the gap
  if (!speaking || paused) return; // ignore cancel-induced end events
  qIndex++;
  if (qIndex >= speakQueue.length) {
    finishSpeaking();
    return;
  }
  const gap = rand(140, 360); // time-jittered gap between pairs
  gapTimer = setTimeout(() => {
    if (paused) {
      pendingResume = true;
      return;
    }
    speakCurrent();
  }, gap);
}

function finishSpeaking() {
  speaking = false;
  paused = false;
  pendingResume = false;
  wordActive = false;
  noiseActive = false;
  playing = false;
  setLcd(false);
}

/* Hard stop — used by replay / new challenge. */
function stopSpeaking() {
  speaking = false;
  paused = false;
  pendingResume = false;
  wordActive = false;
  if (gapTimer) {
    clearTimeout(gapTimer);
    gapTimer = null;
  }
  if (myVoice) myVoice.stop(); // cancels the queue
  noiseActive = false;
  playing = false;
  setLcd(false);
}

function pauseSpeaking() {
  paused = true;
  playing = false;
  wordActive = false;
  noiseActive = false;
  if (gapTimer) {
    clearTimeout(gapTimer);
    gapTimer = null;
    pendingResume = true;
  }
  if (myVoice) myVoice.pause();
  setLcd(false);
}

function resumeSpeaking() {
  paused = false;
  playing = true;
  noiseActive = true;
  setLcd(true);
  if (myVoice) myVoice.resume();
  if (pendingResume) {
    pendingResume = false;
    speakCurrent();
  }
}
