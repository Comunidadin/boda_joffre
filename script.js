// ============================================================
// J & E — Invitación de boda
// ============================================================

// ---- Cuenta regresiva ----
const WEDDING_DATE = new Date('2026-08-22T17:00:00-05:00').getTime();

const elDays    = document.querySelector('[data-unit="days"]');
const elHours   = document.querySelector('[data-unit="hours"]');
const elMinutes = document.querySelector('[data-unit="minutes"]');
const elSeconds = document.querySelector('[data-unit="seconds"]');

function pad(n) { return String(n).padStart(2, '0'); }

function updateCountdown() {
  const now = Date.now();
  const diff = WEDDING_DATE - now;

  if (diff <= 0) {
    elDays.textContent = elHours.textContent = elMinutes.textContent = elSeconds.textContent = '00';
    return;
  }

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  elDays.textContent    = pad(days);
  elHours.textContent   = pad(hours);
  elMinutes.textContent = pad(minutes);
  elSeconds.textContent = pad(seconds);
}

updateCountdown();
setInterval(updateCountdown, 1000);

// ---- Music player (sync floating button + vinyl card + progress) ----
const bgm = document.getElementById('bgm');
const musicBtn = document.getElementById('music-toggle');
const songBtn  = document.getElementById('song-play');
const songSection = songBtn ? songBtn.closest('.song') : null;
const progressBar = document.getElementById('song-progress');
const elCurrent = document.getElementById('song-current');
const elTotal   = document.getElementById('song-total');

const RING_CIRCUMFERENCE = 351.86; // 2 * π * r (r = 56)

bgm.volume = 0.45;

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function syncUI(isPlaying) {
  musicBtn.classList.toggle('is-playing', isPlaying);
  musicBtn.setAttribute('aria-label', isPlaying ? 'Pausar nuestra canción' : 'Reproducir nuestra canción');
  if (songSection) songSection.classList.toggle('is-playing', isPlaying);
  if (songBtn)     songBtn.setAttribute('aria-label', isPlaying ? 'Pausar nuestra canción' : 'Reproducir nuestra canción');
}

async function toggleMusic() {
  try {
    if (bgm.paused) await bgm.play();
    else bgm.pause();
  } catch (err) {
    console.warn('No se pudo reproducir el audio:', err);
  }
}

bgm.addEventListener('play',  () => syncUI(true));
bgm.addEventListener('pause', () => syncUI(false));
bgm.addEventListener('ended', () => syncUI(false));

bgm.addEventListener('loadedmetadata', () => {
  if (elTotal) elTotal.textContent = formatTime(bgm.duration);
});

bgm.addEventListener('timeupdate', () => {
  if (elCurrent) elCurrent.textContent = formatTime(bgm.currentTime);
  if (progressBar && bgm.duration) {
    const pct = bgm.currentTime / bgm.duration;
    progressBar.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - pct);
  }
});

musicBtn.addEventListener('click', toggleMusic);
if (songBtn) songBtn.addEventListener('click', toggleMusic);

// Show hint tooltip briefly on first load
window.addEventListener('load', () => {
  setTimeout(() => musicBtn.classList.add('show-hint'), 1500);
  setTimeout(() => musicBtn.classList.remove('show-hint'), 5000);
});

// ---- RSVP form → Google Sheets ----
// Pega aquí tu URL de Apps Script (instrucciones al final del HTML).
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwBtEbGZVr49iadksPO3-TXku1KvUMttA7Cd8vbuxvbQOK648_kdSA-KPHpMd5okdvK4A/exec';

const form     = document.getElementById('rsvp-form');
const submitBtn= document.getElementById('rsvp-submit');
const success  = document.getElementById('rsvp-success');
const errorMsg = document.getElementById('rsvp-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.hidden = true;

  const data = Object.fromEntries(new FormData(form).entries());
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  try {
    // text/plain evita preflight CORS — Apps Script puede leer el body igual.
    await fetch(RSVP_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
    });

    form.querySelectorAll('input, button').forEach(el => el.disabled = true);
    success.hidden = false;
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    console.error('Error enviando RSVP:', err);
    errorMsg.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirmar asistencia';
  }
});

// ---- Reveal on scroll ----
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('section').forEach(s => {
  s.classList.add('reveal');
  io.observe(s);
});
