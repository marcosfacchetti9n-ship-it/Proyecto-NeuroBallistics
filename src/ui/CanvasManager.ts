export class CanvasManager {
  public readonly canvas: HTMLCanvasElement;
  public readonly context: CanvasRenderingContext2D;

  public constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Unable to acquire 2D canvas context.");
    }

    this.canvas = canvas;
    this.context = context;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
