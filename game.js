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
const DIRECTIONS = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
};
const KEY_DIRECTIONS = { w: "up", a: "left", s: "down", d: "right" };

let snake;
let food;
let direction;
let nextDirection;
let score;
let best = Number(localStorage.getItem("snake-best") || 0);
let gameState = "ready";
let timer;

bestEl.textContent = formatScore(best);

function formatScore(value) { return String(value).padStart(3, "0"); }

function resetGame() {
  snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
  direction = { ...DIRECTIONS.right };
  nextDirection = { ...direction };
  score = 0;
  scoreEl.textContent = formatScore(score);
  food = placeFood();
  gameState = "ready";
  clearInterval(timer);
  updateUi();
  draw();
}

function placeFood() {
  const openCells = [];
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (!snake.some(segment => segment.x === x && segment.y === y)) openCells.push({ x, y });
    }
  }
  return openCells[Math.floor(Math.random() * openCells.length)];
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
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    best = Math.max(best, score);
    localStorage.setItem("snake-best", best);
    scoreEl.textContent = formatScore(score);
    bestEl.textContent = formatScore(best);
    food = placeFood();
  } else {
    snake.pop();
  }
  draw();
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
    message.innerHTML = '<p class="message-kicker">READY WHEN YOU ARE</p><h2>Press a direction<br />to start.</h2><p class="message-hint">W A S D to move</p>';
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

  const foodX = food.x * CELL + CELL / 2;
  const foodY = food.y * CELL + CELL / 2;
  ctx.fillStyle = "#ff8a5c";
  ctx.beginPath(); ctx.arc(foodX, foodY, CELL * .27, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd2b9";
  ctx.beginPath(); ctx.arc(foodX - CELL * .08, foodY - CELL * .08, CELL * .07, 0, Math.PI * 2); ctx.fill();

  snake.forEach((segment, index) => {
    const inset = index === 0 ? 2 : 3;
    ctx.fillStyle = index === 0 ? "#d5f76a" : `hsl(${74 - Math.min(index, 8) * 2} 72% ${62 - Math.min(index, 8) * 2}%)`;
    ctx.fillRect(segment.x * CELL + inset, segment.y * CELL + inset, CELL - inset * 2, CELL - inset * 2);
  });
  const head = snake[0];
  ctx.fillStyle = "#10140f";
  const eyeSize = CELL * .12;
  const eyeOffset = CELL * .25;
  const eyeX = direction.x !== 0 ? head.x * CELL + CELL / 2 + direction.x * eyeOffset : head.x * CELL + CELL * .32;
  const eyeY = direction.y !== 0 ? head.y * CELL + CELL / 2 + direction.y * eyeOffset : head.y * CELL + CELL * .32;
  ctx.fillRect(eyeX - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize);
  if (direction.x === 0) ctx.fillRect(head.x * CELL + CELL * .68 - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize);
  if (direction.y === 0) ctx.fillRect(eyeX - eyeSize / 2, head.y * CELL + CELL * .68 - eyeSize / 2, eyeSize, eyeSize);
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
