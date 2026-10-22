# RIVERLAB V0.4.2 — Candidata de calibración estratégica

**Base:** auditoría V0.4.1 publicada en `main`, commit `27a521ee807ddf60671033fe7a9983161b7e3742`  
**Desarrollo:** `feat/v042-bot-calibration` (adaptación sobre main de los cambios de `feat/v042-strategy-calibration`)  
**Estado:** experimental; no publicado en `main`.

## Problemas identificados previamente
La auditoría de 54.000 manos encontró intervalos amplios de bb/100, sin evidencia suficiente de superioridad estratégica entre cuatro niveles. En pruebas contra calling stations, Experto no superó al nivel Principiante en ninguno de los cinco perfiles en su estimación puntual. El aprendizaje variaba las acciones, pero no se había certificado mejora de EV.

## Cambios V0.4.2

1. Las estadísticas de folds públicos ante una apuesta se registran de forma separada por **preflop / flop / turn / river**. La adaptación usa la muestra de oportunidades de la calle actual y un prior para reducir sobreajuste. Se mantiene la clave de memoria previa, y los campos nuevos se inicializan a cero al abrir datos antiguos.
2. Contra rivales que han igualado y siguen en juego, el motor reduce la frecuencia de faroles en niveles altos.
3. Con dobles parejas o mejor frente a rivales pasivos, evita que una estimación de equity multiway demasiado pesimista suprima todas las apuestas por valor.
4. Ajusta umbrales de apuesta, frecuencia y tamaño de valor, sin introducir información de cartas ajenas privadas.
5. Se conserva la API del motor; no se cambian `act()`, botes laterales, las reglas del juego, preferencias ni identificadores de historial.
6. Marcadores V0.4.2 y caché PWA `riverlab-v042-static-1`, sin modificar sonido.
7. El panel **Performance** presenta agresividad y porcentaje de folds postflop observados, con umbrales de muestra, además de VPIP/PFR, dificultad y versión del motor.

## Verificaciones
- `tests/bots.v042.test.cjs`: memoria segregada por las cuatro calles, migración de datos antiguos, apuestas por valor, panel Performance, motor y no cheating.
- Regresiones anteriores: 169 clases, integridad de cartas, 10.000 manos, sonido/PWA, evaluador.
- Auditorías de las 20 combinaciones de personalidad/dificultad con 3 rivales de referencia. Revisar **resultados de GitHub Actions de esta rama**, no sustituirlos por números de V0.4.1.

## Criterios de aprobación aún exigibles
- Todos los checks GitHub Actions en SUCCESS.
- Torneos pareados muestran mejora de extracción de valor sin pérdida notable frente a mixtos y overfolders; intervalos de confianza y limitaciones documentados.
- Adaptación con historias físicamente realizables, activada/desactivada sobre la misma distribución de barajas y asientos.
- Una prueba real de escritorio/móvil de historial, sonido y reanudación.
- La validación humana autoriza la publicación; nunca fusionar a `main` por simples resultados de CI.

## Limitación
La detección de un calling station usa la última acción pública `call` en los rivales activos; es un proxy situacional, no una clasificación longitudinal estadísticamente robusta. La mejora de EV no se da por acreditada sin análisis de torneos posterior. Los torneos de 900 manos por configuración resultan exploratorios, especialmente por su elevada variabilidad; no se afirma que Experto supere sistemáticamente a Principiante.

**Punto de recuperación:** el despliegue del commit `27a521ee807ddf60671033fe7a9983161b7e3742`, último main auditado antes de estos cambios jugables.
