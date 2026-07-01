/* ==========================================================================
   VERIFY  —  single string comparison
   --------------------------------------------------------------------------
   Per the brief this is intentionally client-side: join the digit boxes and
   compare to challenge.answer. Isolated in one function so a server-side
   check could drop in here later without touching the rest of the app.
   ========================================================================== */
function verifyChallenge() {
  const guess = boxes().map(b => b.value).join('');
  if (guess.length < challenge.answer.length) return setStatus('incomplete');
  setStatus(guess === challenge.answer ? 'pass' : 'fail');
}
