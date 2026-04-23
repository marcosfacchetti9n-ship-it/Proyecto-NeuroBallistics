import { PhysicsBody, PhysicsBodySnapshot } from "../entities/PhysicsBody";
import { Vector2D } from "../math/Vector2D";

export interface WorldState {
  readonly timeSeconds: number;
  readonly gravity: { readonly x: number; readonly y: number };
  readonly bodies: readonly PhysicsBodySnapshot[];
}

/**
 * Mutable simulation container that owns bodies but exposes read-only snapshots.
 */
export class World {
  private readonly bodies = new Map<string, PhysicsBody>();
  private elapsedTimeSeconds = 0;
  public gravity: Vector2D;

  public constructor(gravity: Vector2D = new Vector2D(0, 98.1)) {
    this.gravity = gravity;
  }

  public addBody(body: PhysicsBody): void {
    this.bodies.set(body.id, body);
  }

  public removeBody(id: string): void {
    this.bodies.delete(id);
  }

  public getBodies(): readonly PhysicsBody[] {
    return Array.from(this.bodies.values());
  }

  public getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }

  public advanceTime(dt: number): void {
    this.elapsedTimeSeconds += dt;
  }

  public getState(): WorldState {
    return {
      timeSeconds: this.elapsedTimeSeconds,
      gravity: this.gravity.toObject(),
      bodies: this.getBodies().map((body) => body.toSnapshot())
    };
  }
}
