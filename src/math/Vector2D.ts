/**
 * Immutable-friendly 2D vector utility used across simulation, AI, and rendering.
 * All methods return new vectors unless they are explicitly named as mutating.
 */
export class Vector2D {
  public static readonly zero = new Vector2D(0, 0);

  public readonly x: number;
  public readonly y: number;

  public constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  public clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  public add(other: Vector2D): Vector2D {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }

  public subtract(other: Vector2D): Vector2D {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }

  public scale(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  public divide(scalar: number): Vector2D {
    if (scalar === 0) {
      throw new Error("Cannot divide a vector by zero.");
    }

    return new Vector2D(this.x / scalar, this.y / scalar);
  }

  public negate(): Vector2D {
    return new Vector2D(-this.x, -this.y);
  }

  public dot(other: Vector2D): number {
    return this.x * other.x + this.y * other.y;
  }

  public cross(other: Vector2D): number {
    return this.x * other.y - this.y * other.x;
  }

  public magnitudeSquared(): number {
    return this.dot(this);
  }

  public magnitude(): number {
    return Math.sqrt(this.magnitudeSquared());
  }

  public normalize(): Vector2D {
    const length = this.magnitude();
    if (length === 0) {
      return Vector2D.zero;
    }

    return this.divide(length);
  }

  public perpendicular(): Vector2D {
    return new Vector2D(-this.y, this.x);
  }

  public distanceTo(other: Vector2D): number {
    return this.subtract(other).magnitude();
  }

  public distanceSquaredTo(other: Vector2D): number {
    return this.subtract(other).magnitudeSquared();
  }

  public projectOnto(axis: Vector2D): Vector2D {
    const normalizedAxis = axis.normalize();
    return normalizedAxis.scale(this.dot(normalizedAxis));
  }

  public lerp(target: Vector2D, alpha: number): Vector2D {
    return new Vector2D(
      this.x + (target.x - this.x) * alpha,
      this.y + (target.y - this.y) * alpha
    );
  }

  public equals(other: Vector2D, epsilon: number = 1e-6): boolean {
    return (
      Math.abs(this.x - other.x) <= epsilon &&
      Math.abs(this.y - other.y) <= epsilon
    );
  }

  public toObject(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public static fromAngle(angleRadians: number, magnitude: number = 1): Vector2D {
    return new Vector2D(
      Math.cos(angleRadians) * magnitude,
      Math.sin(angleRadians) * magnitude
    );
  }
}
