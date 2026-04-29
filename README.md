# NeuroBallistics

Construí **NeuroBallistics** como un laboratorio de física 2D en el navegador para mostrar cómo pienso cuando trabajo en sistemas interactivos: una mezcla de simulación determinista, feedback visual inmediato, arquitectura clara y una experiencia que se puede probar sin instalar nada.

La demo es 100% estática: **HTML, CSS y JavaScript con Canvas nativo**. No usa framework, backend ni motor de física externo.

## Qué se puede probar

En la primera pantalla se puede controlar una torreta, disparar proyectiles balísticos y ajustar parámetros físicos en tiempo real. También agregué un modo de apuntado asistido por IA que calcula un ángulo de disparo con anticipación sobre un objetivo en movimiento.

Incluye:

- Apuntado manual con mouse o touch.
- Disparo con click, mantener click o `Space`.
- Modo `AI Aim` para apuntado balístico asistido.
- Objetivo móvil con score, hits, accuracy, streak y high score persistente.
- Trayectoria predictiva toggleable.
- Colisiones entre proyectiles.
- Colisiones con paredes, suelo, techo y obstáculos circulares.
- Partículas de impacto y feedback visual en disparos/aciertos.
- Sliders en vivo para gravedad, fricción, masa, velocidad inicial y cadencia de disparo.
- Sonidos sintetizados con Web Audio para disparos, impactos y colisiones.
- Pausa, reset, limpieza de bolas y generación de nueva arena.

## Por qué lo hice

Quise construir una pieza de portfolio que no fuera solo visual. Me interesaba mostrar un pequeño sistema completo: input, render, estado, tuning en vivo, física, colisiones y una capa de comportamiento automático.

El resultado es una demo simple de abrir, pero con decisiones técnicas visibles:

- La simulación usa **fixed timestep** para mantener estabilidad entre distintos frame rates.
- La física está implementada a mano con vectores, normales, tangentes e impulsos.
- El render se hace con Canvas, separando la lógica de simulación de la presentación.
- El loop de interacción permite probar hipótesis rápido: cambiar masa, gravedad o fricción y ver el resultado inmediatamente.

## Cómo correrlo

Abrí `index.html` en el navegador.

No requiere instalación. También está listo para publicarse como sitio estático en GitHub Pages, Netlify o cualquier hosting de archivos estáticos.

## Archivos principales

- `index.html`: estructura de la experiencia.
- `styles.css`: layout, HUD, controles y estética visual.
- `app.js`: simulación principal, render, input, IA de apuntado y scoring.
- `src/`: borrador modular en TypeScript para evolucionar la demo hacia una arquitectura de engine más formal.
- `SYSTEM_OVERVIEW.md`: explicación de la arquitectura propuesta.

## Qué demuestra

Este proyecto muestra que puedo tomar una idea interactiva y convertirla en un prototipo presentable, con foco tanto en experiencia de usuario como en ingeniería. Para mí, el valor está en que el proyecto se puede entender rápido, pero también deja espacio para conversaciones más profundas sobre determinismo, simulación, estructura de código y diseño de sistemas.

## Próximos pasos

Si continuara iterándolo, llevaría la demo completa a TypeScript, agregaría obstáculos con materiales distintos, replay de disparos, objetivos por niveles y una función de recompensa para experimentar con aprendizaje automático.
