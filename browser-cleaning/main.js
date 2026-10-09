// Utility: write to demo log
const out = document.getElementById('demoOut');
function log(msg) {
    const time = new Date().toLocaleTimeString();
    out.textContent += `[${time}] ${msg}\n`;
    out.scrollTop = out.scrollHeight;
}

// Demo buttons
const btnSave = document.getElementById('btnSave');
const btnShow = document.getElementById('btnShow');
const btnClearLocal = document.getElementById('btnClearLocal');
const btnClearSession = document.getElementById('btnClearSession');
const btnClearCache = document.getElementById('btnClearCache');

btnSave?.addEventListener('click', () => {
    localStorage.setItem('demo:key', 'Wert-' + Math.random().toString(36).slice(2, 7));
    sessionStorage.setItem('demo:sess', Date.now().toString());
    log('Testeinträge in localStorage und sessionStorage gespeichert.');
});

btnShow?.addEventListener('click', () => {
    const ls = localStorage.getItem('demo:key');
    const ss = sessionStorage.getItem('demo:sess');
    log('localStorage demo:key = ' + JSON.stringify(ls));
    log('sessionStorage demo:sess = ' + JSON.stringify(ss));
});

btnClearLocal?.addEventListener('click', () => {
    try {
        localStorage.clear();
        log('localStorage geleert.');
    } catch (e) { log('Fehler beim Leeren von localStorage: ' + e); }
});

btnClearSession?.addEventListener('click', () => {
    try {
        sessionStorage.clear();
        log('sessionStorage geleert.');
    } catch (e) { log('Fehler beim Leeren von sessionStorage: ' + e); }
});

btnClearCache?.addEventListener('click', async () => {
    if (!('caches' in window)) { log('Caches API nicht verfügbar.'); return; }
    try {
        const names = await caches.keys();
        for (const n of names) await caches.delete(n);
        log('Caches API geleert: ' + (names.length ? names.join(', ') : 'keine Einträge'));
    } catch (e) { log('Fehler beim Leeren der Caches API: ' + e); }
});

// Nice: remember accordion state per session
document.querySelectorAll('details').forEach((det, i) => {
    const key = 'ui:det-' + i;
    const saved = sessionStorage.getItem(key);
    if (saved === '1') det.open = true;
    det.addEventListener('toggle', () => {
        sessionStorage.setItem(key, det.open ? '1' : '0');
    });
});