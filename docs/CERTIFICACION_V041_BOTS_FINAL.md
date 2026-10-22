# RIVERLAB V0.4.1 — Dictamen de auditoría y certificación

**Fecha:** 22 de octubre de 2026  
**Objeto:** motor de bots de RIVERLAB V0.4.0; no se audita una V0.4.1 publicada  
**Versión fuente verificada:** main @ 7f4222a0c478f08cfdb938ce5a93e37ad166d722  
**Rama exclusiva de auditoría:** audit/v041-bot-performance  
**Dictamen:** **aprobación funcional parcial; NO acreditada la progresión estratégica de dificultad ni el beneficio de la adaptación.** No se recomienda promocionar cambios estratégicos a producción.

## 1. Evidencia de ejecución y metodología

- **20 combinaciones de personalidad y nivel** (5 × 4), 4.140 situaciones idénticas por combinación: **82.800 decisiones estructuradas**, sin decisiones ilegales ni dependencia observada respecto a cartas ocultas ajenas.
- **20 torneos con motor real de seis plazas**, 900 manos por cada uno de tres comportamientos rivales (oponentes mixtos, cinco calling stations y cinco overfolders): **54.000 manos completas**. Incluyen rotación de posiciones, ciegas, rondas de apuesta, reparto y cierre de botes; se comprueba conservación de fichas en todas las manos y legalidad en cada decisión.
- Los torneos reinician el stack a 100 BB por mano y emplean un reparto determinista independiente de las decisiones. No son una cash game continuada con efectos de bankroll a largo plazo.
- **Un mismo conjunto de semillas** se utiliza en los distintos niveles para reducir variabilidad, aunque las secuencias de apuestas pueden divergir. Los IC95 son aproximaciones de bloques de 60 manos, no pruebas definitivas de superioridad.
- **Aprendizaje:** tras 600 manos sintéticas con secuencias públicas **legalmente coherentes** (si el rival se retira preflop, no actúa después), se comparan 240 oportunidades de apertura por personalidad con aprendizaje activado y desactivado. Mide **sensibilidad conductual**, no rentabilidad; no se ha acreditado mediante torneos de aprendizaje activado.
- **Nueva comprobación independiente:** \`tests/benchmark_v041_evaluator.test.cjs\` compara el evaluador de bots con el evaluador exhaustivo del propio juego en 12.000 muestras, comprueba nuts frente a 1–5 rivales y ausencia de dependencia respecto a datos privados inyectados. Se ejecutó con éxito como parte de las regresiones de GitHub Actions.

**Fuentes reproducibles:** [torneos, evaluador y matriz de decisiones / GitHub Actions](https://github.com/kergamer/riverlab-poker/actions/runs/39789739795); [auditoría de aprendizaje con trayectorias válidas](https://github.com/kergamer/riverlab-poker/blob/audit/v041-bot-performance/tests/benchmark_v041_learning_valid.cjs); [ejecución de validación adicional](https://github.com/kergamer/riverlab-poker/actions/runs/39834618565).

## 2. Resultados de partidas completas — bb/100

**Advertencia:** bb/100 aquí es beneficio por 100 manos sobre una mesa de seis jugadores con cinco referencias definidas. Cada valor procede de 900 manos, con varianza elevada. NO se compara con métricas de póker profesional ni se interpreta un número positivo como habilidad acreditada.

### Rival mixto (los otros cinco bots de V0.4, nivel Intermedio)

| Bot | Principiante | Intermedio | Avanzado | Experto |
|---|---:|---:|---:|---:|
| KAI (loose-passive) | +96,4 | +38,2 | +78,2 | +20,3 |
| MARC (tight-passive) | −46,7 | −0,7 | +18,2 | +8,9 |
| ALEX (TAG) | +65,4 | −68,5 | +16,9 | +16,7 |
| NOVA (LAG) | +55,2 | +77,3 | +74,0 | +81,9 |
| LEO (balanced) | +74,5 | −22,3 | +36,7 | +56,4 |

IC95 muy amplios: por ejemplo, TAG Experto +16,7 bb/100 [−78,6; +112,0], TAG Principiante +65,4 [−63,5; +194,4]. Por tanto no se puede concluir que uno sea mejor en esas condiciones.

### Cinco rivales calling station (igualan casi todas las apuestas)

| Bot | Principiante | Intermedio | Avanzado | Experto |
|---|---:|---:|---:|---:|
| KAI | +234,9 | +202,2 | +123,1 | +140,1 |
| MARC | +160,4 | +141,2 | +83,1 | +89,7 |
| ALEX | +692,8 | +610,9 | +651,7 | +530,9 |
| NOVA | +1211,7 | +1098,2 | +1133,6 | +802,3 |
| LEO | +586,4 | +609,8 | +499,4 | +500,4 |

En **los cinco perfiles**, Experto obtiene un punto estimado menor que Principiante. **Este resultado activa una alerta de calibración**, aunque las bandas de incertidumbre impiden afirmar estadísticamente que el experto sea peor. Este rival extremo provoca ganancias atípicas cuando nunca retira las manos; son valores relativos al escenario sintético.

### Cinco rivales overfolder (abandonan excesivamente)

| Bot | Principiante | Intermedio | Avanzado | Experto |
|---|---:|---:|---:|---:|
| KAI | +49,1 | +49,3 | +51,1 | +51,9 |
| MARC | +30,7 | +23,8 | +24,5 | +25,3 |
| ALEX | +51,9 | +49,4 | +48,0 | +51,1 |
| NOVA | +87,1 | +86,5 | +85,8 | +95,9 |
| LEO | +53,8 | +49,0 | +49,7 | +52,4 |

Los resultados son más estables en este escenario y confirman una mayor capacidad de robo de botes en NOVA, pero no ordenan de forma fiable los cuatro niveles en todas las personalidades.

## 3. Aprendizaje: evidencia de reacción, no de ventaja

En la prueba revisada, después de 600 manos por estilo con secuencias públicas posibles y 240 decisiones pareadas por bot:

| Bot | Subidas sin/con aprendizaje frente a overfolder | Subidas sin/con aprendizaje frente a calling station |
|---|---:|---:|
| KAI | 94 → 95 | 94 → 91 |
| MARC | 63 → 68 | 63 → 58 |
| ALEX | 92 → 115 | 92 → 69 |
| NOVA | 136 → 152 | 136 → 110 |
| LEO | 95 → 115 | 95 → 74 |

La respuesta sigue una dirección intuitiva: más presión contra quien abandona demasiado y más selectividad contra quien iguala en exceso. En la prueba revisada, una retirada preflop impide expresamente cualquier acción posterior. **No está acreditado que la adaptación aumente el EV o bb/100**: las trayectorias son posibles, pero los perfiles siguen siendo sintéticos y no proceden de torneos completos.

**Hallazgo técnico para V0.4.2:** el estadístico `foldRate` que utiliza el aprendizaje agrega folds preflop y postflop. Puede interpretar como excesivo abandono una selección preflop normal; para evitar falsos positivos habrá que separar las oportunidades por calle y situación antes de recalibrar el sistema.

## 4. Dictamen por criterio

| Criterio | Dictamen |
|---|---|
| Partidas completas, conservación de fichas y legalidad (54.000 manos de torneo) | **APTO** |
| Cinco personalidades diferenciadas en parámetros y frecuencias | **APTO descriptivo** |
| Protección contra uso de cartas ocultas ajenas en pruebas de política | **APTO en alcance de pruebas** |
| Cuatro niveles de dificultad configurables y estables | **APTO funcional** |
| Superioridad estratégica creciente Inicial → Intermedio → Avanzado → Experto | **NO ACREDITADA** |
| Dominio real del nivel Experto | **NO ACREDITADO** |
| Aprendizaje cambia decisiones ante tendencias | **APTO conductual con trayectorias sintéticas posibles** |
| Aprendizaje aumenta el rendimiento frente a estilos explotables | **NO ACREDITADO** |
| Calidad GTO / rendimiento comparable a un solver profesional | **FUERA DE ALCANCE** |
| Compatibilidad en navegadores físicos y continuidad real de sesión prolongada | **VERIFICACIÓN ADICIONAL RECOMENDADA** |

**Conclusión de certificación:** se CIERRA el expediente de auditoría V0.4.1 con dictamen **PARCIAL / NO APTA PARA CERTIFICACIÓN ESTRATÉGICA PLENA**. La estabilidad funcional de la V0.4 publicada permanece validada. No se autoriza afirmar que el nivel Experto sea sistemáticamente superior ni que la adaptación sea rentable.

## 5. Requisitos de aceptación para V0.4.2

1. Afinar ventaja de rangos, equity estimada y tamaños de apuesta contra rivales muy pasivos: el aumento de cómputo no debe degradar sistemáticamente la extracción de valor.
2. **Prioridad alta:** separar aprendizaje por **tipo de oportunidad** y por calle (fold ante apuesta en flop/turn/river frente a fold preflop) para evitar que la selección inicial normal se confunda con sobrefoldear frente a presión.
3. Probar adaptación con el **motor real**: jugador guionizado en asiento humano, cinco bots que solo ven acciones públicas, con y sin aprendizaje, mismas barajas y semillas.
4. Repetir torneos con reparto pareado, mayor muestra, intervalos de confianza para diferencias entre niveles y al menos dos tipos de rivales adicionales.
5. Aprobar integridad de reglas, PWA/audio, regresiones de historial y pruebas móviles antes de proponer publicación.

**Gobierno de versiones:** no se modifica \`main\`, que mantiene V0.4; todo el material de certificación queda en \`audit/v041-bot-performance\`.
