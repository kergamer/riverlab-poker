# RIVERLAB V0.3.5 — SOUND ATELIER

**Tipo:** refinamiento estético de la experiencia de juego.  
**Punto de partida:** versión estable V0.3.4 en `main`.  
**Rama:** `feat/v035-sonic-atelier`.  
**Estado inicial:** preview de Vercel; no sustituye la web principal hasta validar la experiencia auditiva.

## Identidad: sala de póker elegante y cómoda

La mesa deja atrás los avisos electrónicos demasiado evidentes. Los efectos se construyen con capas cortas de ruido filtrado, armónicos suaves y resonancias inspiradas en superficies táctiles. Sin música continua, locuciones ni descargas externas.

**Regla clave:** las acciones cotidianas deben ser discretas y repetibles sin fatiga; los momentos importantes introducen más detalle, pero nunca un sonido de máquina tragaperras.

| Acción | V0.3.5 |
|---|---|
| CHECK | Toque mate de madera, con roce de fieltro; respuesta directa y silenciosa |
| CALL | Dos fichas ligeramente distintas, de resonancia suave |
| RAISE | Tres fichas en una secuencia ligera y ascendente |
| ALL-IN | Deslizamiento de fichas y cierre grave amortiguado, sin alarma |
| FOLD | Carta que se desliza por el fieltro y contacto final |
| DEAL / NUEVA MANO | Varias cartas suaves y textura breve de barajado |
| SHOWDOWN | Dos cartas reveladas y mínima expectación armónica |
| VICTORIA | Fichas y tres notas muy suaves tipo marimba, sin fanfarria |
| BOTE | Dos fichas graves y absorción en fieltro |
| CLIC | Confirmación breve, de menor presencia que las acciones |
| CARTAS / FICHAS | Muestras individuales para examinar la textura acústica |

## Dinámica de sesión

- **Variación sutil por evento:** pequeñas oscilaciones deterministas de afinación para evitar repetición mecánica.
- **Diferencia jugador/bots:** los bots emiten efectos más discretos.
- **Mezcla según ritmo:** golpes próximos entre sí se atenúan para reducir fatiga en partidas rápidas.
- **Accesibilidad:** control de volumen de 0 a 100, silencio, activación por gesto, estado verificable en Safari/iOS.
- **Control de seguridad:** la música no se reproduce en segundo plano y el módulo no toma decisiones de póker.

## Escucha comparativa

En **Ajustes → Sonido de la mesa → Escucha el nuevo sonido**, hay 13 botones que reproducen de forma independiente los efectos de check, call, raise, all-in, fold, reparto, nueva mano, showdown, victoria, bote, carta, ficha y clic.

La previsualización espera la activación real del motor Web Audio antes de emitir un efecto en Safari. El panel no modifica apuestas, fichas, historial ni decisiones.

## Verificación

- Tests automáticos `tests/sound.test.cjs` y `tests/smoke.test.cjs` en GitHub Actions.
- Comprobación de integridad del código, estados de audio, caché offline y permisos de activación.
- Se conserva `riverlab.v03.session` y la compatibilidad con los datos del juego.
- El timbre se debe valorar escuchando en dispositivos reales: las pruebas de software no pueden demostrar que el resultado sea subjetivamente satisfactorio.

## Publicación

Primero Vercel Preview de `feat/v035-sonic-atelier`. La versión de producción V0.3.4 se mantiene hasta la decisión de publicar el nuevo diseño.
