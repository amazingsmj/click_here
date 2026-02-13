const audioEl = document.getElementById('bg-music');
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const musicToggle = document.getElementById('music-toggle');
const gratitudeBtn = document.getElementById('gratitude-btn');
const hiddenMessage = document.getElementById('hidden-message');

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// --- GÉOMÉTRIE DU CŒUR ---
function heartPoint(t, scale) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: x * scale, y: -y * scale };
}

function generateHeartTargets(count, heartbeatScale = 1) {
  const targets = [];
  const baseScale = Math.min(innerWidth, innerHeight) / 48;
  const scale = baseScale * heartbeatScale;
  const heartCenterY = innerHeight * 0.5; // Centré
  for (let i = 0; i < count; i++) {
    const t = (Math.PI * 2) * (i / count);
    const p = heartPoint(t, scale);
    const jitter = (Math.random() - 0.5) * scale * 0.35;
    targets.push({ x: innerWidth / 2 + p.x + jitter, y: heartCenterY + p.y + jitter });
  }
  return targets;
}

// --- PARTICULES ---
const STAR_COUNT = 900;
const particles = [];
let targets = generateHeartTargets(700, 1);

function createParticle() {
  return {
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: (Math.random() - 0.5) * 0.2, // Movement lent initial
    vy: (Math.random() - 0.5) * 0.2,
    size: 1 + Math.random() * 2,
    hue: 200 + Math.random() * 60, // Bleu/Cyan au début
    alpha: 0.2 + Math.random() * 0.8,
    targetIndex: Math.floor(Math.random() * targets.length)
  };
}

for (let i = 0; i < STAR_COUNT; i++) particles.push(createParticle());

// --- ÉTOILES FILANTES ---
const shootingStars = [];

function createShootingStar() {
  return {
    x: Math.random() * innerWidth,
    y: -10 - Math.random() * 50,
    speed: 200 + Math.random() * 300,
    length: 30 + Math.random() * 60,
    size: 1 + Math.random() * 2,
    alpha: 0.6 + Math.random() * 0.4,
    hue: 200 + Math.random() * 60
  };
}

function spawnShootingStar() {
  if (Math.random() < 0.05) { // Moins fréquent
    shootingStars.push(createShootingStar());
  }
}

// --- ANIMATION ---
let stage = 0; // 0=errance, 1=formation coeur
let lastTime = performance.now();
let animationStartTime = performance.now();

function getHeartbeatScale(now) {
  if (stage < 2) return 1;
  const elapsed = (now - animationStartTime) / 1000;
  const beatCycle = (elapsed % 1.2) / 1.2;
  const pulse = Math.sin(beatCycle * Math.PI * 2);
  return 1.0 + (pulse * 0.08 * (pulse > 0 ? 1 : 0.5));
}

function animate(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  if (stage >= 2) {
    const heartbeatScale = getHeartbeatScale(now);
    targets = generateHeartTargets(700, heartbeatScale);
  }

  // --- Shooting Stars ---
  spawnShootingStar();
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const star = shootingStars[i];
    star.y += star.speed * dt;
    if (star.y > innerHeight + 50) {
      shootingStars.splice(i, 1);
      continue;
    }
    ctx.save();
    const gradient = ctx.createLinearGradient(star.x, star.y - star.length, star.x, star.y);
    gradient.addColorStop(0, `hsla(${star.hue}, 100%, 80%, 0)`);
    gradient.addColorStop(1, `hsla(${star.hue}, 100%, 70%, ${star.alpha})`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = star.size;
    ctx.beginPath();
    ctx.moveTo(star.x, star.y - star.length);
    ctx.lineTo(star.x, star.y);
    ctx.stroke();
    ctx.restore();
  }

  // --- Particles ---
  const pull = stage === 0 ? 0 : 1.5; // Pas d'attraction au début
  const damping = 0.90;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    if (stage === 1) { // Transition vers le coeur - changement de couleur
      p.hue = p.hue * 0.95 + 320 * 0.05; // Vers le rose
    }

    if (stage >= 1) {
      const t = targets[p.targetIndex];
      if (t) {
        const dx = t.x - p.x;
        const dy = t.y - p.y;
        p.vx += dx * pull * dt;
        p.vy += dy * pull * dt;
      }
    } else {
      // Mouvement errant naturel
      p.vx += (Math.random() - 0.5) * 10 * dt;
      p.vy += (Math.random() - 0.5) * 10 * dt;
      // Bordures
      if (p.x < 0) p.vx += 1;
      if (p.x > innerWidth) p.vx -= 1;
      if (p.y < 0) p.vy += 1;
      if (p.y > innerHeight) p.vy -= 1;
    }

    p.vx *= damping;
    p.vy *= damping;
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;

    ctx.beginPath();
    const color = `hsla(${p.hue}, 90%, 65%, ${p.alpha})`;
    ctx.fillStyle = color;
    ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, 0.55)`;
    ctx.shadowBlur = stage >= 1 ? 12 : 0; // Glow seulement quand coeur
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);


// --- LOGIQUE D'INTERACTION ---

// 1. Auto-Scroll & "Lyrics Style" Highlight
const contentContainer = document.querySelector('.content');
const verses = document.querySelectorAll('.verse');
let scrollSpeed = 0.5; // Vitesse douce
let isAutoScrolling = false;
let scrollTimeout;
let requestID;

function getCenterY() {
  return window.innerHeight / 2;
}

function updateLyricsHighlight() {
  const center = getCenterY();

  verses.forEach(verse => {
    const rect = verse.getBoundingClientRect();
    const verseCenter = rect.top + rect.height / 2;
    const dist = Math.abs(center - verseCenter);

    // Focus sur la ligne centrale
    if (dist < 80) {
      verse.style.opacity = '1';
      verse.style.transform = 'scale(1.1)';
      verse.style.filter = 'blur(0px)';
    } else {
      verse.style.opacity = '0.2';
      verse.style.transform = 'scale(1)';
      verse.style.filter = 'blur(2px)';
    }
  });
}

function autoScroll() {
  if (!isAutoScrolling) return;

  const btnRect = gratitudeBtn.getBoundingClientRect();
  if (btnRect.top < getCenterY() + 50) {
    isAutoScrolling = false;
    gratitudeBtn.classList.add('pulse');
    return;
  }

  contentContainer.scrollTop += scrollSpeed;
  updateLyricsHighlight();
  requestID = requestAnimationFrame(autoScroll);
}

// Initialisation
verses.forEach(v => {
  v.style.transition = "opacity 0.8s ease, transform 0.8s ease, filter 0.8s ease";
  v.style.opacity = "0.2";
});

function startAutoScroll() {
  if (isAutoScrolling) return;
  isAutoScrolling = true;
  requestAnimationFrame(autoScroll);
}

// 2. interaction "Merci"
gratitudeBtn.addEventListener('click', () => {
  stage = 1;
  setTimeout(() => stage = 2, 2000);
  gratitudeBtn.style.opacity = '0';
  gratitudeBtn.style.pointerEvents = 'none';
  hiddenMessage.classList.add('show');

  setTimeout(() => {
    contentContainer.scrollTo({ top: contentContainer.scrollHeight, behavior: 'smooth' });
  }, 500);
});


// 3. Musique & Déclenchement automatique
let isPlaying = false;

function toggleMusic() {
  if (isPlaying) {
    audioEl.pause();
    musicToggle.classList.remove('playing');
    musicToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
    isAutoScrolling = false;
    cancelAnimationFrame(requestID);
  } else {
    audioEl.play().catch(() => { });
    musicToggle.classList.add('playing');
    musicToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
    startAutoScroll();
  }
  isPlaying = !isPlaying;
}

musicToggle.addEventListener('click', toggleMusic);

// Démarrer dès la première interaction
window.addEventListener('click', () => {
  if (!isPlaying) toggleMusic();
}, { once: true });

// Gestion pauses manuelles
contentContainer.addEventListener('wheel', () => {
  isAutoScrolling = false;
  cancelAnimationFrame(requestID);
  updateLyricsHighlight();
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(startAutoScroll, 3000); // Reprise après 3s
});
contentContainer.addEventListener('touchstart', () => {
  isAutoScrolling = false;
  cancelAnimationFrame(requestID);
});
contentContainer.addEventListener('touchend', () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(startAutoScroll, 3000);
});

