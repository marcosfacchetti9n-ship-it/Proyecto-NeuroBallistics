# NeuroBallistics

Construí **NeuroBallistics** como un laboratorio de fisica 2D en el navegador para mostrar como pienso cuando trabajo en sistemas interactivos: simulacion determinista, feedback visual inmediato, arquitectura clara y una experiencia que se puede probar sin instalar nada.

La demo es 100% estatica: **HTML, CSS y JavaScript con Canvas nativo**. No usa framework, backend ni motor de fisica externo.

## Que se puede probar

En la primera pantalla se puede controlar una torreta, disparar proyectiles balisticos y ajustar parametros fisicos en tiempo real. Tambien agregue un modo de apuntado asistido por IA que calcula un angulo de disparo con anticipacion sobre un objetivo en movimiento.

Incluye:

- Apuntado manual con mouse o touch.
- Disparo con click, mantener click o `Space`.
- Modo `AI Aim` para apuntado balistico asistido.
- Objetivo movil con score, hits, accuracy, streak y high score persistente.
- Trayectoria predictiva toggleable.
- Colisiones entre proyectiles.
- Colisiones con paredes, suelo, techo y obstaculos circulares.
- Particulas de impacto y feedback visual en disparos/aciertos.
- Sliders en vivo para gravedad, friccion, masa, velocidad inicial y cadencia de disparo.
- Sonidos sintetizados con Web Audio para disparos, impactos y colisiones.
- Pausa, reset, limpieza de bolas y generacion de nueva arena.
- Frontend tipo cockpit, con HUD, paneles de control y escena Canvas renderizada.

## Por que lo hice

Quise construir una pieza de portfolio que no fuera solo visual. Me interesaba mostrar un sistema pequeno pero completo: input, render, estado, tuning en vivo, fisica, colisiones, scoring y una capa de comportamiento automatico.

El resultado es una demo simple de abrir, pero con decisiones tecnicas visibles:

- La simulacion usa **fixed timestep** para mantener estabilidad entre distintos frame rates.
- La fisica esta implementada a mano con vectores, normales, tangentes e impulsos.
- El render se hace con Canvas, separando la logica de simulacion de la presentacion.
- El frontend esta pensado para que la demo se entienda rapido y se vea presentable en portfolio.
- El loop de interaccion permite probar hipotesis rapido: cambiar masa, gravedad, friccion o cadencia y ver el resultado inmediatamente.

## Como correrlo

Abrir `index.html` en el navegador.

No requiere instalacion. Tambien esta listo para publicarse como sitio estatico en GitHub Pages, Netlify o cualquier hosting de archivos estaticos.

## Archivos principales

- `index.html`: estructura de la experiencia.
- `styles.css`: layout, HUD, controles, responsive y estetica visual.
- `app.js`: simulacion principal, render, input, IA de apuntado, sonido y scoring.
- `src/`: borrador modular en TypeScript para evolucionar la demo hacia una arquitectura de engine mas formal.
- `SYSTEM_OVERVIEW.md`: explicacion de la arquitectura propuesta.

## Que demuestra

Este proyecto muestra que puedo tomar una idea interactiva y convertirla en un prototipo presentable, con foco tanto en experiencia de usuario como en ingenieria. Para mi, el valor esta en que el proyecto se puede entender rapido, pero tambien deja espacio para conversaciones mas profundas sobre determinismo, simulacion, estructura de codigo y diseno de sistemas.

## Proximos pasos

Si continuara iterandolo, llevaria la demo completa a TypeScript, agregaria obstaculos con materiales distintos, replay de disparos, objetivos por niveles y una funcion de recompensa para experimentar con aprendizaje automatico.
