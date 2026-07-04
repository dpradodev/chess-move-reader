# Pipeline de visión (`apps/ocr`)

## Enfoque

En vez de un pipeline clásico de OCR (detección de rejilla + reconocimiento de
escritura entrenado a medida), `apps/ocr` usa un modelo de visión multimodal
(Claude, `claude-opus-4-8` por defecto) con salida estructurada. Es el enfoque
más práctico sin datos de entrenamiento propios: la notación de ajedrez es un
vocabulario muy restringido (piezas K Q R B N, casillas a1-h8, x/+/#, O-O,
=Q...) y un modelo de visión generalista ya lo interpreta razonablemente bien
a partir de una foto de la planilla.

La alternativa clásica (rejilla + modelo de reconocimiento de escritura
entrenado o afinado) da más control de coste y funciona offline, pero exige
datos etiquetados y bastante más ingeniería — solo compensa si el coste/latencia
por petición del enfoque actual se vuelve un problema real en producción.

## Flujo

1. `apps/api` guarda la imagen y crea la petición de análisis (ver
   `docs/api-contract.md`).
2. `apps/api` llama a `apps/ocr` (`POST /analyze`, multipart) a través de
   `HttpOcrClient` (`apps/api/app/ocr_client.py`) — solo si `OCR_CLIENT=http`;
   por defecto se usa un mock sin coste.
3. `apps/ocr` manda la imagen a Claude pidiéndole una transcripción fila a
   fila (número de jugada, blancas, negras) en JSON, forzado por
   `output_config.format` (JSON Schema) — no hay parsing de texto libre.
4. `apps/ocr` aplana las filas a la lista de jugadas (`{san, confidence}`) y
   pasa la secuencia por `python-chess`: la primera jugada que no es legal en
   el tablero se marca con confianza baja, como señal de posible alucinación
   del modelo (ver `apps/ocr/app/chess_check.py`).
5. `apps/api` guarda las jugadas en `analysis_moves` y calcula agregados
   (jugadas detectadas, huecos, confianza media).
6. El frontend (`GameStateService.loadOcrMoves`) hace su propia validación
   completa con `chess.js`: intenta inferir huecos a partir de la siguiente
   notación conocida, y marca como `unvalidated` todo lo posterior a un hueco
   que no se pudo inferir.

## Por qué la validación está repartida en dos sitios

`apps/ocr` solo hace una comprobación mínima de un solo paso (sin intentar
recuperarse tras el primer fallo) — su objetivo es señalar una alucinación
obvia, no resolver huecos. La lógica completa de inferencia, revalidación en
cascada y estados (`gap`/`inferred`/`unvalidated`/`manual`) vive en el
frontend porque está atada a la edición interactiva de la planilla — duplicarla
en el servicio de OCR sería reinventar esa misma máquina de estados sin
ganar nada.

## Prompt

El prompt (`apps/ocr/app/ocr.py`) insiste explícitamente en que el modelo
transcriba **lo que hay escrito, no una partida coherente** — si se le deja
"corregir" jugadas ilegibles hacia algo plausible, se pierde exactamente la
señal de incertidumbre que el resto del pipeline necesita para mostrar huecos
editables en vez de datos inventados.

**Idioma de la planilla.** Las planillas de ajedrez escritas a mano usan letras
de pieza distintas según el idioma, y esas letras pueden colisionar entre sí:
en español R = Rey, pero en la notación SAN en inglés que usa el resto del
pipeline (`python-chess`, `chess.js`) R = Torre. Sin una instrucción explícita,
el modelo podría transcribir literalmente la letra española y el resto del
sistema la interpretaría como una pieza completamente distinta, sin dar ningún
error visible. El prompt incluye la tabla de equivalencia español→inglés
(R→K, D→Q, T→R, A→B, C→N) y pide devolver siempre SAN en inglés, traduciendo
solo la letra de pieza — nunca el resto de la jugada.

## Limitaciones conocidas

- Si la partida termina a mitad de la última fila, la celda vacía de negras
  se transcribe igual que una celda ilegible — no hay forma de distinguir
  "no hay más jugadas" de "no se leyó" solo con la imagen. El frontend lo
  muestra como un hueco final inofensivo.
- El filtro de `python-chess` en `apps/ocr` es de un solo paso: no reintenta
  ni infiere después del primer fallo. Es deliberado (ver arriba), pero
  significa que una alucinación a mitad de partida no "envenena" la validación
  de las jugadas siguientes en el servicio de OCR — esa responsabilidad es del
  frontend.
