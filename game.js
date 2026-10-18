// Unicorn in the Clouds: fly up and down, collect stars, avoid storm clouds.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const H = 600;          // virtual height; width follows the screen's aspect ratio
let W = 1000, scale = 1;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  scale = canvas.height / H;
  W = canvas.width / scale;
}
addEventListener('resize', resize);
resize();

// ---- Input ----
const keys = {};
let pointerY = null;
addEventListener('keydown', e => {
  keys[e.key] = true;
  if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  if (e.key === ' ' || e.key === 'Enter') startOrRestart();
});
addEventListener('keyup', e => { keys[e.key] = false; });
canvas.addEventListener('pointerdown', e => { pointerY = toGameY(e); startOrRestart(); });
canvas.addEventListener('pointermove', e => { if (pointerY !== null) pointerY = toGameY(e); });
addEventListener('pointerup', () => { pointerY = null; });
function toGameY(e) { return e.clientY * (window.devicePixelRatio || 1) / scale; }

// ---- State ----
let state = 'title';   // title | playing | over
let unicorn, clouds, stars, storms, sparkles, score, best, speed, time;
best = Number(localStorage.getItem('unicornBest') || 0);

function reset() {
  unicorn = { x: 160, y: H / 2, vy: 0 };
  stars = []; storms = []; sparkles = [];
  score = 0; speed = 260; time = 0;
}

function startOrRestart() {
  if (state !== 'playing') { reset(); state = 'playing'; }
}

// Background clouds in three parallax layers
clouds = [];
for (let i = 0; i < 18; i++) clouds.push(makeCloud(Math.random() * 2000, i % 3));
function makeCloud(x, layer) {
  return { x, y: Math.random() * H, layer, size: 40 + Math.random() * 50 + layer * 20 };
}
reset();

// ---- Update ----
function update(dt) {
  time += dt;
  const layerSpeed = [0.25, 0.5, 0.8];
  const bgSpeed = state === 'playing' ? speed : 120;
  for (const c of clouds) {
    c.x -= bgSpeed * layerSpeed[c.layer] * dt;
    if (c.x < -c.size * 3) Object.assign(c, makeCloud(W + Math.random() * 300, c.layer));
  }

  for (const s of sparkles) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
  sparkles = sparkles.filter(s => s.life > 0);

  if (state !== 'playing') return;

  speed += 6 * dt; // slowly gets faster

  // Movement: keyboard or follow the finger/mouse
  let target = 0;
  if (keys['ArrowUp'] || keys['w'] || keys['W']) target = -1;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) target = 1;
  if (pointerY !== null) target = Math.max(-1, Math.min(1, (pointerY - unicorn.y) / 60));
  unicorn.vy += (target * 380 - unicorn.vy) * Math.min(1, dt * 8);
  unicorn.y = Math.max(75, Math.min(H - 40, unicorn.y + unicorn.vy * dt));

  // Rainbow trail
  sparkles.push({ x: unicorn.x - 40, y: unicorn.y + 8, vx: -speed * 0.6, vy: 0, life: 0.6, hue: (time * 300) % 360, r: 7 });

  // Spawn stars and storm clouds
  if (Math.random() < dt * 1.6) stars.push({ x: W + 30, y: 50 + Math.random() * (H - 100) });
  if (Math.random() < dt * (0.6 + time / 60)) storms.push({ x: W + 80, y: 60 + Math.random() * (H - 120), size: 45 + Math.random() * 25 });

  for (const s of stars) s.x -= speed * dt;
  for (const s of storms) s.x -= speed * 1.1 * dt;

  // Collisions
  for (const s of stars) {
    if (!s.taken && dist(s, unicorn) < 45) {
      s.taken = true; score += 10;
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        sparkles.push({ x: s.x, y: s.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, hue: 50, r: 4 });
      }
    }
  }
  for (const s of storms) {
    if (dist(s, unicorn) < s.size * 0.75 + 15) gameOver();
  }

  stars = stars.filter(s => s.x > -40 && !s.taken);
  storms = storms.filter(s => s.x > -120);
  score += dt * 2;
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function gameOver() {
  state = 'over';
  if (score > best) { best = Math.floor(score); localStorage.setItem('unicornBest', best); }
}

// ---- Drawing ----
function drawCloud(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
  ctx.arc(x + size * 0.6, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
  ctx.arc(x + size * 1.3, y, size * 0.55, 0, Math.PI * 2);
  ctx.arc(x + size * 0.6, y + size * 0.2, size * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(x, y, r) {
  ctx.fillStyle = '#ffd93b';
  ctx.strokeStyle = '#f0a500';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawStorm(s) {
  drawCloud(s.x - s.size * 0.65, s.y, s.size, '#5b5f73');
  // lightning bolt
  if (Math.floor(time * 6 + s.y) % 4 === 0) {
    ctx.strokeStyle = '#ffe96b'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y + s.size * 0.5);
    ctx.lineTo(s.x - 10, s.y + s.size * 0.9);
    ctx.lineTo(s.x + 6, s.y + s.size * 0.9);
    ctx.lineTo(s.x - 6, s.y + s.size * 1.3);
    ctx.stroke();
  }
}

function drawUnicorn(u) {
  ctx.save();
  ctx.translate(u.x, u.y);
  ctx.rotate(Math.max(-0.35, Math.min(0.35, u.vy / 1000)));
  const flap = Math.sin(time * 14);

  // back wing
  ctx.fillStyle = '#e8d9ff';
  ctx.beginPath(); ctx.ellipse(-5, -15 - flap * 6, 28, 12, -0.6 - flap * 0.4, 0, Math.PI * 2); ctx.fill();
  // legs
  ctx.strokeStyle = '#f2e6f7'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (const lx of [-22, -10, 14, 24]) {
    ctx.beginPath(); ctx.moveTo(lx, 10); ctx.lineTo(lx - 6, 30 + Math.sin(time * 10 + lx) * 3); ctx.stroke();
  }
  // tail
  const tailColors = ['#ff6b9d', '#ffb347', '#7ee081', '#6bc5ff', '#b48cff'];
  tailColors.forEach((c, i) => {
    ctx.strokeStyle = c; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-34, -4 + i * 2);
    ctx.quadraticCurveTo(-55, -10 + i * 5 + flap * 4, -62, 8 + i * 4); ctx.stroke();
  });
  // body
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(0, 0, 38, 20, 0, 0, Math.PI * 2); ctx.fill();
  // neck and head
  ctx.beginPath(); ctx.ellipse(32, -18, 12, 20, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(46, -32, 18, 11, 0.3, 0, Math.PI * 2); ctx.fill();
  // mane
  tailColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(28 - i * 3, -38 + i * 6, 6, 0, Math.PI * 2); ctx.fill();
  });
  // horn
  ctx.fillStyle = '#ffd93b';
  ctx.beginPath(); ctx.moveTo(44, -42); ctx.lineTo(62, -64); ctx.lineTo(52, -38); ctx.closePath(); ctx.fill();
  // eye and cheek
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(50, -34, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffb3c8';
  ctx.beginPath(); ctx.arc(56, -27, 3.5, 0, Math.PI * 2); ctx.fill();
  // front wing
  ctx.fillStyle = '#f4ecff';
  ctx.beginPath(); ctx.ellipse(-2, -18 + flap * 4, 30, 13, -0.4 + flap * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function text(str, x, y, size, align = 'center') {
  ctx.font = `bold ${size}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = align;
  ctx.lineWidth = size / 6; ctx.strokeStyle = '#6a4c93';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = '#fff';
  ctx.fillText(str, x, y);
}

function draw() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#6ab7ec'); sky.addColorStop(1, '#ffd6ec');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  const layerColor = ['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.95)'];
  for (const c of clouds) if (c.layer < 2) drawCloud(c.x, c.y, c.size, layerColor[c.layer]);

  for (const s of sparkles) {
    ctx.fillStyle = `hsla(${s.hue}, 90%, 70%, ${s.life * 1.6})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  for (const s of stars) drawStar(s.x, s.y, 16 + Math.sin(time * 6 + s.y) * 2);
  for (const s of storms) drawStorm(s);
  drawUnicorn(unicorn);
  for (const c of clouds) if (c.layer === 2) drawCloud(c.x, c.y, c.size, layerColor[2]);

  if (state === 'playing') {
    text(`Score ${Math.floor(score)}`, W - 20, 44, 30, "right");
  } else if (state === 'title') {
    text('Unicorn in the Clouds', W / 2, H / 2 - 60, 54);
    text('Up/Down or W/S to fly, or drag on the screen', W / 2, H / 2, 24);
    text('Catch stars, dodge storm clouds', W / 2, H / 2 + 36, 24);
    text('Press Space or tap to start', W / 2, H / 2 + 96, 30);
  } else {
    text('Oh no, a storm!', W / 2, H / 2 - 50, 54);
    text(`Score ${Math.floor(score)}   Best ${best}`, W / 2, H / 2 + 10, 32);
    text('Press Space or tap to fly again', W / 2, H / 2 + 70, 28);
  }
}

// ---- Loop ----
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
