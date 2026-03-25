export class FiniteStateMachine {
  constructor(initialState, states = {}) {
    this.currentState = initialState;
    this.states = states;
    this.stateTime = 0;
  }

  addState(name, config) {
    this.states[name] = config;
  }

  setState(name, owner) {
    if (this.currentState === name) {
      return;
    }

    const current = this.states[this.currentState];
    if (current && current.exit) {
      current.exit(owner);
    }

    this.currentState = name;
    this.stateTime = 0;

    const next = this.states[this.currentState];
    if (next && next.enter) {
      next.enter(owner);
    }
  }

  update(owner, deltaTime) {
    this.stateTime += deltaTime;
    const state = this.states[this.currentState];
    if (state && state.update) {
      state.update(owner, deltaTime);
    }
  }
}
