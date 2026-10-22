# RIVERLAB V0.4.0 — Informe de implementación y validación

**Proyecto personal:** `kergamer/riverlab-poker`  
**Origen:** V0.3.5 Sound Atelier, rama `main`, commit `f03b62c9d9769065366fb2f9a1998ab1ab7dcc97`.  
**Rama de implementación:** `dev/v040-strategy-learning`.  
**Estado:** candidata de evaluación, no producción.  

## Diagnóstico original

La V0.3.5 definía cinco personalidades con `tight`, `agg`, `loose`, una puntuación simple preflop y reglas postflop basadas en categoría de jugada, coste y azar. No existían rangos posicionales de 169 clases, memoria conductual ni niveles de dificultad configurables. La IA no debía usar cartas ocultas ajenas para tomar decisiones.

## Implementación entregada

1. **Motor modular `bots.js`:** independiente de `act()` y `splitPots()`. Solo recibe las dos cartas del bot, board, apuestas, posición, estado público de los jugadores y parámetros estratégicos. No recibe cartas ocultas de rivales.
2. **169 clases preflop** (13 parejas, 78 suited, 78 offsuit; 1.326 combinaciones reales); percentiles y rangos aproximados por UTG, HJ, CO, BTN, SB y BB, con respuestas diferenciadas frente a open raises/3-bets.
3. **Postflop:** evaluador rápido de mejores cinco de siete cartas, fuerza heurística, proyectos de color y escalera, textura del tablero, odds para pagar, SPR, número de rivales y muestreo probabilístico de cartas ocultas desconocidas en niveles avanzados.
4. **Personalidades:** KAI loose-passive, MARC tight-passive, ALEX TAG, NOVA LAG, LEO balanced. Sus parámetros afectan a apertura, presión, tamaños y propensión a igualar.
5. **Dificultad:** Principiante, Intermedio, Avanzado y Experto, seleccionables en Ajustes. La dificultad modifica profundidad del análisis, varianza, rango y frecuencia de decisiones sin homogeneizar los estilos.
6. **Aprendizaje estadístico:** VPIP, PFR, 3-bet, fold a apuesta, agresión, calls, showdowns y muestras observadas; suavizado con priors y límites de adaptación según número de manos. Memoria guardada en `riverlab.v04.botMemory`, con activación y reinicio independientes.
7. **Ritmo:** tiempo de decisión según perfil, nivel, calle, bote y situación; modo rápido conservado.
8. **Panel de rendimiento:** perfiles de los cinco rivales, frecuencia VPIP/PFR y tamaño de muestra, ocultando los porcentajes cuando hay menos de 30 manos.
9. **PWA:** `bots.js` incluido en caché `riverlab-v040-static-1`. El sonido V0.3.5 permanece intacto.

## Pruebas completadas

- Tests automáticos de motor, sesión y sonido existentes, sin cambiar el esquema `riverlab.v03.session`.
- 169 clases y 1.326 combinaciones verificadas.
- 10.000 decisiones con condiciones variadas: comprobación de acciones legales, targets válidos, ausencia de raises ilegales, invariancia respecto a cartas ocultas ajenas, determinismo mediante semilla.
- Prueba de divergencia estadística entre perfiles preflop.
- 2.000 manos completas del motor integrado en Node.js: finalización, ausencia de bloqueos, acciones legales y conservación de fichas.
- GitHub Actions: **smoke — success** en la revisión de esta candidata.
- Vercel Preview: verificar estado READY del último commit antes de dar URL definitiva.

## Alcance y límites

- **No es GTO ni solver profesional**. Las estrategias y pesos preflop son aproximaciones interpretables que deben calibrarse con estadísticas y partidas reales.
- El muestreo de equity utiliza manos aleatorias/rangos heurísticos y no un modelo completo de rangos con frecuencia condicionada por acción y calle.
- El aprendizaje es **estadístico y progresivo**; no entrenamiento neuronal, ni sincronización entre dispositivos.
- Los cuatro niveles generan diferencias en política estratégica, pero todavía requieren validación empírica de win rates y progresión de dificultad frente a referencias externas.
- Las pruebas automatizadas no sustituyen una revisión auditiva/visual en Safari, iPhone y otros dispositivos físicos.
- El juego sigue siendo solo con fichas ficticias.
- **No promocionar a main sin evaluación real de la experiencia**. Si se observa un problema, corregirlo en esta rama y repetir regresiones.

## Mejoras posteriores recomendadas

- Contrastar rangos preflop frente a tablas expertas y revisar frecuencias por posición/SPR tras muchas más manos.
- Estudiar convergencia y explotación frente a estilos de jugador sintéticos para comprobar que el aprendizaje mejora la estrategia.
- Añadir análisis educativo postmano con comentarios fundamentados en información que era visible en el momento de decidir.
- Validar perfiles y dificultades en más de 10.000 manos completas por configuración y en navegadores móviles.

La rama `main` queda como base validada V0.3.5 mientras V0.4.0 se prueba en su URL de preview.
