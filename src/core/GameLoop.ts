import { PhysicsEngine } from "./PhysicsEngine";
import { World } from "./World";

export interface GameLoopRenderer {
  render(world: World, alpha: number): void;
}

/**
 * Fixed-timestep loop that decouples deterministic simulation from variable-rate rendering.
 */
export class GameLoop {
  private accumulatorSeconds = 0;
  private lastTimestampMs = 0;
  private frameHandle: number | null = null;

  public constructor(
    private readonly physicsEngine: PhysicsEngine,
    private readonly world: World,
    private readonly renderer: GameLoopRenderer
  ) {}

  public start(): void {
    if (this.frameHandle !== null) {
      return;
    }

    this.lastTimestampMs = performance.now();
    this.frameHandle = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    if (this.frameHandle === null) {
      return;
    }

    cancelAnimationFrame(this.frameHandle);
    this.frameHandle = null;
  }

  private readonly tick = (timestampMs: number): void => {
    const frameDeltaSeconds = (timestampMs - this.lastTimestampMs) / 1000;
    this.lastTimestampMs = timestampMs;
    this.accumulatorSeconds += Math.min(frameDeltaSeconds, 0.25);

    while (this.accumulatorSeconds >= this.physicsEngine.fixedDeltaTime) {
      this.physicsEngine.step(this.world);
      this.accumulatorSeconds -= this.physicsEngine.fixedDeltaTime;
    }

    const alpha = this.accumulatorSeconds / this.physicsEngine.fixedDeltaTime;
    this.renderer.render(this.world, alpha);
    this.frameHandle = requestAnimationFrame(this.tick);
  };
}
