import "./style.css";
import { Game } from "./game.js";
import { InputHandler } from "./input.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const playButton = document.getElementById("playButton");

const input = new InputHandler();

let game = null;
let lastTime = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (game) {
    game.resize(canvas.width, canvas.height);
  }
}

function animate(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000 || 0;
  lastTime = timestamp;

  if (game) {
    game.update(deltaTime);
    game.draw();
  }

  requestAnimationFrame(animate);
}

window.addEventListener("load", () => {
  resizeCanvas();
  game = new Game(canvas, ctx, input);
  requestAnimationFrame(animate);
});

window.addEventListener("resize", resizeCanvas);

window.addEventListener("keydown", (event) => {
  if (!game) {
    return;
  }

  input.keys.add(event.key);

  if (event.key === "Escape" && game.state !== "MENU" && game.state !== "GAME_OVER") {
    game.pause();
  }

  if (event.key === "Enter" && (game.state === "GAME_OVER" || game.state === "VICTORY")) {
  game.restart();
}
});

window.addEventListener("keyup", (event) => {
  input.keys.delete(event.key);
});

window.addEventListener("keypress", (event) => {
  if (!game) {
    return;
  }

  if (event.key.toLowerCase() === "r" && (game.state === "GAME_OVER" || game.state === "VICTORY")) {
  game.restart();
}
});

window.addEventListener("mousemove", (event) => {
  input.mouse.x = event.clientX;
  input.mouse.y = event.clientY;
});

window.addEventListener("mousedown", () => {
  input.mouse.down = true;
});

window.addEventListener("mouseup", () => {
  input.mouse.down = false;
});

window.addEventListener("click", () => {
});

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

window.addEventListener("wheel", (event) => {
  if (!game) {
    return;
  }

  if (game.state === "PLAYING") {
    if (event.deltaY < 0) {
      game.player.speed = Math.min(game.player.speed + 10, 320);
    } else {
      game.player.speed = Math.max(game.player.speed - 10, 120);
    }
  }
});

window.addEventListener("blur", () => {
  if (game && game.state === "PLAYING") {
    game.state = "PAUSED";
  }
});

window.addEventListener("focus", () => {
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && game && game.state === "PLAYING") {
    game.state = "PAUSED";
  }
});

playButton.addEventListener("click", () => {
  if (!game) {
    return;
  }

  menu.classList.remove("visible");
  game.start();
});

document.addEventListener("gameStart", () => {
  console.log("Game started");
});

document.addEventListener("gameOver", (event) => {
  console.log("Game over", event.detail.score);
});

document.addEventListener("levelUp", (event) => {
  console.log("Level up", event.detail.level);
});

document.addEventListener("gameWin", (event) => {
  console.log("You win", event.detail.score);
});

setInterval(() => {
  if (game && game.state === "PLAYING") {
    game.player.score += 1;
  }
}, 1000);

setTimeout(() => {
}, 500);
