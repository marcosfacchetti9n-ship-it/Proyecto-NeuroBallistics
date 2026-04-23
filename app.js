class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }

  subtract(other) {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }

  scale(scalar) {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  dot(other) {
    return this.x * other.x + this.y * other.y;
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const length = this.magnitude();
    return length === 0 ? new Vector2D(0, 0) : this.scale(1 / length);
  }

  static fromAngle(angle, magnitude = 1) {
    return new Vector2D(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }
}

class Projectile {
  constructor({ position, velocity, radius, mass, color }) {
    this.position = position;
    this.velocity = velocity;
    this.acceleration = new Vector2D(0, 0);
    this.radius = radius;
    this.mass = mass;
    this.inverseMass = mass > 0 ? 1 / mass : 0;
    this.color = color;
    this.alive = true;
    this.restingFrames = 0;
  }
}

class CircularObstacle {
  constructor(x, y, radius) {
    this.position = new Vector2D(x, y);
    this.radius = radius;
  }
}

class Turret {
  constructor(x, y) {
    this.basePosition = new Vector2D(x, y);
    this.angle = -Math.PI / 4;
    this.barrelLength = 72;
    this.cooldown = 0;
  }
}

class PhysicsWorld {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.gravity = 160;
    this.groundFriction = 0.72;
    this.restitution = 0.74;
    this.projectileMass = 1.5;
    this.muzzleSpeed = 520;
    this.airDrag = 0.0008;
    this.projectiles = [];
    this.obstacles = [
      new CircularObstacle(width * 0.56, height * 0.64, 36),
      new CircularObstacle(width * 0.72, height * 0.5, 46),
      new CircularObstacle(width * 0.83, height * 0.7, 28)
    ];
    this.time = 0;
    this.collisionCount = 0;
  }

  reset() {
    this.projectiles = [];
    this.time = 0;
    this.collisionCount = 0;
  }

  spawnProjectile(turret) {
    const muzzle = turret.basePosition.add(
      Vector2D.fromAngle(turret.angle, turret.barrelLength)
    );
    const radius = 8 + this.projectileMass * 1.6;
    const projectile = new Projectile({
      position: muzzle,
      velocity: Vector2D.fromAngle(turret.angle, this.muzzleSpeed),
      radius,
      mass: this.projectileMass,
      color: `hsl(${18 + Math.random() * 18} 85% ${52 + Math.random() * 8}%)`
    });
    this.projectiles.push(projectile);
    return projectile;
  }

  step(dt) {
    this.time += dt;

    for (const projectile of this.projectiles) {
      if (!projectile.alive) {
        continue;
      }

      projectile.acceleration = new Vector2D(0, this.gravity);
      projectile.velocity = projectile.velocity.add(projectile.acceleration.scale(dt));
      projectile.velocity = projectile.velocity.scale(Math.max(0, 1 - this.airDrag));
      projectile.position = projectile.position.add(projectile.velocity.scale(dt));

      this.resolveBounds(projectile);
      for (const obstacle of this.obstacles) {
        this.resolveObstacleCollision(projectile, obstacle);
      }

      if (projectile.velocity.magnitude() < 6 && projectile.position.y + projectile.radius >= this.height - 26.5) {
        projectile.restingFrames += 1;
      } else {
        projectile.restingFrames = 0;
      }

      if (projectile.position.x < -200 || projectile.position.x > this.width + 200) {
        projectile.alive = false;
      }

      if (projectile.restingFrames > 240) {
        projectile.alive = false;
      }
    }

    this.resolveProjectileCollisions();

    for (const projectile of this.projectiles) {
      if (!projectile.alive) {
        continue;
      }

      for (const obstacle of this.obstacles) {
        this.resolveObstacleCollision(projectile, obstacle);
      }
    }

    this.projectiles = this.projectiles.filter((projectile) => projectile.alive);
  }

  resolveProjectileCollisions() {
    for (let i = 0; i < this.projectiles.length; i += 1) {
      const a = this.projectiles[i];
      if (!a.alive) {
        continue;
      }

      for (let j = i + 1; j < this.projectiles.length; j += 1) {
        const b = this.projectiles[j];
        if (!b.alive) {
          continue;
        }

        const delta = b.position.subtract(a.position);
        const distance = delta.magnitude();
        const minDistance = a.radius + b.radius;

        if (distance === 0 || distance >= minDistance) {
          continue;
        }

        const normal = delta.normalize();
        const tangent = new Vector2D(-normal.y, normal.x);
        const penetration = minDistance - distance;
        const correction = normal.scale(penetration / 2);

        a.position = a.position.subtract(correction);
        b.position = b.position.add(correction);

        const relativeVelocity = b.velocity.subtract(a.velocity);
        const velocityAlongNormal = relativeVelocity.dot(normal);
        if (velocityAlongNormal > 0) {
          continue;
        }

        const restitution = this.restitution * 0.96;
        const impulseMagnitude =
          (-(1 + restitution) * velocityAlongNormal) /
          (a.inverseMass + b.inverseMass);
        const impulse = normal.scale(impulseMagnitude);

        a.velocity = a.velocity.subtract(impulse.scale(a.inverseMass));
        b.velocity = b.velocity.add(impulse.scale(b.inverseMass));
        this.collisionCount += 1;

        const tangentSpeed = relativeVelocity.dot(tangent);
        const frictionImpulse = tangent.scale(
          tangentSpeed * 0.08 / (a.inverseMass + b.inverseMass)
        );
        a.velocity = a.velocity.add(frictionImpulse.scale(a.inverseMass));
        b.velocity = b.velocity.subtract(frictionImpulse.scale(b.inverseMass));
      }
    }
  }

  resolveBounds(projectile) {
    const floorY = this.height - 26;
    const ceilingY = 0;
    const leftX = 0;
    const rightX = this.width;

    if (projectile.position.y + projectile.radius >= floorY) {
      projectile.position = new Vector2D(projectile.position.x, floorY - projectile.radius);
      projectile.velocity = new Vector2D(
        projectile.velocity.x * this.groundFriction,
        -Math.abs(projectile.velocity.y) * this.restitution
      );

      if (Math.abs(projectile.velocity.y) < 10) {
        projectile.velocity = new Vector2D(projectile.velocity.x * 0.92, 0);
      }
    }

    if (projectile.position.y - projectile.radius <= ceilingY) {
      projectile.position = new Vector2D(projectile.position.x, ceilingY + projectile.radius);
      projectile.velocity = new Vector2D(
        projectile.velocity.x,
        Math.abs(projectile.velocity.y) * this.restitution
      );
    }

    if (projectile.position.x - projectile.radius <= leftX) {
      projectile.position = new Vector2D(leftX + projectile.radius, projectile.position.y);
      projectile.velocity = new Vector2D(
        Math.abs(projectile.velocity.x) * this.restitution,
        projectile.velocity.y
      );
    }

    if (projectile.position.x + projectile.radius >= rightX) {
      projectile.position = new Vector2D(rightX - projectile.radius, projectile.position.y);
      projectile.velocity = new Vector2D(
        -Math.abs(projectile.velocity.x) * this.restitution,
        projectile.velocity.y
      );
    }
  }

  resolveObstacleCollision(projectile, obstacle) {
    const delta = projectile.position.subtract(obstacle.position);
    const distance = delta.magnitude();
    const minDistance = projectile.radius + obstacle.radius;

    if (distance === 0 || distance >= minDistance) {
      return;
    }

    const normal = delta.normalize();
    const penetration = minDistance - distance;
    projectile.position = projectile.position.add(normal.scale(penetration));

    const separatingVelocity = projectile.velocity.dot(normal);
    if (separatingVelocity < 0) {
      const impulseMagnitude = -(1 + this.restitution) * separatingVelocity;
      projectile.velocity = projectile.velocity.add(normal.scale(impulseMagnitude));
      this.collisionCount += 1;

      const tangent = new Vector2D(-normal.y, normal.x);
      const tangentSpeed = projectile.velocity.dot(tangent);
      projectile.velocity = projectile.velocity.subtract(
        tangent.scale(tangentSpeed * 0.14)
      );
    }
  }
}

class Renderer {
  constructor(canvas, world, turret) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.world = world;
    this.turret = turret;
    this.showTrails = true;
    this.trails = [];
  }

  toggleTrails() {
    this.showTrails = !this.showTrails;
    if (!this.showTrails) {
      this.trails = [];
    }
    return this.showTrails;
  }

  render() {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.showTrails) {
      this.renderTrails();
    }

    this.renderBackground();
    this.renderObstacles();
    this.renderTurret();
    this.renderProjectiles();
  }

  renderBackground() {
    const ctx = this.context;
    const floorY = this.canvas.height - 26;

    ctx.save();
    ctx.strokeStyle = "rgba(30, 41, 59, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.canvas.width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, floorY);
      ctx.stroke();
    }
    for (let y = 0; y <= floorY; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "#c8ad82";
    ctx.fillRect(0, floorY, this.canvas.width, this.canvas.height - floorY);

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(0, floorY, this.canvas.width, 5);
  }

  renderObstacles() {
    const ctx = this.context;
    for (const obstacle of this.world.obstacles) {
      ctx.beginPath();
      ctx.arc(obstacle.position.x, obstacle.position.y, obstacle.radius, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        obstacle.position.x - 8,
        obstacle.position.y - 10,
        6,
        obstacle.position.x,
        obstacle.position.y,
        obstacle.radius
      );
      gradient.addColorStop(0, "#f7ecd8");
      gradient.addColorStop(1, "#7c5b3b");
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = "rgba(30, 41, 59, 0.22)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  renderTurret() {
    const ctx = this.context;
    const base = this.turret.basePosition;
    const muzzle = base.add(Vector2D.fromAngle(this.turret.angle, this.turret.barrelLength));
    const standTop = base.y + 6;

    ctx.save();
    ctx.strokeStyle = "rgba(194, 65, 12, 0.22)";
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(base.x + Math.cos(this.turret.angle) * 180, base.y + Math.sin(this.turret.angle) * 180);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.save();
    ctx.lineCap = "round";
    ctx.fillStyle = "#7c2d12";
    ctx.fillRect(base.x - 12, standTop, 24, 44);
    ctx.fillStyle = "#57534e";
    ctx.fillRect(base.x - 42, standTop + 38, 84, 18);

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(muzzle.x, muzzle.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(base.x, base.y, 28, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(base.x - 10, base.y - 10, 4, base.x, base.y, 28);
    gradient.addColorStop(0, "#f2e8d6");
    gradient.addColorStop(1, "#b45309");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(base.x, base.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#1f2937";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(muzzle.x, muzzle.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#fb923c";
    ctx.fill();
    ctx.restore();
  }

  renderProjectiles() {
    const ctx = this.context;
    for (const projectile of this.world.projectiles) {
      if (this.showTrails) {
        this.trails.push({
          x: projectile.position.x,
          y: projectile.position.y,
          radius: Math.max(2, projectile.radius * 0.35),
          life: 1,
          color: projectile.color
        });
      }

      ctx.beginPath();
      ctx.arc(projectile.position.x, projectile.position.y, projectile.radius, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        projectile.position.x - projectile.radius * 0.4,
        projectile.position.y - projectile.radius * 0.4,
        2,
        projectile.position.x,
        projectile.position.y,
        projectile.radius
      );
      gradient.addColorStop(0, "#fff7ed");
      gradient.addColorStop(1, projectile.color);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  renderTrails() {
    const ctx = this.context;
    this.trails = this.trails
      .map((trail) => ({ ...trail, life: trail.life - 0.04 }))
      .filter((trail) => trail.life > 0);

    for (const trail of this.trails) {
      ctx.beginPath();
      ctx.globalAlpha = trail.life * 0.28;
      ctx.fillStyle = trail.color;
      ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

const canvas = document.getElementById("lab-canvas");
const projectileCountEl = document.getElementById("projectile-count");
const lastSpeedEl = document.getElementById("last-speed");
const simTimeEl = document.getElementById("sim-time");
const collisionCountEl = document.getElementById("collision-count");
const hitCountEl = document.getElementById("hit-count");
const scoreCountEl = document.getElementById("score-count");
const accuracyEl = document.getElementById("accuracy");
const modeLabelEl = document.getElementById("mode-label");
const statusLabelEl = document.getElementById("status-label");

const gravityInput = document.getElementById("gravity");
const gravityValue = document.getElementById("gravity-value");
const frictionInput = document.getElementById("friction");
const frictionValue = document.getElementById("friction-value");
const massInput = document.getElementById("mass");
const massValue = document.getElementById("mass-value");
const speedInput = document.getElementById("speed");
const speedValue = document.getElementById("speed-value");
const clearButton = document.getElementById("clear-projectiles");
const trailButton = document.getElementById("toggle-trails");
const trajectoryButton = document.getElementById("toggle-trajectory");
const autoFireButton = document.getElementById("toggle-autofire");
const aiAimButton = document.getElementById("toggle-ai");
const resetButton = document.getElementById("reset-sim");

const world = new PhysicsWorld(canvas.width, canvas.height);
const turret = new Turret(120, canvas.height - 54);
const renderer = new Renderer(canvas, world, turret);

const target = {
  position: new Vector2D(canvas.width * 0.78, canvas.height * 0.35),
  velocity: new Vector2D(90, 0),
  radius: 18
};

let hitCount = 0;
let scoreCount = 0;
let shotsFired = 0;

const inputState = {
  pointer: new Vector2D(canvas.width * 0.5, canvas.height * 0.3),
  firing: false,
  queuedShots: 0,
  autoFire: false,
  aiAim: false,
  showTrajectory: true
};

function syncControls() {
  world.gravity = Number(gravityInput.value);
  world.groundFriction = Number(frictionInput.value);
  world.projectileMass = Number(massInput.value);
  world.muzzleSpeed = Number(speedInput.value);

  gravityValue.value = gravityInput.value;
  frictionValue.value = frictionInput.value;
  massValue.value = massInput.value;
  speedValue.value = speedInput.value;
}

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function solveBallisticAngle(origin, destination, speed, gravity) {
  const dx = destination.x - origin.x;
  const dy = destination.y - origin.y;

  if (Math.abs(dx) < 1e-6 || speed <= 0 || gravity <= 0) {
    return null;
  }

  // With +y downward, the trajectory equation becomes:
  // dy = dx*tan(theta) + (g*dx^2)/(2*v^2) * (1 + tan^2(theta))
  const gdx2 = gravity * dx * dx;
  const v2 = speed * speed;
  const a = gdx2 / (2 * v2);
  const b = dx;
  const c = a - dy;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null;
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b + sqrtDisc) / (2 * a);
  const t2 = (-b - sqrtDisc) / (2 * a);

  const candidates = [t1, t2]
    .map((tangent) => {
      let angle = Math.atan(tangent);
      if (dx < 0) {
        angle += Math.PI;
      }
      angle = normalizeAngle(angle);
      const vx = Math.cos(angle) * speed;
      if (Math.sign(vx) !== Math.sign(dx)) {
        return null;
      }
      return angle;
    })
    .filter(Boolean);

  if (candidates.length === 0) {
    return null;
  }

  // Prefer the flatter shot (smaller absolute angle).
  candidates.sort((left, right) => Math.abs(left) - Math.abs(right));
  return candidates[0];
}

function aimWithLead(origin, targetPosition, targetVelocity, speed, gravity) {
  let estimatedTime = 0.45;
  let predicted = targetPosition;
  let angle = null;

  for (let i = 0; i < 6; i += 1) {
    predicted = targetPosition.add(targetVelocity.scale(estimatedTime));
    angle = solveBallisticAngle(origin, predicted, speed, gravity);
    if (angle === null) {
      return null;
    }

    const dx = predicted.x - origin.x;
    const vx = Math.cos(angle) * speed;
    if (Math.abs(vx) <= 1e-6) {
      return null;
    }

    const nextTime = Math.abs(dx / vx);
    if (!Number.isFinite(nextTime) || nextTime <= 0) {
      return null;
    }

    if (Math.abs(nextTime - estimatedTime) < 0.01) {
      estimatedTime = nextTime;
      break;
    }
    estimatedTime = nextTime;
  }

  return {
    angle,
    predicted
  };
}

function predictTrajectory(origin, angle, speed, dt, steps) {
  const points = [];
  let position = origin;
  let velocity = Vector2D.fromAngle(angle, speed);

  for (let i = 0; i < steps; i += 1) {
    velocity = velocity.add(new Vector2D(0, world.gravity).scale(dt));
    velocity = velocity.scale(Math.max(0, 1 - world.airDrag));
    position = position.add(velocity.scale(dt));

    points.push(position);

    if (position.x < -50 || position.x > canvas.width + 50) {
      break;
    }
    if (position.y < -50 || position.y > canvas.height + 80) {
      break;
    }
  }

  return points;
}

function updateTurretAngle(event) {
  if (inputState.aiAim) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  inputState.pointer = new Vector2D(event.clientX - rect.left, event.clientY - rect.top);
  const delta = inputState.pointer.subtract(turret.basePosition);
  turret.angle = Math.atan2(delta.y, delta.x);
}

function tryFire() {
  if (turret.cooldown > 0) {
    return;
  }

  const wantsToFire = inputState.queuedShots > 0 || inputState.firing;
  if (!wantsToFire) {
    return;
  }

  if (inputState.aiAim) {
    const muzzle = turret.basePosition.add(Vector2D.fromAngle(turret.angle, turret.barrelLength));
    const solution = aimWithLead(muzzle, target.position, target.velocity, world.muzzleSpeed, world.gravity);
    if (solution === null || solution.angle === null) {
      statusLabelEl.textContent = "AI: No solution";
      return;
    }

    turret.angle = solution.angle;
  }

  const projectile = world.spawnProjectile(turret);
  turret.cooldown = 0.11;
  shotsFired += 1;
  if (inputState.queuedShots > 0) {
    inputState.queuedShots -= 1;
  }
  lastSpeedEl.textContent = `${projectile.velocity.magnitude().toFixed(0)} px/s`;
  statusLabelEl.textContent = inputState.aiAim ? "AI firing" : "Firing";
}

function queueShot() {
  inputState.queuedShots += 1;
  tryFire();
}

gravityInput.addEventListener("input", syncControls);
frictionInput.addEventListener("input", syncControls);
massInput.addEventListener("input", syncControls);
speedInput.addEventListener("input", syncControls);

canvas.addEventListener("mousemove", updateTurretAngle);
canvas.addEventListener("pointerdown", (event) => {
  updateTurretAngle(event);
  inputState.firing = true;
  queueShot();
});
window.addEventListener("pointerup", () => {
  inputState.firing = inputState.aiAim ? true : inputState.autoFire;
});
canvas.addEventListener("mouseleave", () => {
  inputState.firing = inputState.aiAim ? true : inputState.autoFire;
});
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (!inputState.firing) {
      inputState.queuedShots += 1;
    }
    inputState.firing = true;
    tryFire();
  }
});
window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    inputState.firing = inputState.aiAim ? true : inputState.autoFire;
  }
});

clearButton.addEventListener("click", () => {
  world.projectiles = [];
  lastSpeedEl.textContent = "0 px/s";
  statusLabelEl.textContent = "Cleared";
});

trailButton.addEventListener("click", () => {
  const enabled = renderer.toggleTrails();
  trailButton.textContent = `Trails: ${enabled ? "On" : "Off"}`;
});

trajectoryButton.addEventListener("click", () => {
  inputState.showTrajectory = !inputState.showTrajectory;
  trajectoryButton.textContent = `Trajectory: ${inputState.showTrajectory ? "On" : "Off"}`;
});

autoFireButton.addEventListener("click", () => {
  inputState.autoFire = !inputState.autoFire;
  inputState.firing = inputState.aiAim ? true : inputState.autoFire;
  autoFireButton.textContent = `Auto Fire: ${inputState.autoFire ? "On" : "Off"}`;
  if (!inputState.aiAim) {
    modeLabelEl.textContent = inputState.autoFire ? "Auto" : "Manual";
    statusLabelEl.textContent = inputState.autoFire ? "Auto firing armed" : "Manual control";
  }
});

function respawnTarget() {
  const padding = 140;
  const floorY = canvas.height - 26;
  target.position = new Vector2D(
    padding + Math.random() * (canvas.width - padding * 1.2),
    80 + Math.random() * (floorY - 200)
  );
  const direction = Math.random() < 0.5 ? -1 : 1;
  target.velocity = new Vector2D(direction * (70 + Math.random() * 120), 0);
}

function stepTarget(dt) {
  const floorY = canvas.height - 26;
  target.position = target.position.add(target.velocity.scale(dt));

  if (target.position.x - target.radius < 0) {
    target.position = new Vector2D(target.radius, target.position.y);
    target.velocity = new Vector2D(Math.abs(target.velocity.x), target.velocity.y);
  }

  if (target.position.x + target.radius > canvas.width) {
    target.position = new Vector2D(canvas.width - target.radius, target.position.y);
    target.velocity = new Vector2D(-Math.abs(target.velocity.x), target.velocity.y);
  }

  const minY = 64;
  const maxY = floorY - 140;
  if (target.position.y < minY) {
    target.position = new Vector2D(target.position.x, minY);
  }
  if (target.position.y > maxY) {
    target.position = new Vector2D(target.position.x, maxY);
  }
}

aiAimButton.addEventListener("click", () => {
  inputState.aiAim = !inputState.aiAim;
  aiAimButton.textContent = `AI Aim: ${inputState.aiAim ? "On" : "Off"}`;
  modeLabelEl.textContent = inputState.aiAim ? "AI" : inputState.autoFire ? "Auto" : "Manual";
  statusLabelEl.textContent = inputState.aiAim ? "AI armed" : "Manual control";
  inputState.firing = inputState.aiAim ? true : inputState.autoFire;
  inputState.queuedShots = 0;
});

resetButton.addEventListener("click", () => {
  world.reset();
  inputState.firing = inputState.aiAim ? true : inputState.autoFire;
  inputState.queuedShots = 0;
  lastSpeedEl.textContent = "0 px/s";
  statusLabelEl.textContent = "Scene reset";
  hitCount = 0;
  scoreCount = 0;
  shotsFired = 0;
  respawnTarget();
});

syncControls();
respawnTarget();

let accumulator = 0;
let lastTimestamp = performance.now();
const fixedDt = 1 / 120;

function frame(timestamp) {
  const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;
  accumulator += deltaSeconds;

  turret.cooldown = Math.max(0, turret.cooldown - deltaSeconds);

  if (inputState.aiAim) {
    const muzzle = turret.basePosition.add(Vector2D.fromAngle(turret.angle, turret.barrelLength));
    const solution = aimWithLead(muzzle, target.position, target.velocity, world.muzzleSpeed, world.gravity);
    if (solution !== null && solution.angle !== null) {
      turret.angle = solution.angle;
    }
  }

  while (accumulator >= fixedDt) {
    tryFire();
    world.step(fixedDt);
    stepTarget(fixedDt);

    for (const projectile of world.projectiles) {
      if (!projectile.alive) {
        continue;
      }

      const delta = projectile.position.subtract(target.position);
      const minDistance = projectile.radius + target.radius;
      if (delta.magnitude() <= minDistance) {
        projectile.alive = false;
        hitCount += 1;
        scoreCount += 10;
        statusLabelEl.textContent = inputState.aiAim ? "AI hit!" : "Hit!";
        respawnTarget();
      }
    }
    accumulator -= fixedDt;
  }

  projectileCountEl.textContent = String(world.projectiles.length);
  simTimeEl.textContent = `${world.time.toFixed(2)}s`;
  collisionCountEl.textContent = String(world.collisionCount);
  hitCountEl.textContent = String(hitCount);
  scoreCountEl.textContent = String(scoreCount);
  const accuracy = shotsFired > 0 ? (hitCount / shotsFired) * 100 : 0;
  accuracyEl.textContent = `${accuracy.toFixed(0)}%`;
  if (world.projectiles.length === 0 && !inputState.firing && inputState.queuedShots === 0) {
    statusLabelEl.textContent = "Ready";
  }
  renderer.render();
  const ctx = renderer.context;

  if (inputState.showTrajectory) {
    const muzzle = turret.basePosition.add(Vector2D.fromAngle(turret.angle, turret.barrelLength));
    const points = predictTrajectory(muzzle, turret.angle, world.muzzleSpeed, fixedDt, 260);
    ctx.save();
    ctx.strokeStyle = "rgba(194, 65, 12, 0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    if (points.length > 0) {
      ctx.moveTo(muzzle.x, muzzle.y);
      for (const point of points) {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(target.position.x, target.position.y, target.radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(14, 116, 144, 0.92)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
  ctx.stroke();
  ctx.restore();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
