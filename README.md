# NeuroBallistics

Construí **NeuroBallistics** como un laboratorio compacto de física 2D en el navegador para mostrar cómo pienso y trabajo en proyectos de simulación: **arquitectura clara**, **determinismo**, herramientas interactivas y matemática implementada a mano (sin motores externos).

Es una experiencia **100% estática** (HTML/CSS/JavaScript + Canvas nativo). En la demo se controla una torreta, se disparan proyectiles balísticos y se observa en tiempo real cómo cambian las trayectorias y colisiones al ajustar parámetros como gravedad, fricción, masa y velocidad inicial.

## Demo rápida (para probar en 30 segundos)

- **Live demo**: https://neuroballistics.netlify.app/
- Alternativa local: abrí `index.html` (no requiere instalación).
- Activá `AI Aim` para ver a la torreta **apuntar con lead** a un objetivo en movimiento y sumar hits.
- Activá `Trajectory` para ver una **predicción de trayectoria** basada en los parámetros actuales.

## Por qué lo hice

Quise construir un proyecto chico pero completo, más cercano a un prototipo de engine que a un “toy demo”. El objetivo fue combinar:

- simulación determinista con **fixed timestep**
- matemática propia (vectores / proyecciones / normales) sin depender de un motor de física
- colisiones (proyectil-proyectil, límites y obstáculos circulares)
- una UI simple para **tuning en vivo** de parámetros
- una base fácil de ejecutar, inspeccionar y extender

Esto me permite mostrar en un solo repo **product thinking** (feedback loop, UX, “demoable”) y **systems thinking** (simulación, estabilidad, arquitectura).

## Qué incluye la demo

- torreta visible con apuntado por mouse (modo manual)
- disparo con click/hold y con `Space`
- objetivo en movimiento + telemetría: **Hits / Score / Accuracy**
- modo `AI Aim`: resuelve un ángulo de disparo balístico y **anticipa la posición futura** del objetivo (lead)
- overlay de `Trajectory` (predicción de curva balística, toggleable)
- colisiones entre proyectiles
- colisiones con paredes/suelo/techo y obstáculos circulares
- sliders en vivo: gravedad, fricción, masa, velocidad inicial
- deploy estático (sin backend)

## Notas técnicas (highlights)

- **Fixed timestep**: la simulación avanza con `dt` constante usando acumulador; el render corre a framerate variable.
- **Respuesta por impulsos**: colisiones y fricción resueltas con normales/tangentes y producto punto.
- **Algebra lineal aplicada**: el código usa operaciones vectoriales (dot, normalización, proyección) para resolver dinámica y contacto.

Además de la demo en `app.js`, dejé una versión más modular estilo “engine” en `src/` (TypeScript) para evolucionar a una arquitectura más formal.

## Cómo correrlo

La demo es estática: abrí `index.html` en el navegador.

Controles:

- mouse: apuntar (cuando `AI Aim` está apagado)
- click / mantener click: disparar
- `Space`: disparo mientras se mantiene presionado
- sliders: gravedad, fricción, masa, velocidad inicial
- botones: trails / trajectory / auto fire / AI aim

Archivos importantes:

- `index.html`: estructura de la página
- `styles.css`: UI y estilo
- `app.js`: simulación + render + input + HUD (demo principal)
- `src/`: arquitectura modular en TypeScript (borrador de engine)

## Próximos pasos (si lo continúo)

Si continúo iterando, exploraría:

- reglas de score más ricas (combos, runs por tiempo)
- aiming “obstacle-aware” (bank shots)
- materiales / proyectiles distintos
- reward function + replays para experimentos de **reinforcement learning**
- migración completa de la demo a la arquitectura TypeScript

## Objetivo del repositorio

Este repo es una pieza de portfolio para mostrar cómo construyo simulaciones interactivas: una base de sistemas sólida, un loop de feedback rápido para el usuario, y un resultado fácil de ejecutar y entender.
