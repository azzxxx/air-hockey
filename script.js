const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");
const leftLabel = document.getElementById("leftLabel");
const rightLabel = document.getElementById("rightLabel");
const restartBtn = document.getElementById("restartBtn");
const modeSelect = document.getElementById("modeSelect");
const difficultySelect = document.getElementById("difficultySelect");
const difficultyPanel = document.getElementById("difficultyPanel");
const controlHint = document.getElementById("controlHint");

const W = canvas.width;
const H = canvas.height;
const GOAL_SIZE = 180;
const WIN_SCORE = 7;
const FIXED_DT = 1 / 120;
const MAX_FRAME_TIME = 0.05;
const EDGE_PAD = 6;
const MIN_PUCK_SPEED = 180;
const SPRITE_PATHS = {
  leftPaddle: "assets/player1.png",
  rightPaddle: "assets/player2.png",
  puck: "assets/puck.png"
};

const difficultySettings = {
  easy: { aiSpeed: 350, reactionDelay: 0.24, maxPuckSpeed: 580 },
  medium: { aiSpeed: 470, reactionDelay: 0.14, maxPuckSpeed: 660 },
  hard: { aiSpeed: 620, reactionDelay: 0.05, maxPuckSpeed: 760 }
};

const puck = {
  x: W / 2,
  y: H / 2,
  radius: 18,
  vx: 0,
  vy: 0
};

const leftPaddle = {
  x: W * 0.2,
  y: H / 2,
  radius: 28,
  vx: 0,
  vy: 0
};

const rightPaddle = {
  x: W * 0.8,
  y: H / 2,
  radius: 28,
  vx: 0,
  vy: 0
};

const keys = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  ArrowUp: false,
  ArrowLeft: false,
  ArrowDown: false,
  ArrowRight: false
};

const mouseTarget = { x: leftPaddle.x, y: leftPaddle.y, active: false };

let playerScore = 0;
let rightScore = 0;
let gameOver = false;
let winnerText = "";
let gameMode = "vsComputer";
let difficulty = "medium";
let lastFrameTime = performance.now();
let accumulator = 0;
let aiReactionTimer = 0;
let aiTargetX = rightPaddle.x;
let aiTargetY = rightPaddle.y;

function loadImage(src) {
  const img = new Image();
  const state = { img, ready: false };
  img.onload = () => {
    state.ready = true;
  };
  img.src = src;
  return state;
}

const sprites = {
  leftPaddle: loadImage(SPRITE_PATHS.leftPaddle),
  rightPaddle: loadImage(SPRITE_PATHS.rightPaddle),
  puck: loadImage(SPRITE_PATHS.puck)
};

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function randDir() {
  return Math.random() > 0.5 ? 1 : -1;
}

function setScores() {
  playerScoreEl.textContent = String(playerScore);
  aiScoreEl.textContent = String(rightScore);
}

function updateLabels() {
  if (gameMode === "vsFriend") {
    leftLabel.textContent = "Player 1";
    rightLabel.textContent = "Player 2";
    controlHint.innerHTML =
      "2 players: <strong>W/A/S/D</strong> (left) and <strong>Arrow Keys</strong> (right). First to <strong>7</strong> wins.";
  } else {
    leftLabel.textContent = "Player 1";
    rightLabel.textContent = "Computer";
    controlHint.innerHTML = "Move mouse/finger to control your paddle. First to <strong>7</strong> wins.";
  }
}

function resetPuck(direction = randDir()) {
  puck.x = W / 2;
  puck.y = H / 2;
  const startSpeed = 420;
  const angle = (Math.random() * 0.72 - 0.36) * Math.PI;
  puck.vx = Math.cos(angle) * startSpeed * direction;
  puck.vy = Math.sin(angle) * startSpeed;
}

function resetPositions() {
  leftPaddle.x = W * 0.2;
  leftPaddle.y = H / 2;
  leftPaddle.vx = 0;
  leftPaddle.vy = 0;
  rightPaddle.x = W * 0.8;
  rightPaddle.y = H / 2;
  rightPaddle.vx = 0;
  rightPaddle.vy = 0;
  mouseTarget.x = leftPaddle.x;
  mouseTarget.y = leftPaddle.y;
  aiTargetX = rightPaddle.x;
  aiTargetY = rightPaddle.y;
}

function resetMatch() {
  playerScore = 0;
  rightScore = 0;
  gameOver = false;
  winnerText = "";
  setScores();
  resetPositions();
  resetPuck();
}

function isInGoalMouth(y) {
  const top = H / 2 - GOAL_SIZE / 2;
  const bottom = H / 2 + GOAL_SIZE / 2;
  return y >= top && y <= bottom;
}

function movePointerTo(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const targetX = (clientX - rect.left) * scaleX;
  const targetY = (clientY - rect.top) * scaleY;
  mouseTarget.x = clamp(targetX, leftPaddle.radius + EDGE_PAD, W / 2 - leftPaddle.radius - EDGE_PAD);
  mouseTarget.y = clamp(targetY, leftPaddle.radius + EDGE_PAD, H - leftPaddle.radius - EDGE_PAD);
  mouseTarget.active = true;
}

canvas.addEventListener("mousemove", (event) => {
  if (gameMode !== "vsComputer") return;
  movePointerTo(event.clientX, event.clientY);
});

canvas.addEventListener(
  "touchmove",
  (event) => {
    if (gameMode !== "vsComputer") return;
    const touch = event.touches[0];
    if (!touch) return;
    movePointerTo(touch.clientX, touch.clientY);
    event.preventDefault();
  },
  { passive: false }
);

document.addEventListener("keydown", (event) => {
  if (event.code in keys) {
    keys[event.code] = true;
    event.preventDefault();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code in keys) {
    keys[event.code] = false;
    event.preventDefault();
  }
});

modeSelect.addEventListener("change", () => {
  gameMode = modeSelect.value;
  difficultyPanel.style.display = gameMode === "vsComputer" ? "grid" : "none";
  updateLabels();
  resetMatch();
});

difficultySelect.addEventListener("change", () => {
  difficulty = difficultySelect.value;
  if (gameMode === "vsComputer") resetMatch();
});

restartBtn.addEventListener("click", resetMatch);

function movePaddleByVelocity(paddle, dt, leftSide) {
  const minX = leftSide ? paddle.radius + EDGE_PAD : W / 2 + paddle.radius + EDGE_PAD;
  const maxX = leftSide ? W / 2 - paddle.radius - EDGE_PAD : W - paddle.radius - EDGE_PAD;
  const minY = paddle.radius + EDGE_PAD;
  const maxY = H - paddle.radius - EDGE_PAD;

  paddle.x = clamp(paddle.x + paddle.vx * dt, minX, maxX);
  paddle.y = clamp(paddle.y + paddle.vy * dt, minY, maxY);
}

function updateLeftPaddle(dt) {
  if (gameMode === "vsComputer") {
    const maxStep = 900 * dt;
    const dx = mouseTarget.x - leftPaddle.x;
    const dy = mouseTarget.y - leftPaddle.y;
    leftPaddle.vx = clamp(dx / dt, -900, 900);
    leftPaddle.vy = clamp(dy / dt, -900, 900);
    leftPaddle.x += clamp(dx, -maxStep, maxStep);
    leftPaddle.y += clamp(dy, -maxStep, maxStep);
    movePaddleByVelocity(leftPaddle, 0, true);
    return;
  }

  const speed = 560;
  leftPaddle.vx = (Number(keys.KeyD) - Number(keys.KeyA)) * speed;
  leftPaddle.vy = (Number(keys.KeyS) - Number(keys.KeyW)) * speed;
  movePaddleByVelocity(leftPaddle, dt, true);
}

function updateRightPaddle(dt) {
  if (gameMode === "vsFriend") {
    const speed = 560;
    rightPaddle.vx = (Number(keys.ArrowRight) - Number(keys.ArrowLeft)) * speed;
    rightPaddle.vy = (Number(keys.ArrowDown) - Number(keys.ArrowUp)) * speed;
    movePaddleByVelocity(rightPaddle, dt, false);
    return;
  }

  const setting = difficultySettings[difficulty];
  aiReactionTimer -= dt;
  if (aiReactionTimer <= 0) {
    aiReactionTimer = setting.reactionDelay;
    aiTargetX = clamp(puck.x + 90, W / 2 + rightPaddle.radius + EDGE_PAD, W - rightPaddle.radius - EDGE_PAD);
    aiTargetY = clamp(puck.y, rightPaddle.radius + EDGE_PAD, H - rightPaddle.radius - EDGE_PAD);
  }

  const maxStep = setting.aiSpeed * dt;
  const dx = aiTargetX - rightPaddle.x;
  const dy = aiTargetY - rightPaddle.y;
  rightPaddle.vx = clamp(dx / dt, -setting.aiSpeed, setting.aiSpeed);
  rightPaddle.vy = clamp(dy / dt, -setting.aiSpeed, setting.aiSpeed);
  rightPaddle.x += clamp(dx, -maxStep, maxStep);
  rightPaddle.y += clamp(dy, -maxStep, maxStep);
  movePaddleByVelocity(rightPaddle, 0, false);
}

function resolvePaddleCollision(paddle, boost) {
  const dx = puck.x - paddle.x;
  const dy = puck.y - paddle.y;
  const dist = Math.hypot(dx, dy);
  const minDist = puck.radius + paddle.radius;
  if (dist >= minDist) return;

  // If centers overlap exactly, pick a stable normal to avoid a stuck state.
  if (dist === 0) {
    const fallbackNx = puck.vx === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(puck.vx);
    puck.x += fallbackNx * minDist;
    return;
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  puck.x += nx * overlap;
  puck.y += ny * overlap;

  const paddleAlongNormal = paddle.vx * nx + paddle.vy * ny;
  const puckAlongNormal = puck.vx * nx + puck.vy * ny;
  const relative = puckAlongNormal - paddleAlongNormal;
  puck.vx -= 2 * relative * nx;
  puck.vy -= 2 * relative * ny;

  puck.vx += paddle.vx * 0.13;
  puck.vy += paddle.vy * 0.13;
  puck.vx *= boost;
  puck.vy *= boost;
}

function ensureMinimumPuckSpeed() {
  const speed = Math.hypot(puck.vx, puck.vy);
  if (speed >= MIN_PUCK_SPEED) return;

  const angle = speed > 0 ? Math.atan2(puck.vy, puck.vx) : Math.random() * Math.PI * 2;
  puck.vx = Math.cos(angle) * MIN_PUCK_SPEED;
  puck.vy = Math.sin(angle) * MIN_PUCK_SPEED;
}

function resolveCornerStall() {
  const topLimit = puck.radius + 4;
  const bottomLimit = H - puck.radius - 4;
  const nearTop = puck.y <= topLimit + 2;
  const nearBottom = puck.y >= bottomLimit - 2;
  if (!nearTop && !nearBottom) return;

  const nearLeftWall = puck.x <= puck.radius + 2 && !isInGoalMouth(puck.y);
  const nearRightWall = puck.x >= W - puck.radius - 2 && !isInGoalMouth(puck.y);
  if (!nearLeftWall && !nearRightWall) return;

  if (nearLeftWall) puck.vx = Math.abs(puck.vx) + 90;
  if (nearRightWall) puck.vx = -Math.abs(puck.vx) - 90;
  if (nearTop) puck.vy = Math.abs(puck.vy) + 90;
  if (nearBottom) puck.vy = -Math.abs(puck.vy) - 90;
}

function limitPuckSpeed(max) {
  const speed = Math.hypot(puck.vx, puck.vy);
  if (speed <= max || speed === 0) return;
  const scale = max / speed;
  puck.vx *= scale;
  puck.vy *= scale;
}

function updatePhysics(dt) {
  if (gameOver) return;

  updateLeftPaddle(dt);
  updateRightPaddle(dt);

  puck.x += puck.vx * dt;
  puck.y += puck.vy * dt;

  const topLimit = puck.radius + 4;
  const bottomLimit = H - puck.radius - 4;
  if (puck.y <= topLimit || puck.y >= bottomLimit) {
    puck.y = clamp(puck.y, topLimit, bottomLimit);
    puck.vy *= -1;
  }

  const leftGoal = puck.x - puck.radius <= 0 && isInGoalMouth(puck.y);
  const rightGoal = puck.x + puck.radius >= W && isInGoalMouth(puck.y);

  if (leftGoal) {
    rightScore += 1;
    setScores();
    if (rightScore >= WIN_SCORE) {
      gameOver = true;
      winnerText = gameMode === "vsComputer" ? "Computer Wins" : "Player 2 Wins";
    } else {
      resetPuck(1);
    }
    return;
  }

  if (rightGoal) {
    playerScore += 1;
    setScores();
    if (playerScore >= WIN_SCORE) {
      gameOver = true;
      winnerText = "Player 1 Wins";
    } else {
      resetPuck(-1);
    }
    return;
  }

  if (puck.x - puck.radius <= 0 && !isInGoalMouth(puck.y)) {
    puck.x = puck.radius;
    puck.vx *= -1;
  }
  if (puck.x + puck.radius >= W && !isInGoalMouth(puck.y)) {
    puck.x = W - puck.radius;
    puck.vx *= -1;
  }

  resolvePaddleCollision(leftPaddle, 1.06);
  resolvePaddleCollision(rightPaddle, 1.04);
  resolveCornerStall();
  ensureMinimumPuckSpeed();

  const maxSpeed = gameMode === "vsComputer" ? difficultySettings[difficulty].maxPuckSpeed : 700;
  limitPuckSpeed(maxSpeed);

  const damping = 0.9993;
  puck.vx *= damping;
  puck.vy *= damping;
}

function drawTable() {
  ctx.clearRect(0, 0, W, H);

  const grd = ctx.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, "#f3fbff");
  grd.addColorStop(1, "#cbefff");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  ctx.lineWidth = 6;
  ctx.strokeStyle = "#5daee6";
  ctx.strokeRect(3, 3, W - 6, H - 6);

  ctx.strokeStyle = "#ff4d6d";
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();

  ctx.strokeStyle = "#5daee6";
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 80, 0, Math.PI * 2);
  ctx.stroke();

  const goalTop = H / 2 - GOAL_SIZE / 2;
  const goalHeight = GOAL_SIZE;
  ctx.fillStyle = "rgba(255, 77, 109, 0.2)";
  ctx.fillRect(0, goalTop, 10, goalHeight);
  ctx.fillRect(W - 10, goalTop, 10, goalHeight);
}

function drawPaddle(paddle, fill, stroke) {
  const sprite = paddle === leftPaddle ? sprites.leftPaddle : sprites.rightPaddle;
  if (sprite.ready) {
    drawSpriteCircle(sprite.img, paddle.x, paddle.y, paddle.radius);
    return;
  }
  ctx.beginPath();
  ctx.arc(paddle.x, paddle.y, paddle.radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawPuck() {
  if (sprites.puck.ready) {
    drawSpriteCircle(sprites.puck.img, puck.x, puck.y, puck.radius);
    return;
  }
  ctx.beginPath();
  ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fefefe";
  ctx.stroke();
}

function drawSpriteCircle(img, x, y, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

function drawWinner() {
  if (!gameOver) return;
  ctx.fillStyle = "rgba(0, 8, 20, 0.58)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 56px Orbitron";
  ctx.fillText(winnerText, W / 2, H / 2 - 14);
  ctx.font = "500 26px Orbitron";
  ctx.fillText("Press Restart Match", W / 2, H / 2 + 42);
}

function render() {
  drawTable();
  drawPaddle(leftPaddle, "#54b4ff", "#0d5c93");
  drawPaddle(rightPaddle, "#ff5b7f", "#ad1d3f");
  drawPuck();
  drawWinner();
}

function frame(timestamp) {
  const deltaSeconds = Math.min((timestamp - lastFrameTime) / 1000, MAX_FRAME_TIME);
  lastFrameTime = timestamp;
  accumulator += deltaSeconds;

  while (accumulator >= FIXED_DT) {
    updatePhysics(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  render();
  requestAnimationFrame(frame);
}

difficultyPanel.style.display = "grid";
updateLabels();
resetMatch();
requestAnimationFrame((t) => {
  lastFrameTime = t;
  frame(t);
});
