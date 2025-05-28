import * as PIXI from "pixi.js";
import { Assets } from "pixi.js";

const app = new PIXI.Application({
  resizeTo: window,
  backgroundColor: 0x1099bb,
});
document.body.appendChild(app.view);

const basePath = import.meta.env.BASE_URL || "/";

const idleFrames = [];
const runFrames = [];
const jumpFrames = [];
const coinFrames = [];
const coinCollectFrames = [];
const activeTouches = new Map();

let playerIdle;
let playerRun;
let playerJump;
let currentPlayer;
const coins = [];
let coinSpawnTimer = 0;
const spawnInterval = 200; // чем меньше — тем чаще (кадры между спавнами)

let isMoving = false;
let moveDirection = 0; // 1 вправо, -1 влево, 0 — стоим

// Вертикальный сдвиг позиционирования игрока
const playerOffsetY = 100; // смещение по Y для игрока

// Для прыжка
let isJumping = false;
let velocityY = 0;
const gravity = 0.8;
const jumpPower = 15;

// Счёт
let score = 0;
let scoreText;
const getScoreText = (score) => `Монетки: ${score}`;

async function setupGame() {
  for (let i = 1; i <= 24; i++) {
    const frameNumber = i.toString().padStart(5, "0");
    const path = `${basePath}assets/idle/frame_${frameNumber}.png`;
    const texture = await Assets.load(path);
    idleFrames.push(texture);
  }

  for (let i = 1; i <= 20; i++) {
    const frameNumber = i.toString().padStart(5, "0");
    const path = `${basePath}assets/run/frame_${frameNumber}.png`;
    const texture = await Assets.load(path);
    runFrames.push(texture);
  }

  for (let i = 1; i <= 5; i++) {
    const frameNumber = i.toString().padStart(5, "0");
    const path = `${basePath}assets/jump/frame_${frameNumber}.png`;
    const texture = await Assets.load(path);
    jumpFrames.push(texture);
  }

  for (let i = 1; i <= 12; i++) {
    const frameNumber = i.toString().padStart(5, "0");
    const path = `${basePath}assets/coin/frame_${frameNumber}.png`;
    const texture = await Assets.load(path);
    coinFrames.push(texture);
  }

  for (let i = 1; i <= 14; i++) {
    const frameNumber = i.toString().padStart(5, "0");
    const path = `${basePath}assets/coinCollect/frame_${frameNumber}.png`;
    const texture = await Assets.load(path);
    coinCollectFrames.push(texture);
  }

  const ground = new PIXI.Graphics();
  ground.beginFill(0x00ff00);
  ground.drawRect(0, 0, app.screen.width, 50);
  ground.endFill();
  ground.y = app.screen.height - 50;
  app.stage.addChild(ground);

  playerIdle = new PIXI.AnimatedSprite(idleFrames);
  playerRun = new PIXI.AnimatedSprite(runFrames);
  playerJump = new PIXI.AnimatedSprite(jumpFrames);

  playerIdle.animationSpeed = 0.3;
  playerIdle.loop = true;
  playerIdle.anchor.set(0.5);
  playerIdle.x = app.screen.width / 2;
  playerIdle.y = app.screen.height - playerOffsetY;
  playerIdle.scale.set(1);

  playerRun.animationSpeed = 0.4;
  playerRun.loop = true;
  playerRun.anchor.set(0.5);
  playerRun.x = app.screen.width / 2;
  playerRun.y = app.screen.height - playerOffsetY;
  playerRun.scale.set(1);

  playerJump.animationSpeed = 0.3;
  playerJump.loop = false;
  playerJump.anchor.set(0.5);
  playerJump.x = app.screen.width / 2;
  playerJump.y = app.screen.height - playerOffsetY;
  playerJump.scale.set(1);

  currentPlayer = playerIdle;
  currentPlayer.play();
  app.stage.addChild(currentPlayer);

  scoreText = new PIXI.Text(getScoreText(score), {
    fontFamily: "Arial",
    fontSize: 36,
    fill: 0xffffff,
    align: "left",
  });
  scoreText.x = 20;
  scoreText.y = 20;
  app.stage.addChild(scoreText);

  setupControls();
  setupTouchControls();

  app.ticker.add(gameLoop);
}

function switchAnimation(type) {
  const prev = currentPlayer;
  let next;

  if (type === "run") next = playerRun;
  else if (type === "jump") next = playerJump;
  else next = playerIdle;
  // Если уже в нужной анимации, ничего не делаем
  if (currentPlayer === next) return;

  app.stage.removeChild(currentPlayer);
  currentPlayer.stop();

  currentPlayer = next;
  currentPlayer.x = prev.x;
  currentPlayer.y = prev.y;
  currentPlayer.scale.x = prev.scale.x;
  currentPlayer.play();
  app.stage.addChild(currentPlayer);

  if (type !== "jump") {
    currentPlayer.onComplete = null;
    return;
  }
  let reversed = false;

  currentPlayer.onComplete = () => {
    if (!reversed) {
      // Реверс
      reversed = true;
      currentPlayer.textures.reverse();
      currentPlayer.gotoAndPlay(0);
    } else {
      // После реверса — вернуть анимацию в нормальный порядок
      currentPlayer.textures.reverse();
      if (isMoving) switchAnimation("run");
      else switchAnimation("idle");
    }
  };
}

function setupControls() {
  window.addEventListener("keydown", (e) => {
    const step = 5;
    if (e.code === "ArrowRight") {
      currentPlayer.x += step;
      currentPlayer.scale.x = Math.abs(currentPlayer.scale.x);
      switchAnimation("run");
      isMoving = true;
      moveDirection = 1;
    } else if (e.code === "ArrowLeft") {
      currentPlayer.x -= step;
      currentPlayer.scale.x = -Math.abs(currentPlayer.scale.x);
      switchAnimation("run");
      isMoving = true;
      moveDirection = -1;
    }

    if (["ArrowUp", "KeyW", "Space"].includes(e.code) && !isJumping) {
      isJumping = true;
      velocityY = -jumpPower;
      switchAnimation("jump");
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
      isMoving = false;
      moveDirection = 0;
      switchAnimation("idle");
    }
  });
}

function setupTouchControls() {
  app.view.addEventListener("pointerdown", (e) => {
    activeTouches.set(e.pointerId, {
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });

    const tapX = e.clientX;
    const playerX = currentPlayer.x;

    if (tapX < playerX) {
      // Тап слева от персонажа — идём влево
      moveDirection = -1;
      isMoving = true;
      currentPlayer.scale.x = -Math.abs(currentPlayer.scale.x);
      switchAnimation("run");
    } else {
      // Тап справа от персонажа — идём вправо
      moveDirection = 1;
      isMoving = true;
      currentPlayer.scale.x = Math.abs(currentPlayer.scale.x);
      switchAnimation("run");
    }
  });

  app.view.addEventListener("pointermove", (e) => {
    const touch = activeTouches.get(e.pointerId);
    if (touch) {
      touch.currentX = e.clientX;
      touch.currentY = e.clientY;
    }
  });

  app.view.addEventListener("pointerup", (e) => {
    let type = "idle";
    const touch = activeTouches.get(e.pointerId);
    if (touch) {
      const dx = touch.currentX - touch.startX;
      const dy = touch.startY - touch.currentY;

      const swipeThreshold = 30; // минимальная длина свайпа для распознавания

      // Свайп вверх
      if (dy > swipeThreshold && Math.abs(dy) > Math.abs(dx)) {
        if (!isJumping) {
          isJumping = true;
          velocityY = -jumpPower;
          type = "jump";
          switchAnimation(type);
        }
      }

      activeTouches.delete(e.pointerId);
    }

    if (activeTouches.size === 0) {
      moveDirection = 0;
      isMoving = false;
      switchAnimation(type);
    }
  });

  app.view.addEventListener("pointercancel", (e) => {
    activeTouches.delete(e.pointerId);
  });
}

function spawnCoin() {
  const coin = new PIXI.AnimatedSprite(coinFrames);
  coin.animationSpeed = 0.4;
  coin.loop = true;
  coin.play();
  coin.anchor.set(0.5);
  coin.x = Math.random() * app.screen.width;
  coin.y = -30;
  coin.vy = 2 + Math.random() * 2;
  coin.collected = false;
  app.stage.addChild(coin);
  coins.push(coin);
}

function gameLoop(delta) {
  const step = 5;

  // Горизонтальное движение
  if (isMoving && moveDirection !== 0) {
    currentPlayer.x += step * moveDirection;
  }

  // Прыжок - простая физика
  if (isJumping) {
    currentPlayer.y += velocityY;
    velocityY += gravity;

    // Столкновение с землёй
    const groundY = app.screen.height - playerOffsetY;
    if (currentPlayer.y >= groundY) {
      currentPlayer.y = groundY;
      isJumping = false;
      velocityY = 0;
    }
  }

  // Обработка спавна монеток
  coinSpawnTimer++;
  if (coinSpawnTimer >= spawnInterval) {
    coinSpawnTimer = 0;
    spawnCoin();
  }

  // Обработка падения монеток
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];

    if (!coin.collected) {
      coin.y += coin.vy;

      const dx = coin.x - currentPlayer.x;
      const dy = coin.y - currentPlayer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = 50;

      // Сбор монетки
      if (distance < hitRadius) {
        coin.collected = true;
        score++;
        scoreText.text = getScoreText(score);

        const collectAnim = new PIXI.AnimatedSprite(coinCollectFrames);
        collectAnim.animationSpeed = 0.5;
        collectAnim.loop = false;
        collectAnim.anchor.set(0.5);
        collectAnim.x = coin.x;
        collectAnim.y = coin.y;

        collectAnim.onComplete = () => {
          app.stage.removeChild(collectAnim);
        };

        app.stage.addChild(collectAnim);
        collectAnim.play();

        app.stage.removeChild(coin);
        coins.splice(i, 1);
        continue;
      }

      // Падение на землю
      if (coin.y >= app.screen.height - 50) {
        app.stage.removeChild(coin);
        coins.splice(i, 1);
      }
    }
  }
}

async function run() {
  document.getElementById("loader").style.display = "flex";

  await setupGame();

  document.getElementById("loader").style.display = "none";
}

run();
