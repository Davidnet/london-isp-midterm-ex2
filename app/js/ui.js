/* ==========================================================================
   UI  —  chips, answer boxes, volume knob, transport wiring, status/LCD
   ========================================================================== */

/* ---- answer fields: each target word labels the box its number goes in ---- */
function renderFields() {
  const el = document.getElementById('fields');
  el.innerHTML = '';
  challenge.targetWords.forEach((word, i) => {
    const field = document.createElement('div');
    field.className = 'field';

    const label = document.createElement('span');
    label.className = 'field-word';
    label.textContent = word;

    const inp = document.createElement('input');
    inp.className = 'box';
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.maxLength = 1;
    inp.autocomplete = 'off';
    inp.dataset.index = i;
    inp.setAttribute('aria-label', 'Number spoken after ' + word);
    inp.addEventListener('input', onType);
    inp.addEventListener('keydown', onKey);
    inp.addEventListener('focus', () => setStatus('idle'));

    field.appendChild(label);
    field.appendChild(inp);
    el.appendChild(field);
  });
}

function boxes() { return [...document.querySelectorAll('.box')]; }

function onType(e) {
  const i = +e.target.dataset.index;
  e.target.value = (e.target.value.replace(/\D/g, '').slice(-1) || '');
  if (e.target.value && i < boxes().length - 1) boxes()[i + 1].focus();
  setStatus('idle');
}
function onKey(e) {
  const i = +e.target.dataset.index;
  if (e.key === 'Backspace' && !e.target.value && i > 0) boxes()[i - 1].focus();
}

/* ---- transport + knob wiring --------------------------------------------- */
function wireControls() {
  document.getElementById('btn-play').onclick   = onPlayToggle;
  document.getElementById('btn-replay').onclick = replay;
  document.getElementById('btn-new').onclick    = newChallenge;
  document.getElementById('btn-verify').onclick = verifyChallenge;
  wireKnob();
  updateVolumeUI();
}

/* Volume knob — drag vertically. Δvol = (startY − y) / 150, clamped 0–1. */
function wireKnob() {
  const knob = document.getElementById('knob');
  let dragging = false, startY = 0, startVol = 0;
  knob.addEventListener('pointerdown', e => {
    dragging = true; startY = e.clientY; startVol = volume;
    knob.setPointerCapture(e.pointerId);
  });
  knob.addEventListener('pointermove', e => {
    if (!dragging) return;
    volume = Math.max(0, Math.min(1, startVol + (startY - e.clientY) / 150));
    updateVolumeUI();
    if (myVoice) myVoice.setVolume(volume);   // applies to the NEXT word
  });
  knob.addEventListener('pointerup', () => { dragging = false; });
}

function updateVolumeUI() {
  const deg = -135 + volume * 270;
  document.getElementById('knob-ind').style.transform = `translateX(-50%) rotate(${deg}deg)`;
  document.getElementById('vol-label').innerHTML = 'VOL&nbsp;' + Math.round(volume * 100) + '%';
}

/* ==========================================================================
   STATUS badge + LCD live/ready
   ========================================================================== */
function setStatus(s) {
  const n = challenge ? challenge.answer.length : 0;
  const map = {
    idle:       ['#5A6068', 'none',            '#B3B9C1', 'Awaiting answer',          'rgba(255,255,255,.04)', 'var(--edge)'],
    incomplete: ['#E8B54D', '0 0 6px #E8B54D', '#E8C97D', `Enter all ${n} numbers`,   'rgba(232,181,77,.12)',  'rgba(232,181,77,.35)'],
    fail:       ['#E85D5D', '0 0 8px #E85D5D', '#E8A0A0', 'Mismatch · Try again',     'rgba(232,93,93,.12)',   'rgba(232,93,93,.4)'],
    pass:       ['#2AD4C8', '0 0 8px #2AD4C8', '#2AD4C8', 'Verified · Human',         'var(--accent-tint)',    'var(--accent-line)'],
  };
  const [dot, glow, col, label, bg, border] = map[s] || map.idle;
  const badge = document.getElementById('badge');
  badge.style.background = bg;
  badge.style.borderColor = border;
  badge.querySelector('.dot').style.background = dot;
  badge.querySelector('.dot').style.boxShadow = glow;
  const lbl = document.getElementById('badge-label');
  lbl.textContent = label; lbl.style.color = col;
}

function setLcd(live) {
  const el = document.getElementById('lcd-status');
  el.style.color = live ? 'var(--accent)' : '#4a6b64';
  el.innerHTML = live
    ? '<span class="dot" style="background:var(--accent);box-shadow:0 0 8px var(--accent);animation:ferricPulse 1.2s infinite"></span>LIVE'
    : '<span class="dot" style="background:#25423c"></span>READY';
  // swap the big play-button glyph (▶ vs ❚❚)
  const btn = document.getElementById('btn-play');
  btn.innerHTML = live
    ? '<span style="display:flex;gap:6px"><span style="width:6px;height:23px;background:var(--accent-text);border-radius:1px"></span><span style="width:6px;height:23px;background:var(--accent-text);border-radius:1px"></span></span>'
    : '<svg width="24" height="26" viewBox="0 0 24 26" style="margin-left:3px"><polygon points="4,3 21,13 4,23" fill="var(--accent-text)"></polygon></svg>';
}
