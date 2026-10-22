# RIVERLAB · Poker Room V0.4.0 (inteligencia estratégica; candidata)

Aplicación personal de Texas Hold'em No-Limit 6-max con fichas ficticias, sin dinero real.

## Funciones
- Mesa con jugador humano y cinco rivales virtuales.
- Interfaz en español e inglés.
- Pistas factuales opcionales sobre la combinación y proyectos de cartas propias.
- Historial de manos, reproducción por acciones, cartas mostradas en showdown y reparto de botes.
- Datos básicos de rendimiento, cronómetro de acción y Time Bank.
- PWA instalable desde HTTPS con caché offline cuando el navegador lo permite.
- Audio interactivo de mesa con carácter táctil y confortable: nuevos sonidos para check, fichas, cartas, apuestas y resultados; 13 muestras para escuchar en Ajustes.
- Silencio y volumen persistentes, y activación fiable de Web Audio tras un gesto del usuario.

## Repositorio y despliegue
- **Producción:** rama `main` (V0.3.5 Sound Atelier, validada).
- **Correcciones de estabilidad:** `fix/v032-integrity-audit` (V0.3.2).
- **Sonido interactivo:** `feat/v033-sound-design` (V0.3.3, ya incorporada).
- **Corrección Safari/audio:** `fix/v034-audio-activation` (V0.3.4, ya incorporada).
- **Sound Atelier:** `feat/v035-sonic-atelier` (V0.3.5, validada y publicada).
- **Inteligencia de bots:** `dev/v040-strategy-learning` (V0.4.0, candidata para pruebas).
- **Plan de IA anterior:** `dev/v04-bot-intelligence` (especificación de partida).
- **Nueva IA V0.4:** motor de rangos, equity, dificultades, personalidades y memoria estadística local.
- **Vercel:** proyecto personal `riverlab-poker`.

Aplicación estática sin build: `index.html`, `bots.js`, `sound.js`, `icon.svg`, `sw.js`, `manifest.webmanifest`, `vercel.json`.

## Auditoría
Ver [docs/V040_VALIDACION_BOTS.md](docs/V040_VALIDACION_BOTS.md) para el alcance y las pruebas de la V0.4 y [docs/V035_SOUND_ATELIER.md](docs/V035_SOUND_ATELIER.md) para la versión sonora. Para revisiones anteriores: [docs/V034_AUDIO_ACTIVATION_FIX.md](docs/V034_AUDIO_ACTIVATION_FIX.md) y [docs/AUDITORIA_V032.md](docs/AUDITORIA_V032.md).

### Pruebas automatizadas
Requisitos: Node.js 22+ y, opcionalmente, Python con Playwright/Chromium.

```sh
node --test tests/smoke.test.cjs tests/sound.test.cjs tests/bots.test.cjs tests/bots.stress.test.cjs tests/bots.game-sim.test.cjs
```

## Persistencia y limitaciones
El juego almacena preferencias y sesiones terminadas en `localStorage` en el navegador. Las sesiones de V0.3.1 siguen utilizando `riverlab.v03.session`; los cambios de versión no deben borrar este espacio. Las manos en curso no se restauran y el contenido no se sincroniza entre dispositivos.

Los rivales son heurísticos; no se afirma compatibilidad GTO ni se habilita dinero real.
