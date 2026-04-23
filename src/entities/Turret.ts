import { PhysicsBody } from "./PhysicsBody";
import { Vector2D } from "../math/Vector2D";

export interface TurretControlSignal {
  readonly targetAngle: number;
  readonly fire: boolean;
}

export class Turret extends PhysicsBody {
  public barrelLength: number;
  public readonly turnRate: number;

  public constructor(params: {
    id: string;
    position: Vector2D;
    radius: number;
    mass: number;
    barrelLength?: number;
    turnRate?: number;
    isStatic?: boolean;
  }) {
    super({
      id: params.id,
      position: params.position,
      radius: params.radius,
      mass: params.mass,
      isStatic: params.isStatic ?? true
    });

    this.barrelLength = params.barrelLength ?? 32;
    this.turnRate = params.turnRate ?? Math.PI;
  }
}
