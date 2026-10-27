# RIVERLAB — V2 / TO-DO 01: volumetría y pistas

**Estado:** integración móvil corregida el 27/10/2026 y verificada sobre la aplicación real servida localmente. Pendiente de validación del usuario en su dispositivo y de inspección directa de Vercel Preview. TODO-01 no se da por cerrado ni se promueve a producción.
**Base:** versión jugable publicada V0.4.2.1, commit `39eee0fcc09c7cef5600dffd72f4aac7c20f6e58`.
**Rama:** `feat/v2-todo01-volumetry`.

## Requisito confirmado
La interfaz debe leerse al zoom normal en portátil, monitor, ordenador Apple o móvil. Cuando las pistas estén activadas, deben ocupar menos altura sin suprimir información ni modificar su mecánica, contenido o configuración. Deben dejar más espacio disponible a los controles inferiores.

## Cambio implementado
- `volumetry.css` y `volumetry-mobile.css`, cargados en ese orden después de los estilos originales de la aplicación (sobrescritura visual localizada).
- Rejilla horizontal compacta para las pistas en escritorio: encabezado, descripción, cinco cartas explicativas, proyectos, nota de cautela.
- Diseño responsive con puntos de adaptación a 1080, 800, 530 y 365 px. En teléfonos estrechos permite saltos de línea naturales, sin truncar los mensajes.
- Distribución más contenida de cabecera, zona de mesa y controles. Sin cambios de posición estructural del panel de acciones (eso corresponde al TO-DO 07).
- `sw.js` precarga ambas hojas y renueva la caché a `riverlab-v2-volumetry-2`. Revalida los recursos del shell al instalarse; la caché anterior solo se elimina tras una instalación correcta. Conserva sesión, preferencias, bots y audio offline.
- Hoja móvil limitada a 530 px o menos. Acciones principales, preselecciones de apuesta y slider con altura mínima de 44 px; explicaciones, proyectos y nota de pistas de 12 px. Selector de idioma de 16 px para evitar el zoom automático de formularios en iOS. Sin bloqueo del zoom ni del desplazamiento vertical.
- Separación entre controles de sala, cartas de jugadores, bote, cartas comunitarias, texto de calle y pistas; los importes apostados también se incluyen en las pruebas.
- Ningún cambio en `bots.js`, `sound.js`, reglas, resultados, memoria, sesión ni textos informativos de pistas.

## Verificación reproducible sobre la aplicación real
`tests/volumetry.browser.cjs` sirve los archivos de esta rama y usa el renderizador y evaluador de pistas originales, con estados visuales deterministas. No sustituye reglas de juego ni modifica archivos de aplicación.

- 390 × 844 y 320 × 640: preflop, flop, turn, river y jugador retirado, tanto en español como en inglés (20 composiciones).
- Cinco cartas explicativas postflop, procedencia de las cartas, proyectos de color y escalera, explicación y advertencia completas. Sin desbordamiento horizontal, recortes ni solapamientos.
- Cartas con etiquetas accesibles; tamaños táctiles, navegación por teclado, foco visible, activación/desactivación de pistas y ejecución de una acción real.
- 1366 × 768: geometría y fuentes idénticas al desactivar la hoja móvil, que no debe afectar a escritorio.
- PWA instalada con la caché anterior: actualización, precarga de ambas hojas, eliminación de la caché antigua sin afectar a otra aplicación, conservación de sesión y recarga offline con pistas, bots y audio disponibles.

Las capturas completas, capturas de acciones y medidas se guardan en `test-results/volumetry/<navegador>/`. La ejecución local utiliza Chromium; GitHub Actions incorpora una matriz Chromium/WebKit y conserva los artefactos durante 14 días. WebKit automatizado no equivale a una prueba física en iPhone.

En 320 × 640 es necesario desplazarse verticalmente para acceder a todas las acciones. Se conserva la legibilidad y el tamaño táctil; no se fuerza toda la mesa dentro de una sola pantalla.

```sh
node --test tests/*.test.cjs
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install --with-deps chromium webkit
node --test tests/volumetry.browser.cjs
BROWSER_ENGINE=webkit node --test tests/volumetry.browser.cjs
```

La regresión existente incluye reglas y datos, evaluación de manos, 10.000 manos integradas, estrés y calibración de bots, aprendizaje y sonido. Los scripts del HTML, `bots.js`, `sound.js` y `volumetry.css` permanecen idénticos a la base de esta corrección (`4f2567d`).

## Validación requerida
1. Abrir la Preview en navegador de escritorio con zoom 100 % y pistas activadas; verificar la legibilidad de textos y de las cinco cartas.
2. Comprobar un portátil de pantalla corta y un móvil, sin necesidad de reducir manualmente el zoom.
3. Jugar manos preflop, flop, turn y river, con y sin pistas. Confirmar que todo el contenido se muestra y los controles funcionan.
4. Confirmar que la compactación respeta la ergonomía del póker y que **solo entonces** corresponde marcar TODO 01 como completado y promover a `main`.

Las siguientes mejoras de posición de acciones, panel lateral e identidad visual mantienen sus números originales y no se consideran completadas por esta intervención.
