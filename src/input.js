export class InputHandler {
  constructor() {
    this.keys = new Set();
    this.mouse = {
      x: 0,
      y: 0,
      down: false
    };
  }
}
