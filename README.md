# NeuroBallistics

I built NeuroBallistics as a compact browser-based physics laboratory to demonstrate how I think about simulation systems, interactive tooling, and clean front-end architecture.

The project is a static HTML/CSS/JavaScript experience rendered with the native Canvas API. At its core, it lets the user control a turret, fire ballistic projectiles, and observe how gravity, friction, projectile mass, and launch speed change the resulting motion and collisions in real time.

## Why I Built It

I wanted to create a small but complete project that felt closer to an engine prototype than a visual toy. The goal was to combine:

- deterministic fixed-timestep simulation
- custom vector math instead of relying on a physics package
- collision handling between projectiles and the environment
- a browser-friendly control surface for live parameter tuning
- a presentation layer that is simple to run, inspect, and extend

This made NeuroBallistics a good way to show both product thinking and systems thinking in one project.

## What The Demo Includes

- A visible turret that aims with the mouse
- Click-to-fire and hold-to-fire controls
- Projectile-to-projectile collisions
- Collisions with walls, floor, ceiling, and circular obstacles
- Real-time sliders for gravity, friction, ball mass, and muzzle speed
- A lightweight HUD with simulation telemetry
- A static deployment model with no backend required

## Technical Notes

I kept the simulation loop on a fixed timestep so projectile behavior stays stable across different frame rates. The math and physics are intentionally implemented manually to keep the behavior transparent and tunable.

Even though the browser demo is intentionally lightweight, I also laid out the project with a more modular engine-style structure under `src/` so it can evolve into a more formal TypeScript architecture over time.

## Running The Project

Because the final demo is fully static, the quickest way to run it is simply to open `index.html` in a browser.

Files of interest:

- `index.html` for the page structure
- `styles.css` for the UI and presentation
- `app.js` for the simulation, rendering, and input loop
- `src/` for the more formal engine-oriented architecture draft

## What I'd Build Next

If I continued iterating on NeuroBallistics, the next areas I would explore are:

- target objects and score-based gameplay
- trajectory prediction overlays
- different material behaviors and projectile types
- AI-assisted aiming and reward-driven tuning
- full migration of the browser demo to the modular TypeScript architecture

## Repository Goal

I see this project as a portfolio piece that highlights how I approach interactive simulations: start with a solid systems foundation, keep the user feedback loop tight, and make the result easy to run and understand.
