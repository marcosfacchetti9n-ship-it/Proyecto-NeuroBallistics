import { World } from "./World";
import { PhysicsBody } from "../entities/PhysicsBody";
import { Vector2D } from "../math/Vector2D";
import { EPSILON } from "../math/Utilities";

interface CollisionPair {
  readonly a: PhysicsBody;
  readonly b: PhysicsBody;
}

interface Contact {
  readonly a: PhysicsBody;
  readonly b: PhysicsBody;
  readonly normal: Vector2D;
  readonly penetration: number;
}

export interface PhysicsEngineConfig {
  readonly fixedDeltaTime: number;
  readonly gridCellSize: number;
  readonly gravityEnabled: boolean;
}

/**
 * Deterministic rigid-body solver using:
 * - fixed timestep integration
 * - F = m * a (Newton's second law)
 * - impulse-based collision response: j = -(1 + e) * (v_rel dot n) / invMassSum
 */
export class PhysicsEngine {
  private readonly config: PhysicsEngineConfig;

  public constructor(config?: Partial<PhysicsEngineConfig>) {
    this.config = {
      fixedDeltaTime: config?.fixedDeltaTime ?? 1 / 120,
      gridCellSize: config?.gridCellSize ?? 64,
      gravityEnabled: config?.gravityEnabled ?? true
    };
  }

  public get fixedDeltaTime(): number {
    return this.config.fixedDeltaTime;
  }

  public step(world: World): void {
    const bodies = world.getBodies();

    for (const body of bodies) {
      this.integrateBody(body, world.gravity, this.config.fixedDeltaTime);
    }

    const contacts = this.detectContacts(bodies);
    for (const contact of contacts) {
      this.resolveContact(contact);
      this.correctPositions(contact);
    }

    world.advanceTime(this.config.fixedDeltaTime);
  }

  private integrateBody(body: PhysicsBody, gravity: Vector2D, dt: number): void {
    if (body.isStatic) {
      body.clearForces();
      return;
    }

    const totalForce = body.consumeForces();
    const gravityForce = this.config.gravityEnabled ? gravity.scale(body.mass) : Vector2D.zero;

    /**
     * Newton's second law:
     * acceleration = sumForces / mass
     */
    const nextAcceleration = totalForce.add(gravityForce).scale(body.inverseMass);
    body.acceleration = nextAcceleration;

    /**
     * Semi-implicit Euler integration:
     * v(t + dt) = v(t) + a * dt
     * x(t + dt) = x(t) + v(t + dt) * dt
     */
    body.velocity = body.velocity.add(nextAcceleration.scale(dt));
    body.position = body.position.add(body.velocity.scale(dt));
    body.angle += body.angularVelocity * dt;
  }

  private detectContacts(bodies: readonly PhysicsBody[]): Contact[] {
    const grid = new Map<string, PhysicsBody[]>();
    const pairs: CollisionPair[] = [];
    const pairKeys = new Set<string>();

    for (const body of bodies) {
      const cellKey = this.getCellKey(body.position);
      const occupants = grid.get(cellKey) ?? [];

      for (const other of occupants) {
        const pairKey = body.id < other.id ? `${body.id}|${other.id}` : `${other.id}|${body.id}`;
        if (!pairKeys.has(pairKey)) {
          pairKeys.add(pairKey);
          pairs.push({ a: body, b: other });
        }
      }

      for (const neighborKey of this.getNeighborKeys(body.position)) {
        const neighbors = grid.get(neighborKey) ?? [];
        for (const other of neighbors) {
          const pairKey = body.id < other.id ? `${body.id}|${other.id}` : `${other.id}|${body.id}`;
          if (!pairKeys.has(pairKey)) {
            pairKeys.add(pairKey);
            pairs.push({ a: body, b: other });
          }
        }
      }

      occupants.push(body);
      grid.set(cellKey, occupants);
    }

    const contacts: Contact[] = [];
    for (const pair of pairs) {
      const contact = this.computeCircleContact(pair.a, pair.b);
      if (contact !== null) {
        contacts.push(contact);
      }
    }

    return contacts;
  }

  private computeCircleContact(a: PhysicsBody, b: PhysicsBody): Contact | null {
    if (a.isStatic && b.isStatic) {
      return null;
    }

    const delta = b.position.subtract(a.position);
    const radiusSum = a.radius + b.radius;
    const distanceSquared = delta.magnitudeSquared();

    if (distanceSquared >= radiusSum * radiusSum) {
      return null;
    }

    const distance = Math.sqrt(distanceSquared);
    const normal =
      distance <= EPSILON ? new Vector2D(1, 0) : delta.scale(1 / distance);

    return {
      a,
      b,
      normal,
      penetration: radiusSum - distance
    };
  }

  private resolveContact(contact: Contact): void {
    const { a, b, normal } = contact;
    const relativeVelocity = b.velocity.subtract(a.velocity);
    const separatingVelocity = relativeVelocity.dot(normal);

    if (separatingVelocity > 0) {
      return;
    }

    const restitution = Math.min(a.material.restitution, b.material.restitution);
    const inverseMassSum = a.inverseMass + b.inverseMass;

    if (inverseMassSum <= EPSILON) {
      return;
    }

    /**
     * Impulse scalar:
     * j = -(1 + e) * (v_rel dot n) / (invMassA + invMassB)
     */
    const impulseMagnitude = (-(1 + restitution) * separatingVelocity) / inverseMassSum;
    const impulse = normal.scale(impulseMagnitude);

    if (!a.isStatic) {
      a.velocity = a.velocity.subtract(impulse.scale(a.inverseMass));
    }

    if (!b.isStatic) {
      b.velocity = b.velocity.add(impulse.scale(b.inverseMass));
    }

    this.applyFrictionImpulse(contact);
  }

  private applyFrictionImpulse(contact: Contact): void {
    const { a, b, normal } = contact;
    const relativeVelocity = b.velocity.subtract(a.velocity);
    const tangentCandidate = relativeVelocity.subtract(normal.scale(relativeVelocity.dot(normal)));

    if (tangentCandidate.magnitudeSquared() <= EPSILON) {
      return;
    }

    const tangent = tangentCandidate.normalize();
    const inverseMassSum = a.inverseMass + b.inverseMass;
    if (inverseMassSum <= EPSILON) {
      return;
    }

    const jt = -relativeVelocity.dot(tangent) / inverseMassSum;
    const frictionCoefficient = Math.sqrt(a.material.friction * b.material.friction);
    const frictionImpulse = tangent.scale(jt * frictionCoefficient);

    if (!a.isStatic) {
      a.velocity = a.velocity.subtract(frictionImpulse.scale(a.inverseMass));
    }

    if (!b.isStatic) {
      b.velocity = b.velocity.add(frictionImpulse.scale(b.inverseMass));
    }
  }

  private correctPositions(contact: Contact): void {
    const percent = 0.8;
    const slop = 0.01;
    const inverseMassSum = contact.a.inverseMass + contact.b.inverseMass;

    if (inverseMassSum <= EPSILON) {
      return;
    }

    const correctionMagnitude =
      (Math.max(contact.penetration - slop, 0) / inverseMassSum) * percent;
    const correction = contact.normal.scale(correctionMagnitude);

    if (!contact.a.isStatic) {
      contact.a.position = contact.a.position.subtract(correction.scale(contact.a.inverseMass));
    }

    if (!contact.b.isStatic) {
      contact.b.position = contact.b.position.add(correction.scale(contact.b.inverseMass));
    }
  }

  private getCellKey(position: Vector2D): string {
    const x = Math.floor(position.x / this.config.gridCellSize);
    const y = Math.floor(position.y / this.config.gridCellSize);
    return `${x},${y}`;
  }

  private getNeighborKeys(position: Vector2D): string[] {
    const baseX = Math.floor(position.x / this.config.gridCellSize);
    const baseY = Math.floor(position.y / this.config.gridCellSize);
    const keys: string[] = [];

    for (let y = baseY - 1; y <= baseY + 1; y += 1) {
      for (let x = baseX - 1; x <= baseX + 1; x += 1) {
        keys.push(`${x},${y}`);
      }
    }

    return keys;
  }
}
