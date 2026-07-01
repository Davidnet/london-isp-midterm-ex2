/* ==========================================================================
   MAIN  —  shared state + p5 lifecycle (global mode) + oscilloscope draw
   ========================================================================== */

/* ---- shared app state (read/written across the other modules) ------------ */
let challenge = null; // { targetWords:[...], pairs:[...], answer:'381' }
let playing = false; // is the challenge actively speaking right now?
let volume = 0.62; // 0–1, driven by the knob
let phase = 0; // animation phase for the idle (silent) scope wave
let scopeEnv = 0; // smoothed scope height envelope (pulses with speech)

/* ==========================================================================
   p5 LIFECYCLE
   ========================================================================== */
function setup() {
  // Parent p5's canvas into the LCD, replacing the placeholder <canvas>.
  const slot = document.getElementById('scope');
  const c = createCanvas(slot.clientWidth, slot.clientHeight);
  c.parent(slot.parentElement);
  c.elt.style.cssText = 'display:block;width:100%;height:116px';
  slot.remove();
  c.elt.id = 'scope';

  initAudio();
  generateChallenge();
  renderFields();
  wireControls();
  setStatus('idle');

  window.addEventListener('resize', () => {
    const el = document.getElementById('scope');
    if (el) resizeCanvas(el.clientWidth, height);
  });
}

function draw() {
  clear();
  updateNoiseAmp();

  const w = width,
    h = height,
    mid = h / 2;

  // baseline
  stroke(42, 212, 200, 36);
  strokeWeight(1);
  line(0, mid, w, mid);

  // waveform: real masking-bed FFT when audio is live, else an idle wave
  const ampScale = (playing ? 1 : 0.05) * (0.3 + 0.7 * volume) * h * 0.42;
  stroke(42, 212, 200);
  strokeWeight(2);
  noFill();

  if (playing && fftScope) {
    // ---- REAL SIGNAL: the p5.sound masking bed ----------------------------
    // The bed is deliberately quiet AND band-passed, so waveform() values are
    // tiny (~0.008 p2p) and vary with the filter. Rather than chase a fragile
    // fixed gain, NORMALISE the trace to its own peak so it always fills the
    // panel, then scale its height by a word-synced envelope (swells under each
    // spoken word, eases in the gaps) times volume. Result: a lively scope that
    // visibly pulses with the voice. Display only — never touches the audio.
    const wave = fftScope.waveform();
    let peak = 1e-6;
    for (let i = 0; i < wave.length; i++) {
      const a = Math.abs(wave[i]);
      if (a > peak) peak = a;
    }
    const targetEnv = wordActive ? 1.0 : 0.45;
    scopeEnv += (targetEnv - scopeEnv) * 0.15; // smooth the pulse
    const dispAmp = scopeEnv * (0.3 + 0.7 * volume) * h * 0.42;
    const norm = 1 / (peak * 1.25); // headroom so peaks don't rail
    beginShape();
    for (let i = 0; i < wave.length; i++) {
      const x = map(i, 0, wave.length - 1, 0, w);
      const y = mid - wave[i] * norm * dispAmp;
      vertex(x, constrain(y, 2, h - 2)); // keep the trace in the LCD
    }
    endShape();
  } else {
    // ---- IDLE: synthesised scramble wave keeps the LCD alive --------------
    beginShape();
    for (let x = 0; x <= w; x += 2) {
      const p = x / w;
      let y =
        Math.sin(p * 20 + phase * 3.1) * 0.5 +
        Math.sin(p * 46 - phase * 2.0) * 0.28 +
        Math.sin(p * 9 + phase * 1.2) * 0.35;
      const nz = (Math.sin(x * 127.1 + phase * 13.0) * 43758.5453) % 1;
      y += nz * 0.6 * 0.9;
      y *= 0.55 + 0.45 * Math.sin(p * 7 - phase * 1.5);
      vertex(x, mid - y * ampScale);
    }
    endShape();
  }

  phase += playing ? 0.05 : 0.006;
}
