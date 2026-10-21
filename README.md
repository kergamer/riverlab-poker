# RIVERLAB · Poker Room V0.3.2 (candidata auditada)

Aplicación personal de Texas Hold'em No-Limit 6-max con fichas ficticias, sin dinero real.

## Funciones
- Mesa con jugador humano y cinco rivales virtuales.
- Interfaz en español e inglés.
- Pistas factuales opcionales sobre la combinación y proyectos de cartas propias.
- Historial de manos, reproducción por acciones, cartas mostradas en showdown y reparto de botes.
- Datos básicos de rendimiento, cronómetro de acción y Time Bank.
- PWA instalable desde HTTPS con caché offline cuando el navegador lo permite.

## Repositorio y despliegue
- **Producción:** rama `main` (V0.3.1 validada hasta la aprobación de la corrección).
- **Correcciones de estabilidad:** `fix/v032-integrity-audit` (V0.3.2).
- **IA de los bots:** `dev/v04-bot-intelligence` (trabajo futuro).
- **Vercel:** proyecto personal `riverlab-poker`.

Aplicación estática sin build: `index.html`, `icon.svg`, `sw.js`, `manifest.webmanifest`, `vercel.json`.

## Auditoría
Ver [docs/AUDITORIA_V032.md](docs/AUDITORIA_V032.md) para fallos, correcciones, pruebas superadas y límites conocidos.

### Pruebas automatizadas
Requisitos: Node.js 22+ y, opcionalmente, Python con Playwright/Chromium.

```sh
node tests/audit_tests.js index.html
node tests/deep_regressions.js
node tests/uncalled_fixtures.js
node tests/exhaustive_hand_rank.js
python tests/browser_tests.py
```

## Persistencia y limitaciones
El juego almacena preferencias y sesiones terminadas en `localStorage` en el navegador. Las sesiones de V0.3.1 siguen utilizando `riverlab.v03.session`; los cambios de versión no deben borrar este espacio. Las manos en curso no se restauran y el contenido no se sincroniza entre dispositivos.

Los rivales son heurísticos; no se afirma compatibilidad GTO ni se habilita dinero real.
