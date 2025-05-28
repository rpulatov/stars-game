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

let playerIdle;
let playerRun;
let currentPlayer;

let isMoving = false;
let moveDirection = 0; // 1 вправо, -1 влево, 0 — стоим

// Вертикальный сдвиг позиционирования игрока
const playerOffsetY = 100; // смещение по Y для игрока

// Для прыжка
let isJumping = false;
let velocityY = 0;
const gravity = 0.8;
const jumpPower = 15;

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

  const ground = new PIXI.Graphics();
  ground.beginFill(0x00ff00);
  ground.drawRect(0, 0, app.screen.width, 50);
  ground.endFill();
  ground.y = app.screen.height - 50;
  app.stage.addChild(ground);

  playerIdle = new PIXI.AnimatedSprite(idleFrames);
  playerRun = new PIXI.AnimatedSprite(runFrames);

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

  currentPlayer = playerIdle;
  currentPlayer.play();
  app.stage.addChild(currentPlayer);

  setupControls();
  setupTouchControls();

  app.ticker.add(gameLoop);
}

function switchAnimation(toRun) {
  if (toRun && currentPlayer !== playerRun) {
    app.stage.removeChild(currentPlayer);
    currentPlayer.stop();

    currentPlayer = playerRun;
    currentPlayer.x = playerIdle.x;
    currentPlayer.y = playerIdle.y;
    currentPlayer.scale.x = playerIdle.scale.x;
    currentPlayer.play();
    app.stage.addChild(currentPlayer);
  } else if (!toRun && currentPlayer !== playerIdle) {
    app.stage.removeChild(currentPlayer);
    currentPlayer.stop();

    currentPlayer = playerIdle;
    currentPlayer.x = playerRun.x;
    currentPlayer.y = playerRun.y;
    currentPlayer.scale.x = playerRun.scale.x;
    currentPlayer.play();
    app.stage.addChild(currentPlayer);
  }
}

function setupControls() {
  window.addEventListener("keydown", (e) => {
    const step = 5;
    if (e.code === "ArrowRight") {
      currentPlayer.x += step;
      currentPlayer.scale.x = Math.abs(currentPlayer.scale.x);
      switchAnimation(true);
      isMoving = true;
      moveDirection = 1;
    } else if (e.code === "ArrowLeft") {
      currentPlayer.x -= step;
      currentPlayer.scale.x = -Math.abs(currentPlayer.scale.x);
      switchAnimation(true);
      isMoving = true;
      moveDirection = -1;
    }

    if (["ArrowUp", "KeyW", "Space"].includes(e.code) && !isJumping) {
      isJumping = true;
      velocityY = -jumpPower;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
      isMoving = false;
      moveDirection = 0;
      switchAnimation(false);
    }
  });
}

// Для распознавания свайпа вверх
let touchStartY = null;
let touchStartX = null;

function setupTouchControls() {
  app.view.addEventListener("pointerdown", (e) => {
    activeTouches.set(e.pointerId, {
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });

    // Тап по левой или правой половине экрана
    if (e.clientX < app.screen.width / 2) {
      // Лево
      moveDirection = -1;
      isMoving = true;
      currentPlayer.scale.x = -Math.abs(currentPlayer.scale.x);
      switchAnimation(true);
    } else {
      // Право
      moveDirection = 1;
      isMoving = true;
      currentPlayer.scale.x = Math.abs(currentPlayer.scale.x);
      switchAnimation(true);
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
        }
      }

      activeTouches.delete(e.pointerId);
    }

    if (activeTouches.size === 0) {
      moveDirection = 0;
      isMoving = false;
        switchAnimation(false);
      }
  });

  app.view.addEventListener("pointercancel", (e) => {
    activeTouches.delete(e.pointerId);
  });
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
}

setupGame();
