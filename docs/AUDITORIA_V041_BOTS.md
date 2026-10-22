# RIVERLAB V0.4.1 — Primera auditoría empírica del comportamiento de bots

**22 de octubre de 2026 · base auditada:** V0.4.0, rama `main` (`7f4222a0`).  
**Rama de auditoría:** `audit/v041-bot-performance`.  
**Tipo de evidencia:** escenarios pareados con RNG fija, evaluando decisiones del motor, no resultados económicos ni una certificación de calidad GTO.

## Protocolo ejecutado
- **20 configuraciones** = 5 personalidades × 4 dificultades.
- **4.140 escenarios por configuración**, distribuidos entre aperturas, premiums, manos débiles, defensa vs raise, respuesta vs 3-bet, ciega grande y escenarios postflop y river.
- **82.800 decisiones principales** (4.140 × 20), más verificaciones de cartas ocultas alternativas, implementadas en `tests/benchmark_v041_scenarios.cjs`.
- Las mismas cartas y contextos se repiten para cada bot y dificultad. Se inyecta la misma secuencia aleatoria para comparabilidad.
- Acciones legales y ausencia de dependencia respecto a cartas privadas rivales verificadas. Cada dificultad corrió como job aislado de GitHub Actions.
- Regresiones previas: test independiente de 10.000 manos completas; esta auditoría de escenarios NO equivale a 82.800 manos jugadas.

## Matriz: VPIP hipotético en oportunidades de apertura (%)
Este indicador cuenta call + raise en un banco de escenarios preflop, **no VPIP real de partidas con acciones previas**.

| Bot | Principiante | Intermedio | Avanzado | Experto |
|---|---:|---:|---:|---:|
| KAI · loose-passive | 59,08 | 53,98 | 54,08 | 53,80 |
| MARC · tight-passive | 32,04 | 27,03 | 27,04 | 26,95 |
| ALEX · TAG | 39,82 | 33,79 | 33,61 | 33,43 |
| NOVA · LAG | 55,28 | 50,56 | 50,84 | 50,55 |
| LEO · balanced | 42,87 | 36,66 | 36,85 | 36,76 |

## Matriz: proporción de raise en apertura (%)
| Bot | Principiante | Intermedio | Avanzado | Experto |
|---|---:|---:|---:|---:|
| KAI | 24,17 | 21,67 | 25,56 | 25,56 |
| MARC | 12,69 | 10,83 | 12,41 | 12,41 |
| ALEX | 29,54 | 25,46 | 27,96 | 27,87 |
| NOVA | 49,72 | 45,37 | 45,56 | 45,46 |
| LEO | 29,26 | 25,83 | 28,52 | 28,33 |

## Escenarios controlados
- **Premiums: frecuencia raise Intermedio:** KAI 41,25 %; MARC 39,17 %; ALEX 76,67 %; NOVA 91,25 %; LEO 70,83 %. En Avanzado y Experto, KAI 49,17 %, MARC 47,50 %, ALEX 85 %, NOVA 91,25 %, LEO 78,75 %.
- **7♥2♣ preflop:** los cinco perfiles participan en **0 %** de las oportunidades específicas de apertura en los cuatro niveles. Una mano muy débil debe descartarse con frecuencia, pero conviene medir posiciones, limps y robos extremos para decidir si existe rigidez excesiva.
- **River con jugada extremadamente fuerte:** se continúa el 100 % de los casos evaluados.
- **Comparación Avanzado vs Experto:** el comportamiento agregado es prácticamente equivalente en varios indicadores de apertura. El mayor cálculo de Monte Carlo del nivel Experto no permite por sí mismo declarar mejores decisiones ni mayor win rate.
- **Rendimiento computacional postflop p95 (ms):** Intermedio ~0,04–0,12; Avanzado ~0,25–0,35; Experto ~1,13–1,47, según personalidad y ejecución CI. Estas cifras describen el runner, no la latencia total del navegador móvil.
- **Legalidad:** 0 decisiones ilegales detectadas en el banco principal.
- **Cartas ocultas:** 0 divergencias en controles donde solo se alteraron cartas privadas ajenas de un estado de prueba.

## Diagnóstico crítico
1. **Diferenciación de estilos: confirmada descriptivamente.** NOVA sube con mucha más frecuencia que MARC; KAI entra en más botes y sube menos que NOVA.
2. **Separación de dificultad: parcialmente implementada, aún no demostrada estratégicamente.** Principiante entra con más manos; Avanzado y Experto no presentan diferencias suficientemente marcadas en frecuencia, aunque su cálculo postflop sí cambia.
3. **Calidad ante rivales reales: no demostrada.** Las tasas no son EV, bb/100 ni win rate frente a contrincantes de referencia. Para declararla hace falta un torneo de evaluación pareada con reparto reproducible, rotación de asientos, muestras amplias e intervalos de confianza.
4. **Aprendizaje adaptativo: instrumentado pero sin validar su eficacia explotativa.** Debe medirse con secuencias de oponentes que sobre-foldeen, sobre-igualen y jueguen equilibrado, manteniendo controles de no-aprendizaje.
5. **Riesgos a revisar:** exactitud del equity sampler multijugador y de la composición de rangos rivales; apertura versus múltiples agresiones; coherencia de sizings y pasividad de perfiles loose-passive/tight-passive.
6. **No se recomiendan cambios a producción a partir de un único banco de escenarios.** La fase siguiente debe ejecutar torneos, mostrar resultados por persona/nivel, detectar outliers y corregir la política con tests de regresión.

## Estado
Los cuatro trabajos comparativos de GitHub Actions concluyeron SUCCESS (22/10/2026). La auditoría se conserva en esta rama aislada, sin modificar ni desplegar sobre `main`.

**Conclusión:** comportamiento legal y personalidades distinguibles; equilibrio de las cuatro dificultades y ganancia por aprendizaje **pendientes de prueba**. No debe calificarse V0.4.1 como estratégicamente certificada por estos resultados.
