# RIVERLAB — V2 / TO-DO 01: volumetría y pistas

**Estado:** candidata implementada y desplegada solo en Vercel Preview, a la espera de validación visual del usuario.
**Base:** versión jugable publicada V0.4.2.1, commit `39eee0fcc09c7cef5600dffd72f4aac7c20f6e58`.
**Rama:** `feat/v2-todo01-volumetry`.

## Requisito confirmado
La interfaz debe leerse al zoom normal en portátil, monitor, ordenador Apple o móvil. Cuando las pistas estén activadas, deben ocupar menos altura sin suprimir información ni modificar su mecánica, contenido o configuración. Deben dejar más espacio disponible a los controles inferiores.

## Cambio implementado
- Nuevo `volumetry.css`, cargado después de los estilos originales de la aplicación (sobrescritura visual localizada).
- Rejilla horizontal compacta para las pistas en escritorio: encabezado, descripción, cinco cartas explicativas, proyectos, nota de cautela.
- Diseño responsive con puntos de adaptación a 1080, 800, 530 y 365 px. En teléfonos estrechos permite saltos de línea naturales, sin truncar los mensajes.
- Distribución más contenida de cabecera, zona de mesa y controles. Sin cambios de posición estructural del panel de acciones (eso corresponde al TO-DO 07).
- `sw.js` precarga `volumetry.css` y renueva caché de PWA para evitar estilos antiguos.
- Ningún cambio en `bots.js`, `sound.js`, reglas, resultados, memoria, sesión ni textos informativos de pistas.

## Prueba de composición local
Se aplicó el CSS a la maqueta estructural anterior de RIVERLAB y se midió en Chromium sin zoom, con un escenario de pistas que muestra las cinco cartas y la información completa. **Es una verificación visual de referencia sobre el layout, no una inspección visual directa de la V0.4.2.1 desplegada.**

| Pantalla | Altura de pistas antes | Después | Altura ahorrada |
|---|---:|---:|---:|
| 1366 × 768 | 194 px | 114 px | 80 px |
| 1024 × 768 | 194 px | 114 px | 80 px |
| 820 × 900 | 276 px | 143 px | 133 px |
| 390 × 844 | 282 px | 174 px | 108 px |
| 320 × 640 | 312 px | 233 px | 79 px |

En nueve tamaños de pantalla no se observaron barras de desplazamiento horizontal ni errores JavaScript en la maqueta. En móviles bajos **es normal seguir desplazando verticalmente la página**; este cambio no promete que toda la mesa y las acciones quepan a la vez en cualquier altura.

## Validación requerida
1. Abrir la Preview en navegador de escritorio con zoom 100 % y pistas activadas; verificar la legibilidad de textos y de las cinco cartas.
2. Comprobar un portátil de pantalla corta y un móvil, sin necesidad de reducir manualmente el zoom.
3. Jugar manos preflop, flop, turn y river, con y sin pistas. Confirmar que todo el contenido se muestra y los controles funcionan.
4. Confirmar que la compactación respeta la ergonomía del póker y que **solo entonces** corresponde marcar TODO 01 como completado y promover a `main`.

Las siguientes mejoras de posición de acciones, panel lateral e identidad visual mantienen sus números originales y no se consideran completadas por esta intervención.
