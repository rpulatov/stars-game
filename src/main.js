import * as PIXI from 'pixi.js';

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
  }
}

window.addEventListener('resize', resizeApp);
resizeApp(); // Инициализация

function setupGame() {
  const player = new PIXI.Graphics();
  player.beginFill(0xff0000);
  player.drawRect(0, 0, 50, 50);
  player.endFill();
  player.x = app.screen.width / 2 - 25;
  player.y = app.screen.height - 150;
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

  const keys = {};
  window.addEventListener('keydown', (e) => (keys[e.code] = true));
  window.addEventListener('keyup', (e) => (keys[e.code] = false));

  app.ticker.add(() => {
    if (keys['ArrowRight'] || keys['KeyD']) player.x += 5;
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= 5;

    if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && onGround) {
      vy = -20;
      onGround = false;
    }

    vy += gravity;
    player.y += vy;

    if (player.y + player.height >= ground.y) {
      player.y = ground.y - player.height;
      vy = 0;
      onGround = true;
    }
  });
}
