# apps/ocr

Servicio de OCR que transcribe planillas de ajedrez manuscritas usando el modelo
de visión de Claude, con salida estructurada (JSON Schema) y un filtro de
alucinaciones mediante `python-chess`.

## Cómo funciona

`POST /analyze` recibe la imagen (multipart, campo `image`) y:

1. La envía a Claude (`claude-opus-4-8` por defecto) como bloque de imagen,
   pidiendo una transcripción fila a fila (número de jugada, blancas, negras)
   con `output_config.format` (JSON Schema) para forzar una respuesta
   estructurada — no texto libre a parsear con regex. El prompt asume que la
   mayoría de planillas estarán en español (letras de pieza R/D/T/A/C) y le
   indica explícitamente la equivalencia con las letras SAN en inglés
   (K/Q/R/B/N) — son las mismas letras con significados distintos entre
   idiomas (la "R" española es el Rey, la inglesa es la Torre), así que sin
   esta traducción explícita el modelo podría transcribir la pieza
   equivocada. El resultado que devuelve el servicio es siempre SAN en
   inglés, que es lo que esperan `python-chess` y `chess.js` río abajo.
2. Aplana las filas a una lista de jugadas (`{san, confidence}`), en el mismo
   orden que consume `apps/api` / el frontend.
3. Reproduce la secuencia con `python-chess`: la primera jugada que no es
   legal en el tablero se marca con confianza baja (probable error de lectura),
   sin intentar "arreglarla" — esa inferencia de huecos ya la hace
   `GameStateService` en el frontend, que vuelve a validar toda la secuencia.

El prompt pide explícitamente **transcribir lo que hay escrito, no inventar
una partida coherente** — es la app, no el OCR, quien debe decidir qué hacer
con una jugada ilegible.

## Desarrollo local

```bash
cd apps/ocr
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt

export ANTHROPIC_API_KEY=sk-ant-...   # o `ant auth login`
uvicorn app.main:app --reload --port 8001
```

## Variables de entorno

- `ANTHROPIC_API_KEY` — la resuelve el SDK de Anthropic automáticamente (o vía `ant auth login`).
- `CLAUDE_MODEL` — modelo a usar (por defecto `claude-opus-4-8`).

## Limitación conocida

Si la partida termina en la mitad de la última fila (blancas jugó, negras no
tuvo turno), esa celda vacía se transcribe igual que una celda ilegible y el
frontend la mostrará como un "hueco" al final de la planilla. Es un caso
límite inofensivo: no hay forma de distinguir "no hay más jugadas" de "no se
leyó la jugada" solo con la imagen.
