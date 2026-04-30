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
    this.hasHitTarget = false;
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
    this.fireRate = 8;
    this.airDrag = 0.0008;
    this.maxProjectiles = 90;
    this.projectiles = [];
    this.obstacles = [];
    this.time = 0;
    this.collisionCount = 0;
    this.shuffleArena();
  }

  reset() {
    this.projectiles = [];
    this.time = 0;
    this.collisionCount = 0;
  }

  shuffleArena() {
    const floorY = this.height - 26;
    this.obstacles = [
      new CircularObstacle(this.width * 0.48, floorY - 180 - Math.random() * 120, 30 + Math.random() * 14),
      new CircularObstacle(this.width * 0.66, floorY - 230 - Math.random() * 130, 36 + Math.random() * 18),
      new CircularObstacle(this.width * 0.82, floorY - 140 - Math.random() * 160, 24 + Math.random() * 18)
    ];
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
    if (this.projectiles.length > this.maxProjectiles) {
      this.projectiles.shift();
    }
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

    const sky = ctx.createLinearGradient(0, 0, 0, floorY);
    sky.addColorStop(0, "#cfe9ee");
    sky.addColorStop(0.55, "#eef4ee");
    sky.addColorStop(1, "#f3ead8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.canvas.width, floorY);

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#7fb7b2";
    ctx.beginPath();
    ctx.moveTo(0, floorY - 58);
    for (let x = 0; x <= this.canvas.width + 80; x += 80) {
      ctx.lineTo(x, floorY - 70 - Math.sin(x * 0.018) * 18);
    }
    ctx.lineTo(this.canvas.width, floorY);
    ctx.lineTo(0, floorY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(21, 33, 30, 0.075)";
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

    const ground = ctx.createLinearGradient(0, floorY, 0, this.canvas.height);
    ground.addColorStop(0, "#c7b37c");
    ground.addColorStop(1, "#92724c");
    ctx.fillStyle = ground;
    ctx.fillRect(0, floorY, this.canvas.width, this.canvas.height - floorY);

    ctx.save();
    ctx.strokeStyle = "rgba(21, 33, 30, 0.14)";
    for (let x = -20; x < this.canvas.width; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, floorY + 26);
      ctx.lineTo(x + 42, floorY);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(0, floorY, this.canvas.width, 5);
  }

  renderObstacles() {
    const ctx = this.context;
    for (const obstacle of this.world.obstacles) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(obstacle.position.x + 8, obstacle.position.y + obstacle.radius * 0.86, obstacle.radius * 0.9, obstacle.radius * 0.22, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(21, 33, 30, 0.18)";
      ctx.fill();
      ctx.restore();

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
      ctx.strokeStyle = "rgba(21, 33, 30, 0.28)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(obstacle.position.x, obstacle.position.y, obstacle.radius * 0.62, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 3;
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
    ctx.beginPath();
    ctx.ellipse(base.x, standTop + 58, 58, 15, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(21, 33, 30, 0.18)";
    ctx.fill();

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

    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(base.x + Math.cos(this.turret.angle - 0.18) * 8, base.y + Math.sin(this.turret.angle - 0.18) * 8);
    ctx.lineTo(muzzle.x - Math.cos(this.turret.angle) * 12, muzzle.y - Math.sin(this.turret.angle) * 12);
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
      ctx.ellipse(projectile.position.x + 5, projectile.position.y + projectile.radius * 0.8, projectile.radius * 0.75, projectile.radius * 0.24, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(21, 33, 30, 0.16)";
      ctx.fill();

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

class SoundEngine {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.masterGain = null;
    this.lastCollisionAt = 0;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) {
      this.ensureContext();
    }
  }

  ensureContext() {
    if (!this.enabled) {
      return null;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }

    if (this.context === null) {
      this.context = new AudioCtor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.22;
      this.masterGain.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      this.context.resume();
    }

    return this.context;
  }

  playShot() {
    const ctx = this.ensureContext();
    if (ctx === null || this.masterGain === null) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(190, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.11);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.42, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.13);
  }

  playHit() {
    const ctx = this.ensureContext();
    if (ctx === null || this.masterGain === null) {
      return;
    }

    for (const [offset, frequency] of [[0, 420], [0.045, 640], [0.09, 840]]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + offset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.11);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.13);
    }
  }

  playCollision() {
    const ctx = this.ensureContext();
    if (ctx === null || this.masterGain === null) {
      return;
    }

    if (ctx.currentTime - this.lastCollisionAt < 0.055) {
      return;
    }
    this.lastCollisionAt = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.055);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.065);
  }
}

const canvas = document.getElementById("lab-canvas");
const projectileCountEl = document.getElementById("projectile-count");
const lastSpeedEl = document.getElementById("last-speed");
const simTimeEl = document.getElementById("sim-time");
const collisionCountEl = document.getElementById("collision-count");
const hitCountEl = document.getElementById("hit-count");
const scoreCountEl = document.getElementById("score-count");
const highScoreEl = document.getElementById("high-score");
const streakCountEl = document.getElementById("streak-count");
const shotCountEl = document.getElementById("shot-count");
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
const fireRateInput = document.getElementById("fire-rate");
const fireRateValue = document.getElementById("fire-rate-value");
const clearButton = document.getElementById("clear-projectiles");
const trailButton = document.getElementById("toggle-trails");
const trajectoryButton = document.getElementById("toggle-trajectory");
const autoFireButton = document.getElementById("toggle-autofire");
const aiAimButton = document.getElementById("toggle-ai");
const soundButton = document.getElementById("toggle-sound");
const resetButton = document.getElementById("reset-sim");
const pauseButton = document.getElementById("toggle-pause");
const shuffleArenaButton = document.getElementById("shuffle-arena");
const languageButton = document.getElementById("toggle-language");

const translations = {
  en: {
    hero_eyebrow: "Deterministic Physics Laboratory",
    hero_lede:
      "Aim the turret with the mouse. Hold the left mouse button or press <kbd>Space</kbd> to fire. Tune gravity, friction, ball mass, and muzzle speed in real time.",
    hero_launch: "Launch Experiment",
    hero_reset: "Reset Scene",
    hud_projectiles: "Projectiles",
    hud_last_speed: "Last Speed",
    hud_sim_time: "Sim Time",
    hud_collisions: "Collisions",
    hud_hits: "Hits",
    hud_score: "Score",
    hud_accuracy: "Accuracy",
    hud_mode: "Mode",
    hud_status: "Status",
    story_1_title: "What This Demonstrates",
    story_1_body:
      "This prototype explores a deterministic 2D ballistic sandbox built with the native Canvas API. The simulation runs on a fixed timestep, exposes live parameters, and keeps physics logic separate from presentation.",
    story_2_title: "Why It Matters",
    story_2_body:
      "The goal is not just a toy cannon. It is a compact systems project that shows simulation thinking, UI feedback loops, collision handling, and a foundation for future AI-driven aiming or reinforcement-learning experiments.",
    story_3_title: "How To Use It",
    story_3_body:
      "Move the mouse to rotate the turret, click to fire, hold click or press <kbd>Space</kbd> for repeated fire, and tweak the sliders to observe how mass, gravity, friction, and launch speed reshape the trajectories.",
  control_gravity: "Gravity",
  control_friction: "Ground Friction",
  control_mass: "Ball Mass",
  control_speed: "Muzzle Speed",
  control_fire_rate: "Fire Rate",
  btn_clear: "Clear Balls",
    footer_body:
      "Built as a static browser project with HTML, CSS and Canvas-rendered JavaScript. No external physics engine, no backend, no framework dependency.",
    mode_manual: "Manual",
    mode_auto: "Auto",
    mode_ai: "AI",
    status_ready: "Ready",
    status_cleared: "Cleared",
    status_scene_reset: "Scene reset",
    status_firing: "Firing",
    status_ai_firing: "AI firing",
    status_ai_hit: "AI hit!",
    status_hit: "Hit!",
    status_ai_armed: "AI armed",
    status_manual_control: "Manual control",
    status_ai_no_solution: "AI: No solution"
  },
  es: {
    hero_eyebrow: "Laboratorio de Física Determinista",
    hero_lede:
      "Apuntá la torreta con el mouse. Mantené el click izquierdo o presioná <kbd>Space</kbd> para disparar. Ajustá gravedad, fricción, masa y velocidad inicial en tiempo real.",
    hero_launch: "Iniciar Experimento",
    hero_reset: "Reiniciar Escena",
    hud_projectiles: "Proyectiles",
    hud_last_speed: "Velocidad",
    hud_sim_time: "Tiempo",
    hud_collisions: "Colisiones",
    hud_hits: "Aciertos",
    hud_score: "Puntaje",
    hud_accuracy: "Precisión",
    hud_mode: "Modo",
    hud_status: "Estado",
    story_1_title: "Qué demuestra",
    story_1_body:
      "Este prototipo explora un sandbox balístico 2D determinista hecho con Canvas nativo. La simulación corre con timestep fijo, expone parámetros en vivo y separa la física de la presentación.",
    story_2_title: "Por qué importa",
    story_2_body:
      "La idea no es solo un cañón de juguete: es un proyecto de sistemas compacto que muestra simulación, feedback UI, colisiones y una base para experiments de aiming con IA o reinforcement learning.",
    story_3_title: "Cómo usarlo",
    story_3_body:
      "Mové el mouse para rotar la torreta, hacé click para disparar, mantené click o presioná <kbd>Space</kbd> para disparo continuo, y ajustá los sliders para ver cómo cambian las trayectorias.",
    control_gravity: "Gravedad",
    control_friction: "Fricción (suelo)",
    control_mass: "Masa",
    control_speed: "Velocidad inicial",
    btn_clear: "Limpiar bolas",
    footer_body:
      "Proyecto estático en el navegador con HTML, CSS y JavaScript renderizado en Canvas. Sin motor de física externo, sin backend, sin framework.",
    mode_manual: "Manual",
    mode_auto: "Auto",
    mode_ai: "IA",
    status_ready: "Listo",
    status_cleared: "Limpio",
    status_scene_reset: "Escena reiniciada",
    status_firing: "Disparando",
    status_ai_firing: "IA disparando",
    status_ai_hit: "¡IA acertó!",
    status_hit: "¡Acierto!",
    status_ai_armed: "IA activada",
    status_manual_control: "Control manual",
    status_ai_no_solution: "IA: sin solución"
  }
};

Object.assign(translations.en, {
  hero_lede:
    "Aim the turret, tune the physics, and use manual or AI-assisted fire to hit a moving target.",
  hero_reset: "Reset",
  control_deck: "Control Deck",
  group_physics: "Physics",
  group_systems: "Systems",
  hud_projectiles: "Balls",
  hud_high_score: "Best",
  hud_streak: "Streak",
  hud_shots: "Shots",
  story_1_title: "System Feel",
  story_1_body:
    "Fixed-timestep simulation, custom vector math, impulse-style collision response, and Canvas rendering keep the prototype inspectable and fast.",
  story_2_title: "Interaction Loop",
  story_2_body:
    "Manual aiming, repeated fire, live tuning, trajectory prediction, hit scoring, and AI aiming make the sandbox feel like a small playable lab.",
  story_3_title: "Portfolio Angle",
  story_3_body:
    "The project is intentionally static and dependency-light, so a recruiter can open it quickly and inspect the core engineering decisions.",
  btn_shuffle: "New Arena",
  btn_pause: "Pause",
  btn_resume: "Resume",
  status_paused: "Paused",
  status_arena_ready: "Arena rebuilt"
});

Object.assign(translations.es, {
  hero_eyebrow: "Laboratorio de Fisica Determinista",
  hero_lede:
    "Apunta la torreta, ajusta la fisica y usa disparo manual o asistido por IA para pegarle a un objetivo en movimiento.",
  hero_reset: "Reiniciar",
  control_deck: "Panel de Control",
  group_physics: "Fisica",
  group_systems: "Sistemas",
  hud_projectiles: "Bolas",
  hud_high_score: "Mejor",
  hud_streak: "Racha",
  hud_shots: "Disparos",
  hud_accuracy: "Precision",
  story_1_title: "Sensacion de sistema",
  story_1_body:
    "Timestep fijo, matematica vectorial propia, respuesta de colisiones por impulso y render en Canvas mantienen el prototipo rapido e inspeccionable.",
  story_2_title: "Loop de interaccion",
  story_2_body:
    "Apuntado manual, disparo continuo, tuning en vivo, trayectoria predictiva, score e IA convierten el sandbox en un laboratorio jugable.",
  story_3_title: "Angulo portfolio",
  story_3_body:
    "El proyecto es estatico y liviano, pensado para que un recruiter pueda abrirlo rapido e inspeccionar las decisiones de ingenieria.",
  control_friction: "Friccion (suelo)",
  control_fire_rate: "Cadencia",
  btn_shuffle: "Nueva arena",
  btn_pause: "Pausar",
  btn_resume: "Continuar",
  status_paused: "Pausado",
  status_arena_ready: "Arena reconstruida",
  status_ai_hit: "IA acerto!",
  status_hit: "Acierto!",
  status_ai_no_solution: "IA: sin solucion"
});

let language = "es";

function t(key) {
  return translations[language]?.[key] ?? translations.en[key] ?? key;
}

function applyTranslations() {
  document.documentElement.lang = language;
  const nodes = document.querySelectorAll("[data-i18n]");
  for (const node of nodes) {
    const key = node.getAttribute("data-i18n");
    if (!key) continue;
    node.innerHTML = t(key);
  }
  languageButton.textContent = language === "en" ? "ES" : "EN";
  syncButtonLabels();
  // Keep mode consistent after translation.
  updateModeLabel();
}

function updateModeLabel() {
  modeLabelEl.textContent = inputState.aiAim ? t("mode_ai") : inputState.autoFire ? t("mode_auto") : t("mode_manual");
}

function setPressed(button, pressed) {
  button.setAttribute("aria-pressed", String(pressed));
  button.classList.toggle("is-active", pressed);
}

function syncBodyState() {
  document.body.classList.toggle("mode-ai", inputState.aiAim);
  document.body.classList.toggle("mode-auto", !inputState.aiAim && inputState.autoFire);
  document.body.classList.toggle("mode-manual", !inputState.aiAim && !inputState.autoFire);
  document.body.classList.toggle("is-paused", isPaused);
  document.body.classList.toggle("sound-off", !soundEngine.enabled);
}

function syncButtonLabels() {
  const on = language === "es" ? "On" : "On";
  const off = language === "es" ? "Off" : "Off";
  const trailsLabel = language === "es" ? "Estelas" : "Trails";
  const trajectoryLabel = language === "es" ? "Trayectoria" : "Trajectory";
  const autoFireLabel = language === "es" ? "Auto Disparo" : "Auto Fire";
  const aiAimLabel = language === "es" ? "Apuntado IA" : "AI Aim";
  const soundLabel = language === "es" ? "Sonido" : "Sound";

  trailButton.textContent = `${trailsLabel}: ${renderer.showTrails ? on : off}`;
  trajectoryButton.textContent = `${trajectoryLabel}: ${inputState.showTrajectory ? on : off}`;
  autoFireButton.textContent = `${autoFireLabel}: ${inputState.autoFire ? on : off}`;
  aiAimButton.textContent = `${aiAimLabel}: ${inputState.aiAim ? on : off}`;
  soundButton.textContent = `${soundLabel}: ${soundEngine.enabled ? on : off}`;
  pauseButton.textContent = isPaused ? t("btn_resume") : t("btn_pause");
  setPressed(trailButton, renderer.showTrails);
  setPressed(trajectoryButton, inputState.showTrajectory);
  setPressed(autoFireButton, inputState.autoFire);
  setPressed(aiAimButton, inputState.aiAim);
  setPressed(soundButton, soundEngine.enabled);
  setPressed(pauseButton, isPaused);
  syncBodyState();
}

const world = new PhysicsWorld(canvas.width, canvas.height);
const turret = new Turret(120, canvas.height - 54);
const renderer = new Renderer(canvas, world, turret);
const soundEngine = new SoundEngine();

const target = {
  position: new Vector2D(canvas.width * 0.78, canvas.height * 0.35),
  velocity: new Vector2D(90, 0),
  radius: 18
};

let hitCount = 0;
let scoreCount = 0;
let shotsFired = 0;
let streakCount = 0;
let highScore = readHighScore();
let isPaused = false;
let statusHoldUntil = 0;
const impactParticles = [];

const inputState = {
  pointer: new Vector2D(canvas.width * 0.5, canvas.height * 0.3),
  firing: false,
  queuedShots: 0,
  autoFire: false,
  aiAim: false,
  showTrajectory: true
};

function readHighScore() {
  try {
    const value = Number(window.localStorage.getItem("neuroballistics:high-score"));
    return Number.isFinite(value) ? value : 0;
  } catch (_error) {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    window.localStorage.setItem("neuroballistics:high-score", String(value));
  } catch (_error) {
    // Local files can run in storage-restricted browser contexts.
  }
}

function setStatus(message, holdMs = 900) {
  statusLabelEl.textContent = message;
  statusHoldUntil = performance.now() + holdMs;
}

function syncControls() {
  world.gravity = Number(gravityInput.value);
  world.groundFriction = Number(frictionInput.value);
  world.projectileMass = Number(massInput.value);
  world.muzzleSpeed = Number(speedInput.value);
  world.fireRate = Number(fireRateInput.value);

  gravityValue.value = gravityInput.value;
  frictionValue.value = frictionInput.value;
  massValue.value = massInput.value;
  speedValue.value = speedInput.value;
  fireRateValue.value = `${Number(fireRateInput.value).toFixed(1).replace(".0", "")}/s`;
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

function spawnParticles(position, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 180;
    impactParticles.push({
      position: position.add(Vector2D.fromAngle(angle, Math.random() * 8)),
      velocity: Vector2D.fromAngle(angle, speed),
      radius: 2 + Math.random() * 4,
      life: 1,
      color
    });
  }
}

function stepParticles(dt) {
  for (const particle of impactParticles) {
    particle.velocity = particle.velocity.add(new Vector2D(0, world.gravity * 0.28).scale(dt));
    particle.position = particle.position.add(particle.velocity.scale(dt));
    particle.life -= dt * 2.6;
  }

  for (let i = impactParticles.length - 1; i >= 0; i -= 1) {
    if (impactParticles[i].life <= 0) {
      impactParticles.splice(i, 1);
    }
  }
}

function renderParticles(ctx) {
  ctx.save();
  for (const particle of impactParticles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.beginPath();
    ctx.arc(particle.position.x, particle.position.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.fill();
  }
  ctx.restore();
}

function registerTargetHit(projectile, distanceToTarget) {
  if (projectile.hasHitTarget) {
    return;
  }

  projectile.hasHitTarget = true;
  projectile.alive = false;
  hitCount += 1;
  streakCount += 1;

  const hitWindow = projectile.radius + target.radius;
  const quality = Math.max(0, 1 - distanceToTarget / hitWindow);
  const earned = Math.round(12 + quality * 38 + streakCount * 4);
  scoreCount += earned;
  if (scoreCount > highScore) {
    highScore = scoreCount;
    saveHighScore(highScore);
  }

  spawnParticles(target.position, "#0f766e", 24);
  soundEngine.playHit();
  setStatus(inputState.aiAim ? t("status_ai_hit") : `${t("status_hit")} +${earned}`, 1300);
  respawnTarget();
}

function updateTurretAngle(event) {
  if (inputState.aiAim) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  inputState.pointer = new Vector2D(
    (event.clientX - rect.left) * scaleX,
    (event.clientY - rect.top) * scaleY
  );
  const delta = inputState.pointer.subtract(turret.basePosition);
  turret.angle = Math.atan2(delta.y, delta.x);
}

function tryFire() {
  if (isPaused) {
    return;
  }

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
      setStatus(t("status_ai_no_solution"), 900);
      return;
    }

    turret.angle = solution.angle;
  }

  const projectile = world.spawnProjectile(turret);
  turret.cooldown = 1 / Math.max(1, world.fireRate);
  shotsFired += 1;
  spawnParticles(projectile.position, "#d97706", 8);
  soundEngine.playShot();
  if (inputState.queuedShots > 0) {
    inputState.queuedShots -= 1;
  }
  lastSpeedEl.textContent = `${projectile.velocity.magnitude().toFixed(0)} px/s`;
  setStatus(inputState.aiAim ? t("status_ai_firing") : t("status_firing"), 450);
}

function queueShot() {
  inputState.queuedShots += 1;
  tryFire();
}

gravityInput.addEventListener("input", syncControls);
frictionInput.addEventListener("input", syncControls);
massInput.addEventListener("input", syncControls);
speedInput.addEventListener("input", syncControls);
fireRateInput.addEventListener("input", syncControls);

canvas.addEventListener("pointermove", updateTurretAngle);
canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture?.(event.pointerId);
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
window.addEventListener("blur", () => {
  inputState.firing = inputState.aiAim ? true : inputState.autoFire;
});

clearButton.addEventListener("click", () => {
  world.projectiles = [];
  lastSpeedEl.textContent = "0 px/s";
  setStatus(t("status_cleared"), 800);
});

trailButton.addEventListener("click", () => {
  renderer.toggleTrails();
  syncButtonLabels();
});

trajectoryButton.addEventListener("click", () => {
  inputState.showTrajectory = !inputState.showTrajectory;
  syncButtonLabels();
});

soundButton.addEventListener("click", () => {
  soundEngine.setEnabled(!soundEngine.enabled);
  syncButtonLabels();
  if (soundEngine.enabled) {
    soundEngine.playHit();
  }
});

autoFireButton.addEventListener("click", () => {
  inputState.autoFire = !inputState.autoFire;
  inputState.firing = inputState.aiAim ? true : inputState.autoFire;
  syncButtonLabels();
  if (!inputState.aiAim) {
    updateModeLabel();
    setStatus(inputState.autoFire
      ? (language === "es" ? "Auto listo" : "Auto firing armed")
      : t("status_manual_control"), 900);
  }
});

pauseButton.addEventListener("click", () => {
  isPaused = !isPaused;
  inputState.firing = isPaused ? false : inputState.aiAim ? true : inputState.autoFire;
  syncButtonLabels();
  setStatus(isPaused ? t("status_paused") : t("status_ready"), 900);
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

function renderTarget(ctx, timestamp) {
  const pulse = 1 + Math.sin(timestamp / 180) * 0.08;

  ctx.save();
  ctx.beginPath();
  ctx.arc(target.position.x, target.position.y, target.radius * 2.15 * pulse, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(15, 118, 110, 0.18)";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(target.position.x, target.position.y, target.radius * 1.45, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(217, 119, 6, 0.58)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(target.position.x, target.position.y, target.radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(15, 118, 110, 0.94)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(23, 32, 31, 0.45)";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(target.position.x, target.position.y, target.radius * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fill();
  ctx.restore();
}

function renderPauseOverlay(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(23, 32, 31, 0.32)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(251, 252, 249, 0.94)";
  ctx.strokeStyle = "rgba(23, 32, 31, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 120, canvas.height / 2 - 42, 240, 84, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#17201f";
  ctx.font = "700 24px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(t("status_paused"), canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

aiAimButton.addEventListener("click", () => {
  inputState.aiAim = !inputState.aiAim;
  syncButtonLabels();
  updateModeLabel();
  setStatus(inputState.aiAim ? t("status_ai_armed") : t("status_manual_control"), 900);
  inputState.firing = inputState.aiAim ? true : inputState.autoFire;
  inputState.queuedShots = 0;
});

shuffleArenaButton.addEventListener("click", () => {
  world.shuffleArena();
  world.projectiles = [];
  impactParticles.length = 0;
  respawnTarget();
  setStatus(t("status_arena_ready"), 1000);
});

languageButton.addEventListener("click", () => {
  language = language === "en" ? "es" : "en";
  applyTranslations();
});

resetButton.addEventListener("click", () => {
  world.reset();
  inputState.firing = inputState.aiAim ? true : inputState.autoFire;
  inputState.queuedShots = 0;
  impactParticles.length = 0;
  lastSpeedEl.textContent = "0 px/s";
  setStatus(t("status_scene_reset"), 1000);
  hitCount = 0;
  scoreCount = 0;
  shotsFired = 0;
  streakCount = 0;
  respawnTarget();
});

syncControls();
respawnTarget();
syncButtonLabels();
updateModeLabel();
applyTranslations();

let accumulator = 0;
let lastTimestamp = performance.now();
const fixedDt = 1 / 120;

function frame(timestamp) {
  const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  if (!isPaused) {
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
      const collisionCountBeforeStep = world.collisionCount;
      world.step(fixedDt);
      if (world.collisionCount > collisionCountBeforeStep) {
        soundEngine.playCollision();
      }
      stepTarget(fixedDt);
      stepParticles(fixedDt);

      for (const projectile of world.projectiles) {
        if (!projectile.alive) {
          continue;
        }

        const delta = projectile.position.subtract(target.position);
        const distanceToTarget = delta.magnitude();
        const minDistance = projectile.radius + target.radius;
        if (distanceToTarget <= minDistance) {
          registerTargetHit(projectile, distanceToTarget);
        }
      }
      accumulator -= fixedDt;
    }
  } else {
    accumulator = 0;
  }

  projectileCountEl.textContent = String(world.projectiles.length);
  simTimeEl.textContent = `${world.time.toFixed(2)}s`;
  collisionCountEl.textContent = String(world.collisionCount);
  hitCountEl.textContent = String(hitCount);
  scoreCountEl.textContent = String(scoreCount);
  highScoreEl.textContent = String(highScore);
  streakCountEl.textContent = String(streakCount);
  shotCountEl.textContent = String(shotsFired);
  const accuracy = shotsFired > 0 ? (hitCount / shotsFired) * 100 : 0;
  accuracyEl.textContent = `${accuracy.toFixed(0)}%`;
  if (!isPaused && timestamp > statusHoldUntil && world.projectiles.length === 0 && !inputState.firing && inputState.queuedShots === 0) {
    statusLabelEl.textContent = t("status_ready");
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

  renderTarget(ctx, timestamp);
  renderParticles(ctx);
  if (isPaused) {
    renderPauseOverlay(ctx);
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
