# RIVERLAB V0.3.3 — Sistema de sonido interactivo

**Base:** V0.3.2 auditada y publicada en `main`.  
**Rama de desarrollo:** `feat/v033-sound-design`.  
**Destino inicial:** Vercel Preview. No alterar la producción antes de escuchar la propuesta y validarla.

## Identidad sonora

- Minimalista, táctil y moderna: impactos suaves de fichas, roce de naipes y confirmaciones breves.
- Sin música, voces ni recursos descargados de terceros.
- Síntesis local Web Audio: osciladores, filtros, ruido amortiguado y envolventes cortas. Código en `sound.js`.
- Volumen limitado de origen, voces breves y control antirrepetición para evitar una mesa ruidosa.

## Mapa de eventos

| Evento | Sonido | Dónde se dispara |
|---|---|---|
| Interfaz | Clic cálido, seco, breve | Botones secundarios, navegación y diálogo |
| Nueva mano | Roce suave + cartas iniciales | Mano iniciada, tras reinicio o continuación |
| Flop/turn/river | Deslizamiento de cartas | Las nuevas cartas aparecen en el tablero |
| Check | Un golpe mate | Check válido |
| Call | Dos impactos breves de fichas | Call válido |
| Bet/Raise | Grupo ascendente de fichas | Raise o apuesta válida |
| All-in | Grupo de fichas con cierre grave | Jugador apuesta/iguala su stack completo |
| Fold | Roce corto de cartas | Retirada válida, incluida la automática |
| Showdown | Revelación con elevación tonal | Cartas reveladas al llegar al showdown |
| Cobro | Impactos discretos de bote | Mano terminada ganada por bots |
| Victoria del jugador | Tres notas ascendentes y fichas | Mano ganada, con o sin showdown |
| Ajuste de apuesta | Clic tenue | Botones de sizing |
| Probar sonido | Dos fichas cortas | Botón de prueba en Ajustes |

Las acciones ajenas se reproducen a menor volumen que las del jugador. Los sonidos se limitan mediante cooldowns y ventana máxima de sonidos programados, especialmente en modo rápido y rondas all-in.

## Controles y accesibilidad

- Botón **♫ ON / ♫ OFF** en la cabecera de la mesa, con nombre accesible y estado `aria-pressed`.
- **Ajustes → Sonido de la mesa**: activar/desactivar, volumen 0–100 y botón para probar el audio.
- Valores guardados en `riverlab.v03.soundEnabled` y `riverlab.v03.soundVolume`. No se altera el formato existente de la sesión de juego.
- Audio desactivable inmediatamente, volumen suave por defecto.
- En navegadores sin Web Audio los controles se deshabilitan sin afectar a la partida.
- Ningún sonido se genera antes de un gesto del usuario. Se suspende la reproducción cuando el documento no es visible.

## Validación técnica

- Pruebas automáticas de la sintaxis de ambos scripts y carga del motor existente.
- Motor sonoro simulado con `AudioContext` de prueba.
- Inicio silencioso hasta la interacción del usuario.
- Persistencia y efectividad de volumen/silencio.
- Emisión acústica ante acción válida y ausencia de cambios en `riverlab.v03.session`.
- Caché PWA `riverlab-v033-static-1` que incluye `sound.js`.

**Límites:** el timbre final y los niveles son subjetivos y requieren revisión escuchando la candidata, especialmente con auriculares y altavoces de móvil. Pueden variar entre navegadores por Web Audio, gestión del volumen y estado del dispositivo.

## Despliegue
La rama de sonido no modifica `main`. Vercel crea una URL de preview que puede exigir acceso autenticado. Una vez aprobada la experiencia sonora, integrar en `main` para publicar V0.3.3.
