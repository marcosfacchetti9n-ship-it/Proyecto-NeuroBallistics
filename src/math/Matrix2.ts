import { Vector2D } from "./Vector2D";

/**
 * Minimal 2x2 matrix used for deterministic rotation transforms.
 */
export class Matrix2 {
  public readonly m11: number;
  public readonly m12: number;
  public readonly m21: number;
  public readonly m22: number;

  public constructor(m11: number, m12: number, m21: number, m22: number) {
    this.m11 = m11;
    this.m12 = m12;
    this.m21 = m21;
    this.m22 = m22;
  }

  public multiplyVector(vector: Vector2D): Vector2D {
    return new Vector2D(
      this.m11 * vector.x + this.m12 * vector.y,
      this.m21 * vector.x + this.m22 * vector.y
    );
  }

  public static rotation(angleRadians: number): Matrix2 {
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);
    return new Matrix2(cos, -sin, sin, cos);
  }
}
