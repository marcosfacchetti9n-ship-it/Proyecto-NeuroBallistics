import { PhysicsBody } from "./PhysicsBody";
import { Vector2D } from "../math/Vector2D";

export class Obstacle extends PhysicsBody {
  public constructor(params: {
    id: string;
    position: Vector2D;
    radius: number;
  }) {
    super({
      id: params.id,
      position: params.position,
      radius: params.radius,
      mass: 1,
      isStatic: true,
      material: {
        restitution: 0.4,
        friction: 0.6
      }
    });
  }
}
