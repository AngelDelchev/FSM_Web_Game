import { Player } from "./player.js";
import { Enemy } from "./enemy.js";
import { Maze } from "./maze.js";

export class Game {
  constructor(canvas, ctx, input) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.input = input;

    this.state = "MENU";
    this.level = 1;
    this.powerMode = false;
    this.powerModeTimer = 0;

    this.maze = new Maze();

    this.offsetX = Math.floor((canvas.width - this.maze.width) / 2);
    this.offsetY = Math.floor((canvas.height - this.maze.height) / 2);

    const playerStart = this.maze.getTileCenter(1, 1);
    this.player = new Player(playerStart.x, playerStart.y);

    this.enemies = [
      new Enemy(...Object.values(this.maze.getTileCenter(9, 5)), "#60a5fa"),
      new Enemy(...Object.values(this.maze.getTileCenter(9, 7)), "#f87171"),
      new Enemy(...Object.values(this.maze.getTileCenter(11, 5)), "#c084fc")
    ];

    for (const enemy of this.enemies) {
      enemy.setMaze(this.maze);
      enemy.setPlayer(this.player);
    }
  }

  resize(width, height) {
    this.offsetX = Math.floor((width - this.maze.width) / 2);
    this.offsetY = Math.floor((height - this.maze.height) / 2);
  }

  start() {
    this.state = "PLAYING";
    document.dispatchEvent(new CustomEvent("gameStart"));
  }

  pause() {
    if (this.state === "PLAYING") {
      this.state = "PAUSED";
    } else if (this.state === "PAUSED") {
      this.state = "PLAYING";
    }
  }

  gameOver() {
    this.state = "GAME_OVER";
    document.dispatchEvent(
      new CustomEvent("gameOver", {
        detail: { score: this.player.score }
      })
    );
  }

  win() {
    this.state = "VICTORY";
    document.dispatchEvent(
      new CustomEvent("gameWin", {
        detail: { score: this.player.score }
      })
    );
  }

  reviveAllGhosts() {
    for (const enemy of this.enemies) {
      enemy.revive();
      enemy.setMaze(this.maze);
      enemy.setPlayer(this.player);
    }
  }

  resetPlayerPosition() {
    const resetPos = this.maze.getTileCenter(1, 1);
    this.player.x = resetPos.x;
    this.player.y = resetPos.y;
    this.player.dirX = 0;
    this.player.dirY = 0;
    this.player.nextDirX = 0;
    this.player.nextDirY = 0;
  }

  loseLife() {
    this.player.lives -= 1;
    this.powerMode = false;
    this.powerModeTimer = 0;
    this.resetPlayerPosition();
    this.reviveAllGhosts();

    if (this.player.lives <= 0) {
      this.gameOver();
    }
  }

 update(deltaTime) {
  if (this.state !== "PLAYING") {
    return;
  }

  this.maze.update(deltaTime);
  this.player.update(deltaTime, this.input, this.maze);

    this.player.update(deltaTime, this.input, this.maze);

    if (this.powerMode) {
      this.powerModeTimer -= deltaTime;

      if (this.powerModeTimer <= 0) {
        this.powerMode = false;
        this.powerModeTimer = 0;
      }
    }

    for (const enemy of this.enemies) {
      enemy.update(deltaTime, this.powerMode);
    }

    this.handlePelletCollisions();
    this.handlePowerOrbCollisions();
    this.handleEnemyCollisions();
  }

  handlePelletCollisions() {
  for (let i = this.maze.pellets.length - 1; i >= 0; i -= 1) {
    const pellet = this.maze.pellets[i];
    const hit =
      Math.hypot(this.player.x - pellet.x, this.player.y - pellet.y) <
      this.player.size + pellet.r;

    if (hit) {
      this.player.score += 10;
      this.maze.consumePelletAt(i);
    }
  }
}

  handlePowerOrbCollisions() {
  for (let i = this.maze.powerOrbs.length - 1; i >= 0; i -= 1) {
    const orb = this.maze.powerOrbs[i];
    const hit =
      Math.hypot(this.player.x - orb.x, this.player.y - orb.y) <
      this.player.size + orb.r;

    if (hit) {
      this.powerMode = true;
      this.powerModeTimer = 6;
      this.player.score += 50;
      this.maze.consumePowerOrbAt(i);
    }
  }
}

  handleEnemyCollisions() {
    for (const enemy of this.enemies) {
      if (enemy.isEliminated) {
        continue;
      }

      const touching = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y) < this.player.size + enemy.radius;

      if (!touching) {
        continue;
      }

      if (this.powerMode) {
        enemy.eliminate();
        this.player.score += 200;

        const allGhostsDead = this.enemies.every((currentEnemy) => currentEnemy.isEliminated);

        if (allGhostsDead) {
          this.win();
        }
      } else {
        this.loseLife();
        break;
      }
    }
  }

  drawHud() {
    const remainingGhosts = this.enemies.filter((enemy) => !enemy.isEliminated).length;

    this.ctx.save();
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "20px Arial";
    this.ctx.fillText(`Score: ${this.player.score}`, 20, 30);
    this.ctx.fillText(`Lives: ${this.player.lives}`, 20, 58);
    this.ctx.fillText(`Ghosts Left: ${remainingGhosts}`, 20, 86);

    if (this.powerMode) {
      this.ctx.fillText(`Power: ${this.powerModeTimer.toFixed(1)}s`, 20, 114);
    }

    if (this.state === "PAUSED") {
      this.ctx.font = "48px Arial";
      this.ctx.fillText("PAUSED", this.canvas.width / 2 - 90, this.canvas.height / 2);
    }

    if (this.state === "GAME_OVER") {
      this.ctx.font = "48px Arial";
      this.ctx.fillText("GAME OVER", this.canvas.width / 2 - 150, this.canvas.height / 2);
      this.ctx.font = "24px Arial";
      this.ctx.fillText("Press Enter to restart", this.canvas.width / 2 - 120, this.canvas.height / 2 + 40);
    }

    if (this.state === "VICTORY") {
      this.ctx.font = "48px Arial";
      this.ctx.fillText("YOU WIN", this.canvas.width / 2 - 105, this.canvas.height / 2);
      this.ctx.font = "24px Arial";
      this.ctx.fillText("All ghosts eliminated", this.canvas.width / 2 - 105, this.canvas.height / 2 + 40);
      this.ctx.fillText("Press Enter to restart", this.canvas.width / 2 - 120, this.canvas.height / 2 + 75);
    }

    this.ctx.restore();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.maze.draw(this.ctx, this.offsetX, this.offsetY);
    this.maze.drawCollectibles(this.ctx, this.offsetX, this.offsetY);

    this.player.draw(this.ctx, this.offsetX, this.offsetY);

    for (const enemy of this.enemies) {
      enemy.draw(this.ctx, this.offsetX, this.offsetY);
    }

    this.drawHud();
  }

  restart() {
    this.level = 1;
    this.powerMode = false;
    this.powerModeTimer = 0;

    this.maze.resetCollectibles();

    const playerStart = this.maze.getTileCenter(1, 1);
    this.player = new Player(playerStart.x, playerStart.y);
    this.player.lives = 3;

    for (const enemy of this.enemies) {
      enemy.setMaze(this.maze);
      enemy.setPlayer(this.player);
      enemy.revive();
    }

    this.state = "PLAYING";
  }
}
