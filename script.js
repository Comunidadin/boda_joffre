// ============================================================
// J & E — Invitación de boda
// ============================================================

// ---- Sobre intro (envelope) ----
(function envelopeIntro() {
  const stage    = document.getElementById('envelope-stage');
  const envelope = document.getElementById('envelope');
  const hint     = document.getElementById('envelope-hint');
  if (!stage || !envelope) return;

  let isOpened = false;

  // Try to start the background music. Done as part of the click handler so
  // it counts as a valid user gesture under the browser's autoplay policy.
  function startMusic() {
    const bgm = document.getElementById('bgm');
    if (bgm) bgm.play().catch(() => { /* blocked — user can press the floating button */ });
  }

  function cleanup() {
    document.body.classList.remove('envelope-locked');
    stage.remove();
  }

  async function openWithMotion() {
    const { animate } = window.Motion;

    // 1. Sello: pequeño "pop" y se quiebra hacia abajo
    animate(
      '.envelope__seal',
      { scale: [1, 1.12, 0.78], opacity: [1, 1, 0], y: [0, -4, 10] },
      { duration: 0.55, ease: 'easeIn' }
    );

    // 2. Solapa se abre con spring (con leve overshoot)
    await animate(
      '.envelope__flap',
      { rotateX: [0, -178] },
      { duration: 1.0, delay: 0.18, type: 'spring', bounce: 0.18 }
    ).finished;

    // 3. La carta sube como si la sacaras a mano (spring suave con un poco de inclinación)
    await animate(
      '.envelope__letter',
      { y: ['0%', '-110%'], rotate: [0, -0.6, 0.6, 0] },
      { duration: 1.15, type: 'spring', bounce: 0.22 }
    ).finished;

    // 4. Pequeña pausa para que se "lea" la carta
    await new Promise(r => setTimeout(r, 380));

    // 5. Fade del overlay y limpieza
    await animate(stage, { opacity: 0 }, { duration: 0.7, ease: 'easeOut' }).finished;
    cleanup();
  }

  function openWithCssFallback() {
    envelope.classList.add('is-opening');
    setTimeout(() => stage.classList.add('is-revealed'), 1700);
    setTimeout(cleanup, 2700);
  }

  function openEnvelope() {
    if (isOpened) return;
    isOpened = true;

    if (hint) hint.classList.add('is-hidden');
    startMusic();

    if (window.Motion && typeof window.Motion.animate === 'function') {
      openWithMotion().catch((err) => {
        console.warn('Motion falló, usando CSS:', err);
        openWithCssFallback();
      });
    } else {
      openWithCssFallback();
    }
  }

  // Listen on BOTH the button and the whole stage as a safety net
  envelope.addEventListener('click', openEnvelope);
  stage.addEventListener('click', openEnvelope);

  envelope.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openEnvelope();
    }
  });

  // Touch: ensure mobile taps fire immediately
  envelope.addEventListener('touchend', (e) => {
    e.preventDefault();
    openEnvelope();
  }, { passive: false });
})();

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

// ---- Gallery carousel dots (mobile) ----
const galleryGrid = document.querySelector('.gallery__grid');
const galleryDots = document.getElementById('gallery-dots');

if (galleryGrid && galleryDots) {
  const items = galleryGrid.querySelectorAll('.gallery__item');
  items.forEach(() => galleryDots.appendChild(document.createElement('span')));
  const dots = galleryDots.querySelectorAll('span');

  const updateActiveDot = () => {
    const scrollLeft = galleryGrid.scrollLeft;
    const slideWidth = galleryGrid.clientWidth * 0.86 + 12; // 86% + gap
    const index = Math.round(scrollLeft / slideWidth);
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === Math.min(index, items.length - 1)));
  };

  dots[0]?.classList.add('is-active');
  galleryGrid.addEventListener('scroll', () => requestAnimationFrame(updateActiveDot), { passive: true });
}

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
