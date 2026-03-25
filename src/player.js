export class Player {
  constructor(x, y, size = 12) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = 60;
    this.color = "#facc15";
    this.lives = 3;
    this.score = 0;

    this.dirX = 0;
    this.dirY = 0;
    this.nextDirX = 0;
    this.nextDirY = 0;

    this.lastProcessedCol = null;
    this.lastProcessedRow = null;
  }

  handleInput(input) {
    if (input.keys.has("ArrowUp") || input.keys.has("w") || input.keys.has("W")) {
      this.nextDirX = 0;
      this.nextDirY = -1;
    } else if (input.keys.has("ArrowDown") || input.keys.has("s") || input.keys.has("S")) {
      this.nextDirX = 0;
      this.nextDirY = 1;
    } else if (input.keys.has("ArrowLeft") || input.keys.has("a") || input.keys.has("A")) {
      this.nextDirX = -1;
      this.nextDirY = 0;
    } else if (input.keys.has("ArrowRight") || input.keys.has("d") || input.keys.has("D")) {
      this.nextDirX = 1;
      this.nextDirY = 0;
    }
  }

  atCenter(maze) {
    return maze.isNearTileCenter(this.x, this.y, 6);
  }

  alignToCenter(maze) {
    const snapped = maze.snapToTileCenter(this.x, this.y);
    this.x = snapped.x;
    this.y = snapped.y;
  }

  update(deltaTime, input, maze) {
    this.handleInput(input);

    const nearCenter = this.atCenter(maze);
    const tile = maze.getTileFromPixel(this.x, this.y);
    const isStopped = this.dirX === 0 && this.dirY === 0;
    const isNewCenterTile =
      tile.col !== this.lastProcessedCol || tile.row !== this.lastProcessedRow;

    if (nearCenter && (isNewCenterTile || isStopped)) {
      this.alignToCenter(maze);

      this.lastProcessedCol = tile.col;
      this.lastProcessedRow = tile.row;

      const wantsBufferedTurn = this.nextDirX !== 0 || this.nextDirY !== 0;

      if (wantsBufferedTurn && maze.canMove(this.x, this.y, this.nextDirX, this.nextDirY)) {
        this.dirX = this.nextDirX;
        this.dirY = this.nextDirY;
      }

      const hasCurrentDirection = this.dirX !== 0 || this.dirY !== 0;

      if (hasCurrentDirection && !maze.canMove(this.x, this.y, this.dirX, this.dirY)) {
        this.dirX = 0;
        this.dirY = 0;
      }
    }

    this.x += this.dirX * this.speed * deltaTime;
    this.y += this.dirY * this.speed * deltaTime;
  }

  draw(ctx, offsetX, offsetY) {
    let startAngle = 0.2 * Math.PI;
    let endAngle = 1.8 * Math.PI;

    if (this.dirX === -1) {
      startAngle = 1.2 * Math.PI;
      endAngle = 0.8 * Math.PI;
    } else if (this.dirY === -1) {
      startAngle = 1.7 * Math.PI;
      endAngle = 1.3 * Math.PI;
    } else if (this.dirY === 1) {
      startAngle = 0.7 * Math.PI;
      endAngle = 0.3 * Math.PI;
    }

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(offsetX + this.x, offsetY + this.y, this.size, startAngle, endAngle);
    ctx.lineTo(offsetX + this.x, offsetY + this.y);
    ctx.fill();
    ctx.restore();
  }
}
