const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const statusText = document.querySelector("#statusText");
const message = document.querySelector("#gameMessage");
const pauseButton = document.querySelector("#pauseButton");
const restartButton = document.querySelector("#restartButton");

const GRID = 24;
const CELL = canvas.width / GRID;
const SPEED = 108;
const ANIMAL_COUNT = 3;
const DIRECTIONS = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
};
const KEY_DIRECTIONS = { w: "up", a: "left", s: "down", d: "right" };
const ANIMAL_TYPES = ["rabbit", "mouse", "frog"];

let snake;
let animals;
let direction;
let nextDirection;
let score;
let best = Number(localStorage.getItem("snake-best") || 0);
let gameState = "ready";
let timer;
let tickCount = 0;

bestEl.textContent = formatScore(best);

function formatScore(value) { return String(value).padStart(3, "0"); }

function resetGame() {
  snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
  direction = { ...DIRECTIONS.right };
  nextDirection = { ...direction };
  score = 0;
  tickCount = 0;
  scoreEl.textContent = formatScore(score);
  animals = ANIMAL_TYPES.map((type, index) => createAnimal(type, index));
  gameState = "ready";
  clearInterval(timer);
  updateUi();
  draw();
}

function createAnimal(type, index) {
  const spot = placeAnimal();
  const angle = [0.6, 2.3, 4.7][index] || Math.random() * Math.PI * 2;
  return { type, x: spot.x + 0.5, y: spot.y + 0.5, vx: Math.cos(angle) * 0.11, vy: Math.sin(angle) * 0.11, fleeing: false };
}

function placeAnimal() {
  const openCells = [];
  for (let y = 2; y < GRID - 2; y += 1) {
    for (let x = 2; x < GRID - 2; x += 1) {
      const clearOfSnake = snake.every(segment => Math.abs(segment.x - x) + Math.abs(segment.y - y) > 4);
      const clearOfAnimals = !animals?.some(animal => Math.abs(animal.x - x) + Math.abs(animal.y - y) < 2);
      if (clearOfSnake && clearOfAnimals) openCells.push({ x, y });
    }
  }
  return openCells[Math.floor(Math.random() * openCells.length)] || { x: 4, y: 4 };
}

function startGame() {
  if (gameState === "running") return;
  if (gameState === "over") resetGame();
  gameState = "running";
  clearInterval(timer);
  timer = setInterval(tick, SPEED);
  updateUi();
}

function setDirection(name) {
  const candidate = DIRECTIONS[name];
  if (!candidate || (candidate.x === -direction.x && candidate.y === -direction.y)) return;
  nextDirection = { ...candidate };
  startGame();
}

function tick() {
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const hitWall = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID;
  const hitSelf = snake.some(segment => segment.x === head.x && segment.y === head.y);
  if (hitWall || hitSelf) return endGame();

  snake.unshift(head);
  updateAnimals();
  const caughtIndex = animals.findIndex(animal => Math.hypot(animal.x - head.x - 0.5, animal.y - head.y - 0.5) < 0.8);
  if (caughtIndex !== -1) {
    score += 10;
    best = Math.max(best, score);
    localStorage.setItem("snake-best", best);
    scoreEl.textContent = formatScore(score);
    bestEl.textContent = formatScore(best);
    animals.splice(caughtIndex, 1, createAnimal(ANIMAL_TYPES[(score / 10 + caughtIndex) % ANIMAL_TYPES.length], caughtIndex));
  } else {
    snake.pop();
  }
  tickCount += 1;
  draw();
}

function updateAnimals() {
  const head = snake[0];
  animals.forEach((animal, index) => {
    const dx = animal.x - (head.x + 0.5);
    const dy = animal.y - (head.y + 0.5);
    const distance = Math.hypot(dx, dy);
    animal.fleeing = distance < 6.25;

    if (animal.fleeing && distance > 0) {
      const fleeSpeed = animal.type === "frog" ? 0.16 : 0.13;
      animal.vx = (dx / distance) * fleeSpeed;
      animal.vy = (dy / distance) * fleeSpeed;
    } else if (tickCount % 18 === index * 5) {
      const angle = Math.atan2(animal.vy, animal.vx) + (Math.random() - 0.5) * 1.8;
      const wanderSpeed = animal.type === "frog" ? 0.1 : 0.075;
      animal.vx = Math.cos(angle) * wanderSpeed;
      animal.vy = Math.sin(angle) * wanderSpeed;
    }

    animal.x += animal.vx;
    animal.y += animal.vy;
    if (animal.x < 1.2 || animal.x > GRID - 1.2) animal.vx *= -1;
    if (animal.y < 1.2 || animal.y > GRID - 1.2) animal.vy *= -1;
    animal.x = Math.max(1.2, Math.min(GRID - 1.2, animal.x));
    animal.y = Math.max(1.2, Math.min(GRID - 1.2, animal.y));
  });
}

function endGame() {
  gameState = "over";
  clearInterval(timer);
  updateUi();
  draw();
}

function togglePause() {
  if (gameState === "ready" || gameState === "over") return;
  gameState = gameState === "paused" ? "running" : "paused";
  if (gameState === "paused") clearInterval(timer);
  else timer = setInterval(tick, SPEED);
  updateUi();
}

function updateUi() {
  const labels = { ready: "READY", running: "LIVE", paused: "PAUSED", over: "GAME OVER" };
  statusText.textContent = labels[gameState];
  pauseButton.textContent = gameState === "paused" ? "Resume" : "Pause";
  if (gameState === "ready") {
    message.innerHTML = '<p class="message-kicker">WILDLIFE AWAITS</p><h2>Start the chase<br />with WASD.</h2><p class="message-hint">The animals will run when you get close</p>';
    message.classList.remove("hidden");
  } else if (gameState === "paused") {
    message.innerHTML = '<p class="message-kicker">GAME PAUSED</p><h2>Take a breath.</h2><p class="message-hint">Press Resume or P to continue</p>';
    message.classList.remove("hidden");
  } else if (gameState === "over") {
    message.innerHTML = `<p class="message-kicker">RUN ENDED</p><h2>Score ${formatScore(score)}</h2><p class="message-hint">Press Restart to go again</p>`;
    message.classList.remove("hidden");
  } else {
    message.classList.add("hidden");
  }
}

function draw() {
  ctx.fillStyle = "#0d120f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#18221b";
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i += 1) {
    const point = i * CELL;
    ctx.beginPath(); ctx.moveTo(point, 0); ctx.lineTo(point, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, point); ctx.lineTo(canvas.width, point); ctx.stroke();
  }
  animals.forEach(drawAnimal);
  drawSnake();
}

function drawSnake() {
  snake.slice().reverse().forEach((segment, reverseIndex) => {
    const index = snake.length - 1 - reverseIndex;
    const centerX = segment.x * CELL + CELL / 2;
    const centerY = segment.y * CELL + CELL / 2;
    const radius = CELL * (index === 0 ? 0.48 : 0.43 - Math.min(index, 7) * 0.008);
    ctx.fillStyle = index === 0 ? "#365d2f" : index % 2 ? "#587d3b" : "#476d35";
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#789653";
    ctx.beginPath(); ctx.arc(centerX - CELL * 0.1, centerY - CELL * 0.1, radius * 0.18, 0, Math.PI * 2); ctx.fill();
    if (index > 0 && index % 2 === 0) {
      ctx.strokeStyle = "#2f512b";
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(centerX, centerY, radius * 0.68, 0.25, Math.PI - 0.25); ctx.stroke();
    }
  });

  const head = snake[0];
  const headX = head.x * CELL + CELL / 2;
  const headY = head.y * CELL + CELL / 2;
  const angle = Math.atan2(direction.y, direction.x);
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(angle);
  ctx.fillStyle = "#355d30";
  ctx.beginPath(); ctx.ellipse(0, 0, CELL * 0.53, CELL * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#aec17a";
  ctx.beginPath(); ctx.ellipse(CELL * 0.08, 0, CELL * 0.29, CELL * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0b110c";
  ctx.beginPath(); ctx.arc(CELL * 0.22, -CELL * 0.2, CELL * 0.075, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(CELL * 0.22, CELL * 0.2, CELL * 0.075, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f08b83";
  ctx.fillRect(CELL * 0.48, -1, CELL * 0.35, 2);
  ctx.fillRect(CELL * 0.8, -3, CELL * 0.12, 2);
  ctx.fillRect(CELL * 0.8, 1, CELL * 0.12, 2);
  ctx.restore();
}

function drawAnimal(animal) {
  const x = animal.x * CELL;
  const y = animal.y * CELL;
  const angle = Math.atan2(animal.vy, animal.vx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (animal.type === "rabbit") drawRabbit(animal);
  if (animal.type === "mouse") drawMouse(animal);
  if (animal.type === "frog") drawFrog(animal);
  ctx.restore();
}

function drawRabbit(animal) {
  ctx.fillStyle = animal.fleeing ? "#d8c5a5" : "#c6b394";
  ctx.beginPath(); ctx.ellipse(0, 2, CELL * 0.34, CELL * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#d9c8aa";
  ctx.beginPath(); ctx.ellipse(CELL * 0.25, -CELL * 0.08, CELL * 0.22, CELL * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#b79178";
  ctx.beginPath(); ctx.ellipse(CELL * 0.26, -CELL * 0.3, CELL * 0.07, CELL * 0.22, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(CELL * 0.42, -CELL * 0.28, CELL * 0.07, CELL * 0.22, 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#242015";
  ctx.beginPath(); ctx.arc(CELL * 0.34, -CELL * 0.13, CELL * 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ead7d0";
  ctx.beginPath(); ctx.arc(-CELL * 0.29, CELL * 0.02, CELL * 0.13, 0, Math.PI * 2); ctx.fill();
}

function drawMouse(animal) {
  ctx.fillStyle = animal.fleeing ? "#a78263" : "#927052";
  ctx.beginPath(); ctx.ellipse(0, 1, CELL * 0.3, CELL * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#b68c70";
  ctx.beginPath(); ctx.arc(CELL * 0.23, -CELL * 0.02, CELL * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c99b88";
  ctx.beginPath(); ctx.arc(CELL * 0.18, -CELL * 0.18, CELL * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(CELL * 0.32, -CELL * 0.18, CELL * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b68c70"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-CELL * 0.25, CELL * 0.05); ctx.quadraticCurveTo(-CELL * 0.7, CELL * 0.35, -CELL * 0.48, CELL * 0.5); ctx.stroke();
  ctx.fillStyle = "#241a15";
  ctx.beginPath(); ctx.arc(CELL * 0.3, -CELL * 0.04, CELL * 0.035, 0, Math.PI * 2); ctx.fill();
}

function drawFrog(animal) {
  ctx.fillStyle = animal.fleeing ? "#5b934e" : "#4b8244";
  ctx.beginPath(); ctx.ellipse(0, 2, CELL * 0.34, CELL * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#78a95d";
  ctx.beginPath(); ctx.arc(-CELL * 0.16, -CELL * 0.18, CELL * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(CELL * 0.18, -CELL * 0.18, CELL * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#111a10";
  ctx.beginPath(); ctx.arc(-CELL * 0.14, -CELL * 0.2, CELL * 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(CELL * 0.16, -CELL * 0.2, CELL * 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#315c32"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-CELL * 0.28, CELL * 0.1); ctx.lineTo(-CELL * 0.5, CELL * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CELL * 0.28, CELL * 0.1); ctx.lineTo(CELL * 0.5, CELL * 0.3); ctx.stroke();
}

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  if (KEY_DIRECTIONS[key]) { event.preventDefault(); setDirection(KEY_DIRECTIONS[key]); }
  if (key === "p") togglePause();
  if (key === "r") resetGame();
});

document.querySelectorAll("[data-direction]").forEach(button => {
  button.addEventListener("click", () => setDirection(button.dataset.direction));
});
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", resetGame);

resetGame();
