// Theos Seitenscheidel - Ludwig Zigaretti: Geburtstagskarte für Ludwig (Lennox, 2026-11-21: Geburtstag am Sonntag, 22.11.2026).
// Erscheint einmal pro PC beim ersten Öffnen von Ludwig Zigaretti über der Startkarte, mit Konfetti. Danach merkt sich das Spiel, dass sie gesehen wurde.
const KEY = 'lwGeburtstag2026';
const COLORS = ['#ffcf5a', '#ff7a1a', '#8dffb8', '#7ab8ff', '#ff6aa8', '#f3ead8'];

export function createBirthdayCard({ root, store, snd }) {
  const over = document.createElement('div'); over.className = 'cs-over lw-bday hidden';
  over.innerHTML = '<div class="lw-card lw-bdaycard"><div class="lw-bdaycake">🎂</div><small>22. November 2026</small><h2>Alles Gute zum Geburtstag, Ludwig!</h2>'
    + '<p>Das hier ist dein Spiel: <b>Ludwig Zigaretti</b>. Dreh Kippen, verkauf sie durchs Fenster, bau den Bunker aus und werd Zigarettenboss.</p>'
    + '<p>Aber lass dich bloß nicht von Mama erwischen.</p><p class="lw-bdayfrom">Von Lennox</p><button type="button" class="primary lw-bdaygo">Los geht\'s!</button></div><div class="lw-confetti"></div>';
  root.append(over); const conf = over.querySelector('.lw-confetti'); let timer = 0;
  function burst() {
    conf.textContent = '';
    for (let i = 0; i < 90; i++) { const p = document.createElement('i'); p.style.left = `${Math.random() * 100}%`; p.style.background = COLORS[i % COLORS.length]; p.style.animationDelay = `${(Math.random() * 1.6).toFixed(2)}s`; p.style.animationDuration = `${(2.6 + Math.random() * 2.2).toFixed(2)}s`; p.style.setProperty('--drift', `${Math.round((Math.random() - 0.5) * 160)}px`); p.style.setProperty('--spin', `${Math.round(360 + Math.random() * 720)}deg`); if (i % 3 === 0) p.classList.add('round'); conf.append(p); }
  }
  function show() { over.classList.remove('hidden'); burst(); clearInterval(timer); timer = setInterval(burst, 5200); if (snd && snd.skill) snd.skill(true); }
  function hide() { over.classList.add('hidden'); clearInterval(timer); conf.textContent = ''; try { store.set(KEY, true); } catch (e) { /* egal */ } }
  over.querySelector('.lw-bdaygo').onclick = () => { hide(); if (snd && snd.ui) snd.ui(); };
  return { el: over, show, hide, get open() { return !over.classList.contains('hidden'); }, first() { let seen = false; try { seen = !!store.get(KEY, false); } catch (e) { seen = false; } if (!seen) show(); return !seen; } };
}
