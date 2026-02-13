const audioEl = document.getElementById('bg-music');
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// --- GÉOMÉTRIE DU CŒUR ---
// Courbe paramétrique cœur lissée
function heartPoint(t, scale) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: x * scale, y: -y * scale };
}

// Génère des points cibles le long de la courbe cœur
function generateHeartTargets(count, heartbeatScale = 1) {
  const targets = [];
  const baseScale = Math.min(innerWidth, innerHeight) / 48; // adapte au viewport
  const scale = baseScale * heartbeatScale; // Applique la pulsation
  // Position du cœur plus bas : environ 60% de la hauteur pour être sous les textes
  const heartCenterY = innerHeight * 0.6;
  for (let i = 0; i < count; i++) {
    const t = (Math.PI * 2) * (i / count);
    const p = heartPoint(t, scale);
    // légère dispersion pour bord épais
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
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * Math.min(innerWidth, innerHeight) * 0.45;
  const heartCenterY = innerHeight * 0.6; // Même position que le cœur
  const cx = innerWidth / 2 + Math.cos(angle) * radius * 0.2;
  const cy = heartCenterY + Math.sin(angle) * radius * 0.2;
  return {
    x: cx + (Math.random() - 0.5) * 200,
    y: cy + (Math.random() - 0.5) * 200,
    vx: 0,
    vy: 0,
    size: 1 + Math.random() * 2,
    hue: 300 + Math.random() * 40, // rose/violet
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
    y: -10 - Math.random() * 50, // commence au-dessus de l'écran
    speed: 200 + Math.random() * 300, // vitesse variable
    length: 30 + Math.random() * 60, // longueur de la traînée
    size: 1 + Math.random() * 2,
    alpha: 0.6 + Math.random() * 0.4,
    hue: 200 + Math.random() * 60 // bleu/cyan pour contraste avec le cœur rose
  };
}

function spawnShootingStar() {
  if (Math.random() < 0.15) { // 15% de chance par frame (~2-3 par seconde)
    shootingStars.push(createShootingStar());
  }
}

// --- MESSAGES TEXTE DÉFILANTS ---
const scrollingMessages = [
  { text: "Tu brilles intensément dans mon ciel", color: "hsla(200, 90%, 75%, 0.9)" }, // bleu clair
  { text: "Tu es l'étoile la plus brillante", color: "hsla(320, 80%, 75%, 0.9)" }, // rose clair
  { text: "Je brille grâce à toi", color: "hsla(330, 90%, 80%, 0.9)" }, // rose vif
  { text: "Tu brilles intensément dans mon ciel", color: "hsla(195, 90%, 70%, 0.9)" }, // bleu clair variant
  { text: "Tu es l'étoile la plus brillante", color: "hsla(315, 85%, 78%, 0.9)" } // rose clair variant
];

const activeScrollingTexts = [];

function spawnScrollingText() {
  if (Math.random() < 0.03) { // 3% de chance par frame
    const msg = scrollingMessages[Math.floor(Math.random() * scrollingMessages.length)];
    // Position X aléatoire, commence en haut
    let x;
    // Évite le centre (où sont les textes principaux)
    if (Math.random() < 0.3) { // 30% à gauche
      x = 30 + Math.random() * (innerWidth * 0.25);
    } else if (Math.random() < 0.6) { // 30% à droite
      x = innerWidth * 0.75 + Math.random() * (innerWidth * 0.25 - 30);
    } else { // 40% au milieu mais avec variation
      x = innerWidth * 0.3 + Math.random() * (innerWidth * 0.4);
    }

    activeScrollingTexts.push({
      text: msg.text,
      color: msg.color,
      x: x,
      y: -30, // commence en haut
      speed: 25 + Math.random() * 35,
      size: 14 + Math.random() * 8,
      alpha: 0.9,
      direction: 1 // toujours vers le bas
    });
  }
}

// --- ANIMATION ---
let stage = 0; // 0=amas, 1=transition, 2=coeur stabilisé
let lastTime = performance.now();
let animationStartTime = performance.now();

// Fonction pour calculer le facteur de pulsation du cœur
function getHeartbeatScale(now) {
  if (stage < 2) return 1; // Pas de pulsation avant que le cœur soit stabilisé
  const elapsed = (now - animationStartTime) / 1000; // temps en secondes
  // Battement toutes les ~1.2 secondes (rythme cardiaque)
  const beatCycle = (elapsed % 1.2) / 1.2;
  // Courbe d'ease-in-out pour un battement naturel
  const pulse = Math.sin(beatCycle * Math.PI * 2);
  // Pulsation de 1.0 à 1.08 (8% de variation)
  return 1.0 + (pulse * 0.08 * (pulse > 0 ? 1 : 0.5)); // Plus rapide à l'expansion, plus lent à la contraction
}

function animate(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  // Calcul du facteur de pulsation du cœur
  const heartbeatScale = getHeartbeatScale(now);

  // Régénère les targets avec la pulsation si le cœur est stabilisé
  if (stage >= 2) {
    targets = generateHeartTargets(700, heartbeatScale);
  }

  // fond léger halo violet (centré sur le cœur)
  const heartCenterY = innerHeight * 0.6;
  const g = ctx.createRadialGradient(innerWidth / 2, heartCenterY, 0, innerWidth / 2, heartCenterY, Math.max(innerWidth, innerHeight) * 0.6);
  g.addColorStop(0, 'rgba(140, 90, 220, 0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  // --- ÉTOILES FILANTES ---
  spawnShootingStar();
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const star = shootingStars[i];
    star.y += star.speed * dt;

    // Supprime les étoiles qui sont sorties de l'écran
    if (star.y > innerHeight + 50) {
      shootingStars.splice(i, 1);
      continue;
    }

    // Dessin de la traînée
    ctx.save();
    const gradient = ctx.createLinearGradient(star.x, star.y - star.length, star.x, star.y);
    gradient.addColorStop(0, `hsla(${star.hue}, 100%, 80%, 0)`);
    gradient.addColorStop(0.5, `hsla(${star.hue}, 100%, 75%, ${star.alpha * 0.5})`);
    gradient.addColorStop(1, `hsla(${star.hue}, 100%, 70%, ${star.alpha})`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = star.size;
    ctx.shadowColor = `hsla(${star.hue}, 100%, 70%, 0.8)`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(star.x, star.y - star.length);
    ctx.lineTo(star.x, star.y);
    ctx.stroke();

    // Point lumineux à la tête
    ctx.beginPath();
    ctx.fillStyle = `hsla(${star.hue}, 100%, 80%, ${star.alpha})`;
    ctx.shadowColor = `hsla(${star.hue}, 100%, 70%, 1)`;
    ctx.shadowBlur = 12;
    ctx.arc(star.x, star.y, star.size * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // --- MESSAGES TEXTE DÉFILANTS ---
  spawnScrollingText();
  for (let i = activeScrollingTexts.length - 1; i >= 0; i--) {
    const txt = activeScrollingTexts[i];
    txt.y += txt.speed * dt * txt.direction;

    // Supprime les textes qui sont sortis de l'écran
    if (txt.y < -50 || txt.y > innerHeight + 50) {
      activeScrollingTexts.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = txt.alpha;
    ctx.font = `${txt.size}px "Pacifico", cursive`;
    ctx.fillStyle = txt.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = txt.color;
    ctx.shadowBlur = 20;
    ctx.fillText(txt.text, txt.x, txt.y);
    ctx.restore();
  }

  const pull = stage === 0 ? 0.35 : 1.25; // accélère vers la forme
  const damping = 0.85;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const t = targets[p.targetIndex];
    if (!t) continue;

    const dx = t.x - p.x;
    const dy = t.y - p.y;
    p.vx += dx * pull * dt;
    p.vy += dy * pull * dt;

    // agitation subtile
    p.vx += (Math.random() - 0.5) * 10 * dt;
    p.vy += (Math.random() - 0.5) * 10 * dt;

    p.vx *= damping;
    p.vy *= damping;
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;

    // dessin glow
    ctx.beginPath();
    const color = `hsla(${p.hue}, 90%, 65%, ${p.alpha})`;
    ctx.fillStyle = color;
    ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, 0.55)`;
    ctx.shadowBlur = 12;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Texte au centre du cœur (seulement quand le cœur est formé)
  if (stage >= 1) {
    const heartCenterY = innerHeight * 0.6;
    const scale = Math.min(innerWidth, innerHeight) / 48;
    // Largeur approximative du cœur (basée sur la courbe paramétrique)
    const heartWidth = scale * 32; // ~16 * 2 pour la largeur du cœur

    const heartText = "Je t'aime... Peu importe dans quel univers je suis, je continue de t'aimer.";
    const maxWidth = heartWidth * 0.8; // 80% de la largeur du cœur pour laisser des marges

    ctx.save();
    ctx.font = `"Pacifico", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 200, 255, 0.95)';
    ctx.shadowColor = 'rgba(255, 150, 255, 1)';
    ctx.shadowBlur = 20;

    // Ajuster la taille du texte pour qu'il tienne dans le cœur
    let fontSize = Math.min(innerWidth, innerHeight) * 0.042; // taille de base augmentée encore
    ctx.font = `${fontSize}px "Pacifico", cursive`;

    // Vérifier si le texte dépasse et ajuster si nécessaire
    let metrics = ctx.measureText(heartText);
    while (metrics.width > maxWidth && fontSize > 12) {
      fontSize -= 1;
      ctx.font = `${fontSize}px "Pacifico", cursive`;
      metrics = ctx.measureText(heartText);
    }

    // Diviser le texte en plusieurs lignes si nécessaire
    const words = heartText.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      const testMetrics = ctx.measureText(testLine);
      if (testMetrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    // Dessiner le texte centré dans le cœur
    const lineHeight = fontSize * 1.4;
    const totalHeight = lines.length * lineHeight;
    const startY = heartCenterY - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, index) => {
      ctx.fillText(line, innerWidth / 2, startY + index * lineHeight);
    });

    ctx.restore();
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Transition de scènes + textes
function sequenceTexts() {
  const root = document.querySelector('.content');
  if (!root) return;
  setTimeout(() => { stage = 1; root.classList.add('show-2'); }, 1200);
  setTimeout(() => { stage = 2; }, 2400);
}

// Lecture automatique de la musique
let musicStarted = false;

function startMusic() {
  if (!audioEl || musicStarted) return;
  try {
    audioEl.volume = 0.5; // Volume à 50%
    const playPromise = audioEl.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          musicStarted = true;
        })
        .catch(() => {
          // Autoplay bloqué, on attend une interaction
        });
    }
  } catch (err) {
    // Erreur silencieuse
  }
}

// Essayer de démarrer dès que possible
function tryStartMusic() {
  if (audioEl.readyState >= 2) { // HAVE_CURRENT_DATA ou plus
    startMusic();
  } else {
    audioEl.addEventListener('canplay', startMusic, { once: true });
  }
}

// Capturer tous les types d'interactions possibles
const interactionEvents = ['click', 'touchstart', 'mousedown', 'keydown', 'mousemove', 'touchmove'];
function setupInteractionListeners() {
  const startOnInteraction = () => {
    if (!musicStarted) {
      startMusic();
    }
  };

  interactionEvents.forEach(event => {
    document.addEventListener(event, startOnInteraction, { once: true, passive: true });
  });
}

// Démarrage immédiat et au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    tryStartMusic();
    setupInteractionListeners();
  });
} else {
  tryStartMusic();
  setupInteractionListeners();
}

window.addEventListener('load', () => {
  tryStartMusic();
  sequenceTexts();
});
