import { FiniteStateMachine } from "./fsm.js";

export class Enemy {
  constructor(x, y, color = "#60a5fa") {
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.radius = 12;
    this.baseSpeed = 95;
    this.speed = this.baseSpeed;
    this.color = color;

    this.dirX = 0;
    this.dirY = 0;
    this.player = null;
    this.maze = null;
    this.powerMode = false;
    this.detectionRange = 7;
    this.attackRange = 2;

    this.lastDecisionCol = null;
    this.lastDecisionRow = null;

    this.isEliminated = false;

    this.fsm = new FiniteStateMachine("IDLE", {
      IDLE: {
        enter: (enemy) => {
          enemy.dirX = 0;
          enemy.dirY = 0;
        },
        update: (enemy) => {
          if (enemy.fsm.stateTime > 1) {
            enemy.fsm.setState("PATROL", enemy);
          }
        }
      },

      PATROL: {
        enter: (enemy) => {
          enemy.speed = enemy.baseSpeed;
          enemy.pickPatrolDirection();
        },
        update: (enemy, deltaTime) => {
          enemy.gridMove(deltaTime);

          if (enemy.playerTileDistance <= enemy.detectionRange) {
            enemy.fsm.setState("CHASE", enemy);
            return;
          }

          if (enemy.canMakeDecision()) {
            enemy.pickPatrolDirection();
          }
        }
      },

      CHASE: {
        enter: (enemy) => {
          enemy.speed = enemy.baseSpeed + 15;
        },
        update: (enemy, deltaTime) => {
          enemy.gridMove(deltaTime);

          if (enemy.playerTileDistance <= enemy.attackRange) {
            enemy.fsm.setState("ATTACK", enemy);
            return;
          }

          if (enemy.playerTileDistance > enemy.detectionRange + 2) {
            enemy.fsm.setState("PATROL", enemy);
            return;
          }

          if (enemy.canMakeDecision()) {
            enemy.pickBestDirectionTowardPlayer();
          }
        }
      },

      ATTACK: {
        enter: (enemy) => {
          enemy.speed = enemy.baseSpeed + 28;
        },
        update: (enemy, deltaTime) => {
          enemy.gridMove(deltaTime);

          if (enemy.playerTileDistance > enemy.attackRange + 1) {
            enemy.fsm.setState("CHASE", enemy);
            return;
          }

          if (enemy.canMakeDecision()) {
            enemy.pickBestDirectionTowardPlayer();
          }
        }
      },

      FLEE: {
        enter: (enemy) => {
          enemy.speed = enemy.baseSpeed + 8;
        },
        update: (enemy, deltaTime) => {
          enemy.gridMove(deltaTime);

          if (!enemy.powerMode) {
            enemy.fsm.setState("PATROL", enemy);
            return;
          }

          if (enemy.canMakeDecision()) {
            enemy.pickBestDirectionAwayFromPlayer();
          }
        }
      },

      DEAD: {
        enter: (enemy) => {
          enemy.speed = 0;
          enemy.dirX = 0;
          enemy.dirY = 0;
        },
        update: () => {}
      }
    });
  }

  setMaze(maze) {
    this.maze = maze;
  }

  setPlayer(player) {
    this.player = player;
  }

  atCenter() {
    return this.maze.isNearTileCenter(this.x, this.y, 6);
  }

  alignToCenter() {
    const snapped = this.maze.snapToTileCenter(this.x, this.y);
    this.x = snapped.x;
    this.y = snapped.y;
  }

  get tile() {
    return this.maze.getTileFromPixel(this.x, this.y);
  }

  get playerTile() {
    return this.maze.getTileFromPixel(this.player.x, this.player.y);
  }

  get playerTileDistance() {
    return Math.abs(this.tile.col - this.playerTile.col) + Math.abs(this.tile.row - this.playerTile.row);
  }

  canMakeDecision() {
    if (!this.atCenter()) {
      return false;
    }

    const tile = this.tile;

    if (tile.col === this.lastDecisionCol && tile.row === this.lastDecisionRow) {
      return false;
    }

    this.lastDecisionCol = tile.col;
    this.lastDecisionRow = tile.row;
    this.alignToCenter();
    return true;
  }

  gridMove(deltaTime) {
    if (this.atCenter() && !this.maze.canMove(this.x, this.y, this.dirX, this.dirY)) {
      this.alignToCenter();
      this.dirX = 0;
      this.dirY = 0;
    }

    this.x += this.dirX * this.speed * deltaTime;
    this.y += this.dirY * this.speed * deltaTime;
  }

  getAvailableDirections() {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    return directions.filter((dir) => this.maze.canMove(this.x, this.y, dir.x, dir.y));
  }

  setDirection(dir) {
    this.dirX = dir.x;
    this.dirY = dir.y;
  }

  pickPatrolDirection() {
    this.alignToCenter();

    const directions = this.getAvailableDirections();
    const filtered = directions.filter((dir) => !(dir.x === -this.dirX && dir.y === -this.dirY));
    const choices = filtered.length > 0 ? filtered : directions;

    if (choices.length === 0) {
      this.dirX = 0;
      this.dirY = 0;
      return;
    }

    const chosen = choices[Math.floor(Math.random() * choices.length)];
    this.setDirection(chosen);
  }

  pickBestDirectionTowardPlayer() {
    this.pickDirectionalMove(this.playerTile.col, this.playerTile.row, false);
  }

  pickBestDirectionAwayFromPlayer() {
    this.pickDirectionalMove(this.playerTile.col, this.playerTile.row, true);
  }

  pickDirectionalMove(targetCol, targetRow, flee) {
    this.alignToCenter();

    const directions = this.getAvailableDirections();

    if (directions.length === 0) {
      this.dirX = 0;
      this.dirY = 0;
      return;
    }

    let bestDir = directions[0];
    let bestScore = flee ? -Infinity : Infinity;

    for (const dir of directions) {
      if (dir.x === -this.dirX && dir.y === -this.dirY && directions.length > 1) {
        continue;
      }

      const nextCol = this.tile.col + dir.x;
      const nextRow = this.tile.row + dir.y;
      const dist = Math.abs(nextCol - targetCol) + Math.abs(nextRow - targetRow);

      if (!flee && dist < bestScore) {
        bestScore = dist;
        bestDir = dir;
      }

      if (flee && dist > bestScore) {
        bestScore = dist;
        bestDir = dir;
      }
    }

    this.setDirection(bestDir);
  }

  eliminate() {
    this.isEliminated = true;
    this.dirX = 0;
    this.dirY = 0;
    this.fsm.setState("DEAD", this);
  }

  revive() {
    this.isEliminated = false;
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.dirX = 0;
    this.dirY = 0;
    this.lastDecisionCol = null;
    this.lastDecisionRow = null;
    this.fsm.setState("IDLE", this);
  }

  update(deltaTime, powerMode) {
    if (this.isEliminated) {
      return;
    }

    this.powerMode = powerMode;

    if (this.powerMode && this.fsm.currentState !== "DEAD" && this.fsm.currentState !== "FLEE") {
      this.fsm.setState("FLEE", this);
    }

    this.fsm.update(this, deltaTime);
  }

  draw(ctx, offsetX, offsetY) {
    if (this.isEliminated) {
      return;
    }

    ctx.save();
    ctx.fillStyle = this.fsm.currentState === "FLEE" ? "#34d399" : this.color;
    ctx.beginPath();
    ctx.arc(offsetX + this.x, offsetY + this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(offsetX + this.x - 4, offsetY + this.y - 2, 2.5, 0, Math.PI * 2);
    ctx.arc(offsetX + this.x + 4, offsetY + this.y - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(offsetX + this.x - 4, offsetY + this.y - 2, 1.2, 0, Math.PI * 2);
    ctx.arc(offsetX + this.x + 4, offsetY + this.y - 2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
