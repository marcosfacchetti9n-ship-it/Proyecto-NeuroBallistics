import { Brain } from "./ai/Brain";
import { GameLoop } from "./core/GameLoop";
import { PhysicsEngine } from "./core/PhysicsEngine";
import { World } from "./core/World";
import { Obstacle } from "./entities/Obstacle";
import { Projectile } from "./entities/Projectile";
import { Turret } from "./entities/Turret";
import { Vector2D } from "./math/Vector2D";
import { CanvasManager } from "./ui/CanvasManager";
import { Dashboard } from "./ui/Dashboard";
import { InputHandler } from "./ui/InputHandler";
import { Renderer } from "./ui/Renderer";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

const canvasManager = new CanvasManager(canvas);
canvasManager.resize(960, 540);

const world = new World(new Vector2D(0, 98.1));
const physicsEngine = new PhysicsEngine({
  fixedDeltaTime: 1 / 120,
  gridCellSize: 80
});

const turret = new Turret({
  id: "turret-1",
  position: new Vector2D(120, 400),
  radius: 24,
  mass: 10
});

const projectile = new Projectile({
  id: "projectile-1",
  position: new Vector2D(260, 150),
  radius: 12,
  mass: 1,
  velocity: new Vector2D(-40, 0)
});

const obstacle = new Obstacle({
  id: "obstacle-1",
  position: new Vector2D(500, 340),
  radius: 32
});

world.addBody(turret);
world.addBody(projectile);
world.addBody(obstacle);

const dashboard = new Dashboard(world);
dashboard.setGravity(new Vector2D(0, 98.1));

const input = new InputHandler();
input.attach(canvas);

const brain = new Brain();
brain.observe(world.getState());
brain.decide();

const renderer = new Renderer(canvasManager);
const loop = new GameLoop(physicsEngine, world, renderer);
loop.start();
