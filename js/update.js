// Theos Seitenscheidel - Update-Hinweis im Hauptmenü: „Neues Update“, Knopf, Fortschritt. Die eigentliche Arbeit macht updater.js im Hauptprozess.
export function initUpdate($) {
  const u = window.updater; if (!u) return;
  const mb = (b) => Math.max(1, Math.round(b / 1048576));
  const show = (s) => {
    $('verTag').textContent = 'Version ' + s.current;
    const on = s.state !== 'idle'; $('upBanner').classList.toggle('hidden', !on); if (!on) return;
    const busy = s.state === 'downloading' || s.state === 'installing' || s.state === 'restart';
    $('upTitle').textContent = s.state === 'restart' ? 'Update installiert, das Spiel startet neu …' : s.state === 'installing' ? 'Update wird installiert …' : s.state === 'downloading' ? `Update ${s.version} wird geladen … ${Math.round(s.progress * 100)} %` : s.state === 'error' ? 'Update hat nicht geklappt' : `Neues Update: Version ${s.version}`;
    $('upNotes').textContent = s.state === 'error' ? s.error : s.state === 'available' ? (s.notes || `Download: ${mb(s.size)} MB`) : ''; $('upBar').parentElement.classList.toggle('hidden', !busy); $('upBar').style.width = Math.round(s.progress * 100) + '%';
    $('upGo').classList.toggle('hidden', busy); $('upGo').textContent = s.state === 'error' ? 'Nochmal versuchen' : 'Update installieren';
  };
  $('upGo').onclick = () => u.install(); u.onState(show); u.get().then(show); u.ready();
}
