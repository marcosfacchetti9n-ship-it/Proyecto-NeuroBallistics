# NeuroBallistics Physics Notes

This document explains the core ideas behind the browser demo. The goal is not to be a full academic physics engine; the goal is to keep the simulation understandable, deterministic, and easy to tune.

## Fixed Timestep

The simulation advances with a fixed `dt` of `1 / 120` seconds. Rendering can happen at the browser refresh rate, but physics steps are processed in stable slices.

This makes the project easier to reason about because projectile motion, collision response, target movement, and scoring are not directly tied to frame rate.

## Projectile Integration

Each projectile stores:

- position
- velocity
- acceleration
- radius
- mass
- inverse mass

For every physics step:

```text
velocity = velocity + acceleration * dt
position = position + velocity * dt
```

This is semi-implicit Euler integration. It is simple, stable enough for this scale, and easy to inspect in the code.

## Gravity And Tuning

Gravity is exposed as a live slider. The user can tune it while the simulation is running, which changes every new integration step immediately.

The same idea applies to friction, mass, muzzle speed, and fire rate. These controls make the project feel like a small laboratory rather than a fixed game scene.

## Collision Response

The demo handles:

- projectile vs projectile
- projectile vs circular obstacle
- projectile vs bounds
- projectile vs moving target

For circular collisions, the solver calculates a normal vector from one center to another. If two circles overlap, it pushes them apart by the penetration depth and adjusts velocity using impulse-style response.

The simplified impulse idea is:

```text
relativeVelocity = velocityB - velocityA
velocityAlongNormal = dot(relativeVelocity, normal)
impulse = -(1 + restitution) * velocityAlongNormal / inverseMassSum
```

This keeps the behavior readable while still making collisions feel physical.

## Trajectory Prediction

The trajectory overlay simulates a future projectile path using the same gravity and drag values as the live simulation. It does not mutate world state; it creates a list of future points and draws a dashed curve.

That keeps the overlay deterministic and useful as a visual debugging tool.

## AI Aim

The `AI Aim` mode estimates a ballistic launch angle against a moving target. It predicts where the target will be after an estimated flight time, solves a ballistic angle for that future position, then refines the time estimate for a few iterations.

It is intentionally lightweight. The goal is to show applied math and systems thinking, not to hide the problem behind an external AI library.

## Challenge Mode

Challenge Mode adds a 60-second scoring run. It disables assisted aiming and autofire at the start so the run behaves like a manual skill test.

The final screen reports:

- score
- hits
- accuracy
- best challenge score

This gives the sandbox a complete user loop: start, play, finish, retry.
