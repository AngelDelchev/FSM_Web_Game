export class Maze {
  constructor() {
    this.tileSize = 24;

    this.pelletRespawnDelay = 10;
    this.powerOrbRespawnDelay = 15;
    this.powerOrbCount = 4;

    this.layout = [
      "#####################################",
      "#                                   #",
      "# ### ##### ### ##### ### ##### ### #",
      "# #     #     #   #     #     #   # #",
      "# # ### # ##### # # ##### ### # ### #",
      "# # #   #     # # # #     #   #   # #",
      "# ### ####### # # # # ####### ### # #",
      "#     #       # # # #       #     # #",
      "##### # ##### # # # # ##### # ##### #",
      "#     # #   # #   #   #   # # #     #",
      "# ##### # # # ####### # # # # # #####",
      "#       # # #   # #   # # # #       #",
      "# ##### # # ### # # ### # # # ##### #",
      "#     # # #     # #     # # # #     #",
      "##### # # ####### ####### # # # #####",
      "#     # #       # #       # # #     #",
      "# ### # ####### # # ####### # # ### #",
      "# #   #     #   # #   #     # #   # #",
      "# # ####### # ### ### # ####### # # #",
      "#         #           #         #   #",
      "#####################################"
    ];

    this.rows = this.layout.length;
    this.cols = this.layout[0].length;
    this.width = this.cols * this.tileSize;
    this.height = this.rows * this.tileSize;

    this.playerSpawn = { col: 1, row: 1 };
    this.enemySpawns = [
      { col: 17, row: 8 },
      { col: 19, row: 8 },
      { col: 21, row: 8 }
    ];

    this.walkableTiles = [];
    this.pellets = [];
    this.powerOrbs = [];
    this.pelletRespawnQueue = [];
    this.powerOrbRespawnQueue = [];

    this.cacheWalkableTiles();
    this.resetLevel();
  }

  cacheWalkableTiles() {
    this.walkableTiles = [];

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (this.isWalkable(col, row)) {
          this.walkableTiles.push({ col, row });
        }
      }
    }
  }

  makeTileKey(col, row) {
    return `${col},${row}`;
  }

  isReservedTile(col, row) {
    if (col === this.playerSpawn.col && row === this.playerSpawn.row) {
      return true;
    }

    return this.enemySpawns.some((spawn) => spawn.col === col && spawn.row === row);
  }

  getTileCenter(col, row) {
    return {
      x: col * this.tileSize + this.tileSize / 2,
      y: row * this.tileSize + this.tileSize / 2
    };
  }

  getTileFromPixel(x, y) {
    return {
      col: Math.floor(x / this.tileSize),
      row: Math.floor(y / this.tileSize)
    };
  }

  snapToTileCenter(x, y) {
    const tile = this.getTileFromPixel(x, y);
    return this.getTileCenter(tile.col, tile.row);
  }

  isNearTileCenter(x, y, tolerance = 5) {
    const tile = this.getTileFromPixel(x, y);
    const center = this.getTileCenter(tile.col, tile.row);

    return Math.abs(x - center.x) <= tolerance && Math.abs(y - center.y) <= tolerance;
  }

  isWall(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return true;
    }

    return this.layout[row][col] === "#";
  }

  isWalkable(col, row) {
    return !this.isWall(col, row);
  }

  canMove(x, y, dirX, dirY) {
    const tile = this.getTileFromPixel(x, y);
    const nextCol = tile.col + dirX;
    const nextRow = tile.row + dirY;

    return this.isWalkable(nextCol, nextRow);
  }

  shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  getRandomFreeWalkableTile(extraBlockedKeys = new Set()) {
    const blockedKeys = new Set(extraBlockedKeys);

    for (const orb of this.powerOrbs) {
      blockedKeys.add(this.makeTileKey(orb.col, orb.row));
    }

    const candidates = this.walkableTiles.filter((tile) => {
      if (this.isReservedTile(tile.col, tile.row)) {
        return false;
      }

      return !blockedKeys.has(this.makeTileKey(tile.col, tile.row));
    });

    if (candidates.length === 0) {
      return null;
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    return { col: chosen.col, row: chosen.row };
  }

  queuePelletRespawn(col, row) {
    if (this.isReservedTile(col, row)) {
      return;
    }

    const alreadyQueued = this.pelletRespawnQueue.some(
      (item) => item.col === col && item.row === row
    );

    if (alreadyQueued) {
      return;
    }

    this.pelletRespawnQueue.push({
      col,
      row,
      timeLeft: this.pelletRespawnDelay
    });
  }

  removePelletAtTile(col, row, shouldRespawn = true) {
    const index = this.pellets.findIndex(
      (pellet) => pellet.col === col && pellet.row === row
    );

    if (index === -1) {
      return;
    }

    this.pellets.splice(index, 1);

    if (shouldRespawn) {
      this.queuePelletRespawn(col, row);
    }
  }

  buildInitialPowerOrbs() {
    this.powerOrbs = [];
    const blocked = new Set();

    for (let i = 0; i < this.powerOrbCount; i += 1) {
      const tile = this.getRandomFreeWalkableTile(blocked);

      if (!tile) {
        break;
      }

      blocked.add(this.makeTileKey(tile.col, tile.row));

      const center = this.getTileCenter(tile.col, tile.row);
      this.powerOrbs.push({
        col: tile.col,
        row: tile.row,
        x: center.x,
        y: center.y,
        r: 8
      });
    }
  }

  buildPellets() {
    const powerOrbKeys = new Set(
      this.powerOrbs.map((orb) => this.makeTileKey(orb.col, orb.row))
    );

    this.pellets = this.walkableTiles
      .filter((tile) => {
        if (this.isReservedTile(tile.col, tile.row)) {
          return false;
        }

        return !powerOrbKeys.has(this.makeTileKey(tile.col, tile.row));
      })
      .map((tile) => {
        const center = this.getTileCenter(tile.col, tile.row);

        return {
          col: tile.col,
          row: tile.row,
          x: center.x,
          y: center.y,
          r: 4
        };
      });
  }

  spawnPowerOrbRandomly() {
    if (this.powerOrbs.length >= this.powerOrbCount) {
      return;
    }

    const tile = this.getRandomFreeWalkableTile();

    if (!tile) {
      return;
    }

    this.removePelletAtTile(tile.col, tile.row, true);

    const center = this.getTileCenter(tile.col, tile.row);
    this.powerOrbs.push({
      col: tile.col,
      row: tile.row,
      x: center.x,
      y: center.y,
      r: 8
    });
  }

  resetLevel() {
    this.pelletRespawnQueue = [];
    this.powerOrbRespawnQueue = [];
    this.buildInitialPowerOrbs();
    this.buildPellets();
  }

  hasPelletAt(col, row) {
    return this.pellets.some((pellet) => pellet.col === col && pellet.row === row);
  }

  hasPowerOrbAt(col, row) {
    return this.powerOrbs.some((orb) => orb.col === col && orb.row === row);
  }

  consumePelletAt(index) {
    const pellet = this.pellets[index];

    if (!pellet) {
      return;
    }

    this.pellets.splice(index, 1);
    this.queuePelletRespawn(pellet.col, pellet.row);
  }

  consumePowerOrbAt(index) {
    const orb = this.powerOrbs[index];

    if (!orb) {
      return;
    }

    this.powerOrbs.splice(index, 1);
    this.powerOrbRespawnQueue.push({
      timeLeft: this.powerOrbRespawnDelay
    });
  }

  update(deltaTime) {
    for (let i = this.pelletRespawnQueue.length - 1; i >= 0; i -= 1) {
      const queued = this.pelletRespawnQueue[i];
      queued.timeLeft -= deltaTime;

      if (queued.timeLeft > 0) {
        continue;
      }

      if (
        !this.hasPelletAt(queued.col, queued.row) &&
        !this.hasPowerOrbAt(queued.col, queued.row) &&
        !this.isReservedTile(queued.col, queued.row)
      ) {
        const center = this.getTileCenter(queued.col, queued.row);

        this.pellets.push({
          col: queued.col,
          row: queued.row,
          x: center.x,
          y: center.y,
          r: 4
        });

        this.pelletRespawnQueue.splice(i, 1);
      } else {
        queued.timeLeft = 1;
      }
    }

    for (let i = this.powerOrbRespawnQueue.length - 1; i >= 0; i -= 1) {
      const queued = this.powerOrbRespawnQueue[i];
      queued.timeLeft -= deltaTime;

      if (queued.timeLeft > 0) {
        continue;
      }

      if (this.powerOrbs.length < this.powerOrbCount) {
        this.spawnPowerOrbRandomly();
      }

      this.powerOrbRespawnQueue.splice(i, 1);
    }
  }

  draw(ctx, offsetX, offsetY) {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const x = offsetX + col * this.tileSize;
        const y = offsetY + row * this.tileSize;
        const cell = this.layout[row][col];

        if (cell === "#") {
          ctx.fillStyle = "#1d4ed8";
          ctx.fillRect(x, y, this.tileSize, this.tileSize);

          ctx.strokeStyle = "#60a5fa";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, this.tileSize, this.tileSize);
        } else {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
        }
      }
    }
  }

  drawCollectibles(ctx, offsetX, offsetY) {
    for (const pellet of this.pellets) {
      ctx.save();
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(offsetX + pellet.x, offsetY + pellet.y, pellet.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const orb of this.powerOrbs) {
      ctx.save();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(offsetX + orb.x, offsetY + orb.y, orb.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }
  }
}
