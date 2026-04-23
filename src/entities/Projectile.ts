import { PhysicsBody } from "./PhysicsBody";
import { Vector2D } from "../math/Vector2D";

export class Projectile extends PhysicsBody {
  public readonly damage: number;
  public ttlSeconds: number;

  public constructor(params: {
    id: string;
    position: Vector2D;
    radius: number;
    mass: number;
    velocity: Vector2D;
    damage?: number;
    ttlSeconds?: number;
  }) {
    super({
      id: params.id,
      position: params.position,
      radius: params.radius,
      mass: params.mass,
      velocity: params.velocity
    });

    this.damage = params.damage ?? 1;
    this.ttlSeconds = params.ttlSeconds ?? 10;
  }
}
