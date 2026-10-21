# RIVERLAB V0.4 — Inteligencia estratégica de los bots

**Base validada:** RIVERLAB V0.3.1 en `main` (commit `08902a5cf92d5cafd69cc705e98099a891af99bc`). La versión publicada en Vercel no se modifica durante este desarrollo.

**Rama de trabajo:** `dev/v04-bot-intelligence`.

## Diagnóstico de V0.3.1

- Cinco perfiles: KAI (`loose-passive`), MARC (`tight-passive`), ALEX (`tag`), NOVA (`lag`), LEO (`balanced`).
- `PREFS` define umbral preflop, agresividad y looseness.
- `chooseBotAction` puntúa las cartas preflop de manera simplificada; en calles posteriores decide por categoría de mano, coste de igualar y azar.
- No hay rangos preflop por posición, lectura del adversario, odds de proyectos completas, estimación de equity frente a rangos ni memoria del estilo del humano entre manos.
- La velocidad se controla globalmente; el tiempo de pensamiento no depende de la dificultad de la decisión.

## Objetivo

Que cada bot juegue manos de No-Limit Hold'em de forma **creíble, diferenciada, legal y adaptativa**, sin conocer cartas privadas de otros jugadores. Aumentar competencia estratégica sin convertir todos los bots en rivales idénticos ni presentar heurísticas como GTO.

## Principios innegociables

1. **No hacer trampa:** el contexto de decisión solo incorpora cartas propias, board público, posición, apuestas, stacks, estado de la mano y acciones públicas previas. Los naipes privados de otros jugadores almacenados por el motor nunca entrarán en las funciones de decisión.
2. **Respetar el motor de apuestas:** no emitir raises por debajo del mínimo salvo all-in válido, ni acciones fuera de turno, ni apostar sin stack, ni reabrir apuestas ilegalmente.
3. **Proteger la versión aprobada:** desarrollar en rama independiente; no modificar `main` ni desplegar en producción sin pruebas y validación.
4. **Separar personalidad, nivel y aprendizaje:** un bot de estilo TAG puede ser básico o avanzado; la adaptación debe limitarse a observaciones verificables.
5. **Repetibilidad para QA:** permitir aleatoriedad inyectable/semillas para pruebas de decisiones, sin reemplazar la mezcla robusta de baraja en producción.
6. **Compatibilidad:** conservar partidas, preferencias e historial local existentes cuando sea posible; migrar de forma no destructiva y documentada.

## Motor de decisiones por fases

### 1. Preflop
- Clasificar las 169 clases de manos iniciales (13 pares, 78 suited, 78 offsuit).
- Incorporar posiciones UTG / HJ / CO / BTN / SB / BB y profundidad efectiva de stack.
- Aperturas (RFI), defensa de ciegas, call, aislamiento, 3-bet, 4-bet y shove con rangos adecuados por nivel y personalidad.
- Umbrales de fuerza dependientes del precio de entrada, acciones previas y tamaño de apertura, evitando call sistemático con basura.
- Sizing de open/raise coherente en unidades BB y con mínimo legal.

### 2. Postflop
- Evaluar fuerza relativa de mano **y** proyectos (flush draw, OESD, gutshot, overcards) sobre el board visible.
- Considerar textura (conectado, coordinado, doblado, seco/húmedo), bote, número de rivales, posición, SPR (stack-to-pot ratio), tamaño a pagar y pot odds.
- Distinguir apuesta por valor, protección, control del bote, semibluff y bluff puro (con frecuencias limitadas).
- Acciones: check, bet, call, raise, fold y all-in coherentes con las reglas, con tamaños escalados a bote/stack.
- Leer la secuencia de apuestas actual para distinguir agresor preflop, defensor y respuesta en múltiples calles.

### 3. Personalidades
- KAI, loose-passive: más participación, más calls, pocos grandes faroles; algunos errores recreativos.
- MARC, tight-passive: selección estricta y tendencia a control de bote; vulnerable a robos frecuentes.
- ALEX, TAG: selección disciplinada, apuesta de valor y agresión selectiva con ventaja de rango.
- NOVA, LAG: amplio espectro de aperturas, 3-bets, presión y faroles situacionales (sin agresividad absurda).
- LEO, balanced: rangos y frecuencias equilibrados, control del bote y adaptaciones graduales.
- Personalidad afecta acciones, tamaños, riesgo y tiempos; no fuerza a cometer siempre la misma decisión.

## Niveles de dificultad — independientes del perfil

| Nivel | Competencia prevista |
|---|---|
| Inicial | Selección preflop básica, errores razonables y escasa lectura contextual |
| Intermedio | Rangos posicionales, pot odds básicos, apuesta de valor y disciplina postflop |
| Avanzado | Texturas, SPR, equity aproximada, tamaños de apuesta y adaptación rival |
| Experto | Modelos de rango y presión multicalle más sofisticados; consistencia y explotación sin información oculta |

Los niveles no representan una puntuación GTO certificada. Se podrán seleccionar sin modificar la mecánica de la mesa; configuración predeterminada intermedia hasta validar estadísticas.

## Adaptación y memoria (aprendizaje conductual, no IA generativa)

- Recoger observaciones del héroe y de oponentes: VPIP, PFR, fold ante agresión, 3-bet, showdown y agresividad por calle cuando existan muestras.
- Usar actualización incremental y suavizado bayesiano con prior inicial; limitar explotación si la muestra es escasa.
- Una observación de showdown puede actualizar rangos inferidos, pero un fold nunca revela cartas no vistas.
- Guardar perfiles adaptativos bajo `riverlab.v04.*` con versión de esquema. Permitir reiniciar aprendizaje por separado del historial, idealmente desde Settings.
- Ningún bot lee la mano privada del héroe para elegir acción.
- Decidir política de persistencia por rival fijo, sesión y dispositivo, sin servidores externos.

## Ritmo / actividad durante la partida

- Tiempo de respuesta variable según personaje, calle, tamaño del bote y complejidad de la decisión.
- Mantener modo rápido; ejecutar cálculo estratégico dentro de límite estricto para que el fallback de seguridad no tome decisiones por error.
- Menos pausas innecesarias para check y decisiones forzadas; más para 3-bet, river y botes grandes.
- Una mesa con identidad: recreativos limpean e igualan, TAG selecciona spots, LAG ejerce presión y balanced defiende.

## Entrenamiento y visualización

- Mostrar nivel y perfil de cada rival sin convertir la mesa en un panel de métricas invasivo.
- Al finalizar la mano, ofrecer explicación opcional de las decisiones principales: posición, precio, fuerza, proyectos y presión. No enseñar el contenido de cartas privadas no expuestas.
- Métricas de usuario y de rivales: VPIP/PFR/AF, fold vs bet, 3-bet y número de manos observadas (solo cuando sea estadísticamente representativo).
- Comparar evolución del jugador contra niveles; evitar confundir resultados de pocas manos con progreso de habilidad.

## QA / criterios de aceptación

1. Integridad del reparto, turnos, side pots, all-ins, split pots y conservación de fichas, incluida la recarga reglada.
2. No tomar decisiones con cartas ajenas no mostradas; pruebas con estado de información oculto explícito.
3. Repetibilidad de decisiones con semillas y configuraciones fijadas.
4. Análisis automatizado de **al menos 10.000 manos** por configuración representativa, para VPIP/PFR, frecuencia de subidas, timeouts, decisiones ilegales y rendimiento.
5. Verificar que las personalidades divergen estadísticamente con muestras suficientes y que incrementar dificultad mejora consistencia sin eliminar estilos.
6. Pruebas desktop y móvil, ES/EN, guardado/restauración y funcionamiento offline tras primera carga.
7. Mantener `main` V0.3.1 estable. El merge y nuevo despliegue de producción solo se realizan después de validar la candidata.

## Orden de desarrollo

1. Refactor aislado del contexto visible y del motor de decisiones.
2. Preflop por rangos, posición y sizing.
3. Postflop por board, equity aproximada y pot odds.
4. Personalidades calibradas y niveles de dificultad.
5. Memoria adaptativa / perfiles del rival.
6. Panel de entrenamiento y explicación postmano.
7. Stress tests, beta V0.4 y promoción posterior a producción.
