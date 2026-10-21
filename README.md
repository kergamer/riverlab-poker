# RIVERLAB · Poker Room V0.3.1

Aplicación personal de entrenamiento y juego Texas Hold'em No-Limit Cash Games 6-max. Sin dinero real.

## Funcionalidades
- Mesa de póker para un jugador humano y cinco rivales virtuales.
- Español predeterminado e inglés opcional.
- Pistas de jugada opcionales, actualizadas durante flop, turn y river.
- Límite de tiempo por decisión, Time Bank y acciones automáticas por inactividad.
- Historial, reproducción de manos y estadísticas.
- PWA instalable desde HTTPS; funcionamiento sin conexión tras la primera visita cuando el navegador lo permita.

## Arquitectura
Aplicación estática sin dependencias: `index.html`, `manifest.webmanifest`, `sw.js`, recursos de icono y `vercel.json`.
El historial se almacena localmente en el navegador, sin sincronización entre dispositivos.

## Publicación
El repositorio `kergamer/riverlab-poker` es la fuente principal. La rama `main` se desplegará automáticamente mediante Vercel.

## Estado
Versión experimental. Los rivales son heurísticos y no implementan soluciones GTO certificadas.
