import { World } from "../core/World";
import { Vector2D } from "../math/Vector2D";

export class Dashboard {
  public constructor(private readonly world: World) {}

  public setGravity(value: Vector2D): void {
    this.world.gravity = value;
  }
}
