import { World } from "../core/World";
import { GameLoopRenderer } from "../core/GameLoop";
import { CanvasManager } from "./CanvasManager";

export class Renderer implements GameLoopRenderer {
  public constructor(private readonly canvasManager: CanvasManager) {}

  public render(world: World, _alpha: number): void {
    const { context, canvas } = this.canvasManager;
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const body of world.getBodies()) {
      context.beginPath();
      context.arc(body.position.x, body.position.y, body.radius, 0, Math.PI * 2);
      context.fillStyle = body.isStatic ? "#6b7280" : "#0f766e";
      context.fill();
      context.closePath();
    }
  }
}
