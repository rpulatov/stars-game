import { Assets } from "pixi.js";
import * as PIXI from "pixi.js";

const basePath = import.meta.env.BASE_URL || "/";

let app;

function resizeApp() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (app) {
    app.renderer.resize(width, height);
  } else {
    app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0x1099bb,
    });
    document.body.appendChild(app.view);
    setupGame();
    loadIdleAnimation();
  }
}

window.addEventListener("resize", resizeApp);
resizeApp(); // запуск

async function setupGame() {
  const idleFrames = [];

  for (let i = 1; i <= 24; i++) {
    const frameNumber = i.toString().padStart(5, "0"); // '01', '02'...
    const path = `${basePath}assets/idle/frame_${frameNumber}.png`;
    // const path = `/assets/idle/frame_${frameNumber}.png`;
    const texture = await Assets.load(path);
    idleFrames.push(texture);
  }

  // Создаём анимированного спрайта
  const player = new PIXI.AnimatedSprite(idleFrames);
  player.animationSpeed = 0.3;
  player.loop = true;
  player.play();

  // Устанавливаем якорь по центру и позицию
  player.anchor.set(0.4, -0.05); // центр по горизонтали и чуть ниже по вертикали
  player.x = app.screen.width / 2;
  // player.y = app.screen.height - 950;

  // Масштаб — увеличь, если нужно
  player.scale.set(0.2);

  app.stage.addChild(player);

  const ground = new PIXI.Graphics();
  ground.beginFill(0x00ff00);
  ground.drawRect(0, 0, app.screen.width, 50);
  ground.endFill();
  ground.y = app.screen.height - 50;
  app.stage.addChild(ground);

  let vy = 0;
  const gravity = 1;
  let onGround = false;

  // --- Управление ---
  const keys = {};
  let moveDirection = null; // 'left' | 'right'
  let touchStartY = null;

  // Клавиатура
  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));

  // Сенсорное управление
  window.addEventListener("touchstart", (e) => {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    touchStartY = y;

    if (x < window.innerWidth / 2) {
      moveDirection = "left";
    } else {
      moveDirection = "right";
    }
  });

  window.addEventListener("touchend", (e) => {
    moveDirection = null;
    touchStartY = null;
  });

  window.addEventListener("touchmove", (e) => {
    if (!touchStartY) return;

    const y = e.touches[0].clientY;
    const deltaY = touchStartY - y;

    if (deltaY > 50 && onGround) {
      // свайп вверх
      vy = -20;
      onGround = false;
      touchStartY = null; // чтобы не прыгал повторно
    }
  });

  // Цикл
  app.ticker.add(() => {
    // Клавиатура
    if (keys["ArrowRight"] || keys["KeyD"]) {
      player.x += 5;
      player.scale.x = Math.abs(player.scale.x);
    }
    if (keys["ArrowLeft"] || keys["KeyA"]) {
      player.x -= 5;
      player.scale.x = -Math.abs(player.scale.x);
    }
    if ((keys["ArrowUp"] || keys["KeyW"] || keys["Space"]) && onGround) {
      vy = -20;
      onGround = false;
    }

    // Сенсорное управление
    if (moveDirection === "left") player.x -= 5;
    if (moveDirection === "right") player.x += 5;

    // Гравитация
    vy += gravity;
    player.y += vy;

    // Коллизия с землёй
    if (player.y + player.height >= ground.y) {
      player.y = ground.y - player.height;
      vy = 0;
      onGround = true;
    }
  });
}
