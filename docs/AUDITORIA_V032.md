# RIVERLAB V0.3.2 — Auditoría técnica de estabilidad

**Fecha:** 21 de octubre de 2026  
**Origen:** `main` · commit `08902a5cf92d5cafd69cc705e98099a891af99bc` · web V0.3.1  
**Correcciones:** rama `fix/v032-integrity-audit`  
**Alcance:** NL Hold’em 6-max, turnos, apuestas, reparto de botes, pistas, historial/replay, estadísticas, datos locales, interfaz y PWA.

## Diagnóstico y medidas

| Área | Hallazgo | Medida aplicada |
|---|---|---|
| Botes y fichas | Las apuestas sobrantes no igualadas aparecían incorporadas al bote que se anunciaba como ganado. | Devolución explícita del exceso, con evento, importe y bote contestado real. |
| Botes secundarios | El historial no desglosaba los distintos botes ni quién cobraba cada uno. | Registro estructurado de botes y adjudicaciones, con visualización final en replay. |
| Showdown | La repetición omitía las cartas mostradas por los rivales que seguían en la mano. | Evento de showdown y exposición diferida hasta la revelación. Las cartas de los que se retiraron no se revelan. |
| Acciones | Una acción inválida podía detener el cronómetro del jugador o una acción fallida de bot podía quedarse sin fallback. | Validación previa a consumir tiempo y fallback del bot cuando `act()` falla. |
| Pistas | Algunos proyectos de escalera del tablero se atribuían erróneamente a las cartas privadas. | Los proyectos de escalera requieren aportación efectiva de una carta privada. |
| Pistas | Podían aparecer proyectos de categoría inferior pese a una jugada ya superior. | Filtro por categoría de jugada completada. |
| Historial matemático | Se confundían las fichas realmente aportadas con las pendientes de pagar. | Se guarda y muestra la contribución efectiva de cada acción; compatibilidad con eventos previos. |
| Historial secuencial | Aparecía prematuramente el resultado final de la mano durante su replay. | Resultado oculto hasta llegar al final; no se desvela el desenlace antes de tiempo. |
| Sesiones antiguas | Manos registradas con V0.3.1 carecían de desgloses de side pots. | Reconstrucción compatible cuando se conservan las cartas públicas y las reveladas. |
| Navegación | El turno y el Time Bank podían seguir corriendo al consultar historial, ajustes u otra pestaña. | Pausa/reanudación de los turnos y adaptación al estado visible del navegador. |
| Preferencias | Se guardaban cambios de ajustes en el espacio de claves `riverlab.v02`. | Escritura en `riverlab.v03` conservando lectura anterior como compatibilidad. |
| Sizing | Las opciones «medio bote / tres cuartos / bote» tenían importes fijos antes del flop pese a mostrar etiquetas proporcionales. | Cálculo proporcional también preflop, respetando el incremento mínimo y el stack. |
| Narrativa | Las acciones recientes se listaban en orden inverso y varios ganadores de distintos side pots podían figurar como un simple empate. | Registro visual en orden cronológico y mensaje de ganadores más neutral. |
| Persistencia | Si el historial alcanzaba el límite del almacenamiento, un fallo de `localStorage` podía impedir guardar toda la sesión. | Intentos descendentes conservando primero los datos de sesión y las manos más recientes; advertencia en Ajustes. |
| PWA | Una nueva versión podía reutilizar la caché V0.3.1 sin limpieza de versión. | Identificador de caché nuevo V0.3.2, retirando cachés anteriores. |

## Evidencia de pruebas

- **2.598.960 manos de cinco cartas** evaluadas; distribución exacta de las nueve categorías estándar validada.
- **2.500 manos completas simuladas** con decenas de miles de acciones: no se observaron decisiones ilegales, bloqueos ni descuadres de fichas en esta muestra.
- Pruebas dirigidas de showdown, botes secundarios, devoluciones de apuestas no igualadas, empates, apuestas válidas, reapertura de raises ante all-in corto, pistas y límites de almacenamiento.
- Prueba automatizada de interfaz en **1366 × 900 (escritorio)** y **390 × 844 (móvil)**: carga, cambio de pistas, navegación entre vistas, ajustes, juego hasta completar la mano, historial y replay. Sin errores JavaScript en esas ejecuciones.
- Comprobación estática de referencias PWA y conservación de las claves de sesión V0.3.
- **Prueba de 10.000 manos:** no completada por el límite de ejecución del entorno. No debe presentarse como aprobada ni como una evidencia de robustez a esa escala.

## Alcance y limitaciones

- La validación se centra en la lógica local y en las interfaces automatizadas. No hay una certificación formal externa del motor ni una garantía absoluta de ausencia de errores.
- **La IA estratégica de los cinco bots sigue siendo heurística**, deliberadamente fuera de esta intervención: corresponde a RIVERLAB V0.4.
- No existe un backend de sesión ni sincronización entre dispositivos; el progreso sigue en `localStorage` del navegador/origen.
- La PWA puede funcionar offline **tras** una primera visita con conexión y caché instalada, sujeto al navegador. El uso real offline en todos los dispositivos y versiones de iOS requiere pruebas manuales adicionales.
- Las manos antiguas se leen de forma compatible, aunque un historial incompleto no puede recrear datos que nunca fueron registrados.
- El proyecto no gestiona apuestas ni dinero real.

## Publicación y reversibilidad

1. Conservar `main` como base validada V0.3.1 hasta revisar esta candidata.
2. Desplegar la rama `fix/v032-integrity-audit` en un entorno **preview**, nunca inicialmente en producción.
3. Verificar carga web y datos de sesión en un navegador; comprobar en un dispositivo físico si la interfaz es adecuada.
4. Tras la aceptación de la candidata, integrar en `main` y verificar el nuevo despliegue en producción. Un despliegue o commit de producción previo permite rollback.
5. La rama `dev/v04-bot-intelligence` sigue separada; su implementación posterior deberá partir de la estabilidad ya corregida.

**Criterio de aprobación:** pruebas automatizadas superadas, sin bloqueos nuevos detectados, funcionamiento comprobado en previsualización y revisión de regresiones de historial/pistas antes de promover a producción.
