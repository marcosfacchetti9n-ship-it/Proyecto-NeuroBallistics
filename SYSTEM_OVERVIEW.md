# NeuroBallistics System Overview

NeuroBallistics is structured as a deterministic simulation laboratory rather than a monolithic game script. Each subsystem owns a single responsibility and communicates through typed contracts:

- `src/math`: foundational linear algebra and numeric helpers used by every runtime system.
- `src/core`: deterministic simulation orchestration, world state management, and the fixed-timestep loop.
- `src/entities`: domain objects that represent physical actors such as the turret, projectiles, and obstacles.
- `src/ai`: agent-facing contracts and decision-making components that consume sanitized world snapshots.
- `src/ui`: canvas lifecycle, rendering, dashboard controls, and decoupled player input.
- `src/main.ts`: composition root where concrete implementations are wired together.

## Architectural Decisions

### 1. Fixed-Timestep Determinism
The physics engine advances with a constant `dt` using an accumulator. Rendering may run at display refresh rate, but simulation always progresses in evenly sized steps. This keeps outcomes reproducible across machines and frame rates.

### 2. Data-Oriented World Snapshots
`World.getState()` exposes a sanitized, serializable view of the environment. The AI layer never reaches directly into mutable entities, which prevents coupling and keeps training or playback pipelines deterministic.

### 3. Decoupled Physics and Representation
Entities carry physical state, while the renderer reads immutable snapshots. Physics does not know about the canvas, and rendering does not mutate simulation state.

### 4. Extensible Collision Pipeline
The initial `PhysicsEngine` uses a uniform-grid broadphase to keep candidate generation closer to `O(n)` for spatially distributed bodies. Narrowphase and impulse resolution are isolated so future shape types can be added without rewriting the whole engine.

### 5. Strict TypeScript Contracts
All public boundaries are described with explicit interfaces and readonly snapshots. This reduces accidental mutation and keeps future AI/UI modules predictable.
