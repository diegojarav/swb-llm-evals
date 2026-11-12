# swb-llm-evals

Cómo mide el sitio de Sahara World Business a los proveedores de LLM, publicado para que cualquiera pueda comprobarlo: las tareas, los evaluadores, el método, una forma de repetir las tareas con tu propia clave y un historial con fecha de los resultados publicados.

English: [README.en.md](README.en.md)

## Qué es esto

El sitio https://www.saharaworldbusiness.com publica dos tableros sobre cuatro proveedores de API de LLM. Este repositorio existe para que no tengas que creernos: aquí están las seis tareas con sus respuestas esperadas, el código que corrige cada respuesta, la explicación del método y una copia diaria de lo que los tableros publican.

Cada proveedor se mide con su modelo por defecto en el sitio, que se nombra en su fila.

| | Evaluación de razonamiento | Tablero de latencia |
|---|---|---|
| Pregunta | ¿El modelo acierta seis tareas verificables, y a qué costo y en cuánto tiempo? | ¿Qué tan rápido empieza y termina una respuesta corta? |
| Frecuencia | Una vez al día | Cada seis horas |
| Modo de razonamiento (thinking) | Activado | Desactivado, en los modelos que tienen interruptor (la fila lo indica) |
| Tope de salida | 4.000 tokens, razonamiento incluido | 1.000 tokens, razonamiento incluido |
| Prompt | Seis tareas fijas en español, iguales para todos | Un prompt corto (tres oraciones), igual para todos |
| Qué se muestra | Respuestas correctas sobre intentos, parte de razonamiento, costo por 1.000 correctas, tiempo hasta la respuesta completa | Primer token visible y respuesta corta completa (mediana y P90), pings cortados en el tope. Ordenado por la respuesta corta completa |
| Ventana mostrada | Últimos 14 días, solo la versión actual del método | Últimos 7 días, solo la versión actual del método |
| Medido desde | Nuestro servidor (Google Cloud, us-east4) | Igual |

La explicación completa del método está en [METHODOLOGY.md](METHODOLOGY.md) (en inglés).

## Cómo comprobarnos en tres pasos

Necesitas Node 22 o superior. Después de clonar el repositorio, ejecuta `npm install` una vez.

**1. Revisa las tareas y los evaluadores.** Abre [`src/eval-tasks.ts`](src/eval-tasks.ts): es una copia literal del archivo que usa el sitio. Compara los prompts con el bloque `method` de https://www.saharaworldbusiness.com/api/eval/leaderboard. Luego ejecuta `npm test`: comprueba que cada respuesta esperada pasa su propio evaluador, que la copia no fue modificada y que el bloque `method` guardado en cada resultado coincide con estas tareas.

**2. Repite las seis tareas con tu propia clave.** Funciona con cualquier endpoint compatible con la API de chat completions de OpenAI:

```
LLM_API_KEY=<tu clave> npx tsx src/reproduce.ts --base-url https://api.example.com/v1 --model <id del modelo>
```

En PowerShell: `$env:LLM_API_KEY = "<tu clave>"` y después el mismo comando sin el prefijo. Por cada tarea imprime si fue correcta, si la respuesta quedó cortada en el tope de tokens, los tokens de salida y de razonamiento (cuando el endpoint los informa) y los segundos. Al final imprime `Correct: N / 6`. Usa `--max-tokens` para cambiar el tope (4.000 por defecto, como el sitio) y `--show-answers` para ver el texto de cada respuesta. La clave se lee solo de la variable de entorno, nunca se imprime y solo se envía al endpoint que indicas. El script no guarda nada. Antes de usarlo con una clave, lee [SECURITY.md](SECURITY.md) (en inglés): cómo avisar de un problema en estos scripts y qué hace el script con tu clave.

**3. Recalcula el análisis y compáralo.** `npm run analyze` lee los dos endpoints públicos y imprime las tablas con intervalos de confianza, la vista por tarea, los pings cortados en el tope de tokens y los tres rankings de velocidad. Compara con lo que muestra el sitio y con los archivos de `results/`.

## Qué puedes reproducir y qué no

Puedes reproducir:

- Las seis tareas contra cualquier proveedor, con tu propia clave (paso 2).
- El análisis, a partir de los endpoints públicos o de los archivos guardados (paso 3).
- Los resultados publicados cada día, que están guardados con fecha en `results/`.

No puedes reproducir:

- Nuestros tiempos exactos. Dependen de dónde está nuestro servidor (us-east4) y de su red. Tus segundos serán otros.
- El tablero de latencia. Su ejecutor todavía no está en este repositorio. Hoy solo están sus números publicados y su descripción. El prompt, el tope y la versión del ping están en el bloque `method` de `/api/arena/leaderboard`.
- Las respuestas de nuestras ejecuciones diarias. El sitio publica cuántas veces se intentó y se acertó cada tarea, y los tokens y tiempos, pero no el texto de las respuestas. Por eso `src/reproduce.ts` es una comprobación independiente de las tareas y los evaluadores con tu clave. No es una auditoría de nuestras ejecuciones.

El script `src/reproduce.ts` hace solicitudes simples sin streaming, no envía ningún interruptor de razonamiento (el sitio tampoco lo envía en esta evaluación) y usa el modelo que tú elijas. Sus resultados pueden diferir de los del tablero.

## Qué sostienen los números y qué no

- **La muestra son seis tareas.** Cada ejecución repite las mismas seis, así que más días suman respuestas, no tareas. Dieciocho aciertos de dieciocho son tres ejecuciones de seis tareas. Contadas como respuestas, el intervalo de Wilson al 95% va de 82% a 100%. Contadas como tareas (seis de seis), va de 61% a 100%. Eso sostiene "no vimos fallas en estas seis tareas", no "100% de precisión". El tablero muestra conteos ("18 de 18 respuestas correctas") y ningún porcentaje, y solo el rango sobre tareas.
- **Es un control de salud, no un ranking.** Cuando todos los proveedores están en 100%, la prueba está saturada: confirma que nada está roto y no puede ordenar por precisión. El costo y el tiempo son las columnas con información.
- **Las diferencias pequeñas son ruido.** Una tarea vale 16,7 puntos. Con seis tareas solo se distinguen con confianza diferencias muy grandes entre dos proveedores.
- **El P90 del tablero de latencia se apoya en unas 28 muestras,** así que lo fijan las dos o tres solicitudes más lentas. Las medianas son estables. Un P90 y la insignia necesitan al menos cinco pings, así que justo después de un cambio de método faltan por un tiempo.
- **Una insignia habla de un solo reloj.** "Respuesta completa más rápida" significa la mediana más baja del tiempo hasta el final de una respuesta corta, sin ningún ping cortado por el tope de tokens. No significa que empiece primero ni que sea el más rápido con respuestas largas.
- **Alcance.** Los resultados describen estas tareas, estos modelos por defecto y la ubicación de nuestro servidor. No dicen nada sobre respuestas largas, otros idiomas, herramientas ni la calidad general de un modelo.

## Límites conocidos

- Seis tareas son muy pocas, y una de ellas (la pregunta trampa) es un acertijo famoso que casi seguro está en los datos de entrenamiento, así que puede medir memoria.
- La tarea de JSON usa un esquema plano de tres claves: sirve para afirmar algo sobre salida estructurada simple y nada más amplio.
- La tarea de premisa inválida le dice al modelo qué responder si la fecha no existe, que es la versión fácil de esa prueba.
- Una respuesta o un ping cortado por un límite de tiempo (90 s por tarea, 30 s por ping), a diferencia del tope de tokens, no se marca.
- Los tiempos hasta el primer token no son comparables mientras el razonamiento se pueda apagar en unos modelos y en otros no. Los tiempos de respuesta completa tampoco: un modelo que razona lleva ese razonamiento dentro de su tiempo.
- El tope de 1.000 tokens del ping se apoya en una sola medición (2026-11-12: el proveedor que más razona usó entre 558 y 739 tokens). Es un margen, no una garantía. Los pings cortados siguen en la mediana de la fila y se cuentan a su lado; un proveedor que tenga alguno no recibe la insignia.

## Versiones del método

Todo lo que puede mover un puntaje (el tope, el razonamiento, una tarea, un evaluador, el prompt de sistema) sube la versión. El tablero solo agrega ejecuciones de la versión actual. Detalle en [CHANGELOG.md](CHANGELOG.md).

| Versión | Desde | Qué cambió |
|---|---|---|
| 1 | 2026-10 | Tope de 800 tokens de salida. Las respuestas cortadas no se registraban. |
| 2 | 2026-11-12 | Tope de 4.000 tokens; las respuestas cortadas se registran y se muestran; cada ejecución lleva su versión; el proveedor más lento corre al final. |

La versión 2 existe por un error nuestro. Con la versión 1, el tablero mostraba a un proveedor con cerca de 75%. De las 35 tareas que había respondido mal, 34 se habían detenido en el tope de 800 tokens: el modelo seguía razonando cuando se le acabaron los tokens. Con la versión 2, el mismo proveedor acierta las seis tareas.

**Versiones del ping.** El ping de latencia tiene su propia versión, con la misma regla. Versión 1 (hasta 2026-11): tope de 120 tokens, cortes sin registrar; en tres de los cuatro proveedores al menos 25 de 28 pings se habían detenido en el tope, así que su tiempo de "respuesta completa" era el tiempo hasta quedarse sin tokens. Versión 2 (2026-11-12): 400 tokens, cortes registrados, insignia y orden por la respuesta corta completa. Versión 3 (2026-11-12): 1.000 tokens, porque con 400 un proveedor seguía cortado en cinco pings de cinco. La "carrera" en vivo del sitio es una demostración aparte y conserva 120.

## Dónde están los resultados

Cada día, una tarea programada (`.github/workflows/snapshot.yml`) guarda en `results/<fecha UTC>/` tres archivos:

- `eval-leaderboard.json` y `arena-leaderboard.json`: las respuestas de los dos endpoints públicos, tal como las publicó el sitio ese día.
- `analysis.md`: el análisis de esos dos archivos. Se regenera con `node analysis/analyze-leaderboard.mjs --eval results/<fecha>/eval-leaderboard.json --arena results/<fecha>/arena-leaderboard.json`.

Una copia diaria no es una medición nueva: es el registro con fecha de lo que el sitio mostraba. La primera es `results/2026-11-12/`. Antes de esa fecha no hay historial en este repositorio. Su archivo de latencia es anterior a los cambios del ping (sin bloque `method` ni conteo de cortes). Para tomar una copia a mano: `npm run snapshot`.

## Contenido

```
src/eval-tasks.ts              tareas y evaluadores (copia literal del sitio)
src/reproduce.ts               repite las tareas con tu clave
analysis/                      script de análisis
scripts/snapshot.mjs           copia diaria de los tableros
results/                       copias con fecha y su análisis
references/                    fuentes del método y de la estadística
METHODOLOGY.md  CHANGELOG.md   método y versiones
```

## Licencia

El código usa la licencia MIT ([LICENSE](LICENSE)). Los textos y los archivos de `results/` usan CC BY 4.0 ([LICENSE-CONTENT.md](LICENSE-CONTENT.md)).
