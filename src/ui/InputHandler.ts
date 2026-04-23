import { AgentControlSignal } from "../ai/AgentInterface";

export interface ManualControlState extends AgentControlSignal {}

export class InputHandler {
  private state: ManualControlState = {
    targetAngle: 0,
    fire: false
  };

  public attach(element: HTMLElement): void {
    element.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  public detach(element: HTMLElement): void {
    element.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  public getState(): ManualControlState {
    return { ...this.state };
  }

  private readonly handleMouseMove = (event: MouseEvent): void => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    this.state = {
      ...this.state,
      targetAngle: Math.atan2(dy, dx)
    };
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === "Space") {
      this.state = {
        ...this.state,
        fire: true
      };
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (event.code === "Space") {
      this.state = {
        ...this.state,
        fire: false
      };
    }
  };
}
