import { Vector2D } from "../math/Vector2D";

export interface PhysicsMaterial {
  readonly restitution: number;
  readonly friction: number;
}

export interface PhysicsBodySnapshot {
  readonly id: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly velocity: { readonly x: number; readonly y: number };
  readonly acceleration: { readonly x: number; readonly y: number };
  readonly angle: number;
  readonly angularVelocity: number;
  readonly radius: number;
  readonly mass: number;
  readonly isStatic: boolean;
}

/**
 * Shared rigid body state for all simulated entities.
 */
export class PhysicsBody {
  public readonly id: string;
  public position: Vector2D;
  public velocity: Vector2D;
  public acceleration: Vector2D;
  public angle: number;
  public angularVelocity: number;
  public readonly radius: number;
  public readonly mass: number;
  public readonly inverseMass: number;
  public readonly isStatic: boolean;
  public readonly material: PhysicsMaterial;
  private accumulatedForce: Vector2D;

  public constructor(params: {
    id: string;
    position: Vector2D;
    radius: number;
    mass: number;
    velocity?: Vector2D;
    acceleration?: Vector2D;
    angle?: number;
    angularVelocity?: number;
    isStatic?: boolean;
    material?: Partial<PhysicsMaterial>;
  }) {
    const {
      id,
      position,
      radius,
      mass,
      velocity = Vector2D.zero,
      acceleration = Vector2D.zero,
      angle = 0,
      angularVelocity = 0,
      isStatic = false,
      material = {}
    } = params;

    if (radius <= 0) {
      throw new Error("PhysicsBody radius must be greater than zero.");
    }

    if (!isStatic && mass <= 0) {
      throw new Error("Dynamic PhysicsBody mass must be greater than zero.");
    }

    this.id = id;
    this.position = position;
    this.velocity = velocity;
    this.acceleration = acceleration;
    this.angle = angle;
    this.angularVelocity = angularVelocity;
    this.radius = radius;
    this.mass = isStatic ? Number.POSITIVE_INFINITY : mass;
    this.inverseMass = isStatic ? 0 : 1 / mass;
    this.isStatic = isStatic;
    this.material = {
      restitution: material.restitution ?? 0.6,
      friction: material.friction ?? 0.1
    };
    this.accumulatedForce = Vector2D.zero;
  }

  public applyForce(force: Vector2D): void {
    if (this.isStatic) {
      return;
    }

    this.accumulatedForce = this.accumulatedForce.add(force);
  }

  public clearForces(): void {
    this.accumulatedForce = Vector2D.zero;
  }

  public consumeForces(): Vector2D {
    const total = this.accumulatedForce;
    this.accumulatedForce = Vector2D.zero;
    return total;
  }

  public toSnapshot(): PhysicsBodySnapshot {
    return {
      id: this.id,
      position: this.position.toObject(),
      velocity: this.velocity.toObject(),
      acceleration: this.acceleration.toObject(),
      angle: this.angle,
      angularVelocity: this.angularVelocity,
      radius: this.radius,
      mass: this.mass,
      isStatic: this.isStatic
    };
  }
}
