# RIVERLAB V0.3.4 — Corrección de activación de audio

## Problema confirmado
La V0.3.3 mostraba «♫ ON» únicamente según la preferencia almacenada, aunque `AudioContext` siguiera `suspended` o `interrupted` (Safari/iOS). Además, «Probar sonido» ejecutaba el efecto inmediatamente después de llamar a `resume()`, que puede completarse de forma asíncrona. El resultado podía ser silencio sin mensaje de error.

## Solución
1. Solicitar `resume()` dentro de los gestos del usuario y emitir el preview **después** de que el motor llegue a estado `running`.
2. Mantener brevemente pendiente la solicitud de prueba acústica y descartarla si ya ha pasado el tiempo máximo o la pestaña no está visible.
3. Reconocer contextos `suspended`, `interrupted` y `closed`; permitir recuperación mediante nueva interacción sin reproducción automática en segundo plano.
4. Probar la categoría `navigator.audioSession.type='playback'` cuando la admite el navegador, dentro de una interacción del usuario.
5. Mostrar «♫ ACTIVAR» mientras el contexto no esté listo, «♫ ON» cuando el motor esté `running`, «♫ OFF» cuando esté silenciado, «♫ 0 %» cuando el volumen es cero, y estado explicativo en Ajustes.
6. Subir ligeramente volumen inicial y nivel máximo sin eliminar control de volumen ni silencio.
7. Mantener claves `riverlab.v03.sound*` y `riverlab.v03.session` para conservar todas las preferencias y partidas.
8. Versionar la caché PWA como `riverlab-v034-static-1` para distribuir el script corregido.

## Pruebas automatizadas
Los tests de GitHub Actions incluyen casos específicos de activación diferida de `AudioContext`, interrupción y posterior reanudación, indicador fiel al estado, volumen, silencio y conservación del historial. El despliegue de prueba se valida con Vercel.

## Limitación de Safari y del hardware
La API `AudioContext.state='running'` **no garantiza que el dispositivo emita audio físicamente**. El usuario puede tener el volumen multimedia a cero, salida Bluetooth diferente o modo silencio del iPhone. WebKit también documenta fallos de salida de audio en determinadas versiones de iOS aunque JavaScript informe un estado normal. El diagnóstico indica *el estado del motor web*, no una medición del sonido del altavoz.

## Publicación
Base V0.3.3 en `main`; corrección probada primero en `fix/v034-audio-activation`. La versión V0.3.4 no toca las reglas, el historial ni la lógica del póker.
