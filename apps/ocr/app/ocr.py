import base64
import json

from anthropic import AsyncAnthropic
from anthropic import APIStatusError

from app.chess_check import flag_implausible_moves
from app.config import get_settings
from app.schemas import OcrMoveOut

SYSTEM_PROMPT = """Eres un sistema experto en transcribir planillas de ajedrez manuscritas.

La imagen es una planilla de ajedrez: una tabla con una fila por jugada, con tres \
columnas -- numero de jugada, movimiento de blancas, movimiento de negras.

Las planillas pueden estar escritas en distintos idiomas -- la mayoria estaran en \
espanol, pero puede aparecer notacion en ingles u otro idioma. Presta MUCHA atencion \
a la letra de pieza: las mismas letras significan piezas distintas segun el idioma \
(por ejemplo, la "R" en espanol es el Rey, pero en ingles es la Torre -- confundirlas \
invierte el significado de la jugada).

PASO 1 -- determina el idioma de la planilla ANTES de transcribir ninguna jugada, \
mirando toda la imagen: encabezados de columna ("Blancas"/"Negras" vs "White"/"Black"), \
y sobre todo la presencia de letras que solo existen en una convencion (D, T, A, C \
solo existen en espanol; Q, B, N solo en ingles -- si ves cualquiera de estas letras \
en la planilla, ya sabes el idioma con certeza). Una planilla entera esta SIEMPRE en \
un unico idioma: una vez lo determines, aplica esa misma conversion a TODAS las filas, \
de la primera a la ultima. No cambies de idioma de una fila a otra ni decidas la \
pieza celda a celda -- la letra "R" por si sola es ambigua (Rey en espanol, Torre en \
ingles) y solo se puede resolver sabiendo el idioma de toda la planilla.

PASO 2 -- traduce cada letra de pieza a su equivalente en notacion algebraica \
estandar (SAN) en ingles usando la tabla de equivalencia espanol -> ingles:

  R (Rey)    -> K
  D (Dama)   -> Q
  T (Torre)  -> R
  A (Alfil)  -> B
  C (Caballo)-> N
  peon (sin letra) -> sin letra

Ejemplo: en una planilla en espanol, la jugada escrita "Rd1" es el Rey moviendo a d1 \
-> debes devolver "Kd1" (NUNCA "Rd1", que en SAN ingles significaria Torre a d1, una \
pieza distinta). De igual forma "Dxf7+" (Dama captura en f7, jaque) -> "Qxf7+".

Independientemente del idioma en el que este escrita la planilla, debes devolver \
SIEMPRE la notacion algebraica estandar (SAN) en ingles: letras de pieza en mayuscula \
(K, Q, R, B, N; los peones no llevan letra), casillas a1-h8, "x" para capturas \
(algunas planillas antiguas usan ":" -- interpretalo tambien como captura), "+" para \
jaque, "#" para jaque mate, "O-O"/"O-O-O" para enroques (o "0-0"/"0-0-0", tambien \
frecuente), y "=Q"/"=R"/etc. para coronacion.

Reglas:
- Transcribe EXACTAMENTE lo que esta escrito, incluso si el resultado no parece \
una partida legal o coherente. No completes, corrijas ni inventes jugadas que no \
puedas leer con claridad -- lo unico que traduces es la letra de pieza a su \
equivalente en ingles (segun el idioma de TODA la planilla, paso 1), nunca el resto \
del contenido de la jugada.
- Si una celda esta en blanco o es ilegible, devuelve una cadena vacia "" y \
confidence 0 para esa celda.
- confidence es un entero de 0 a 100 que refleja tu seguridad al leer la letra \
manuscrita de esa celda concreta (no si la jugada es legal o coherente).
- No inventes filas para numeros de jugada que no aparecen en la imagen.
- Devuelve todas las filas de la planilla, en orden, desde el numero de jugada 1."""

TRANSCRIPTION_SCHEMA = {
    "type": "object",
    "properties": {
        "rows": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "move_number": {"type": "integer"},
                    "white_san": {"type": "string"},
                    "white_confidence": {"type": "integer"},
                    "black_san": {"type": "string"},
                    "black_confidence": {"type": "integer"},
                },
                "required": [
                    "move_number",
                    "white_san",
                    "white_confidence",
                    "black_san",
                    "black_confidence",
                ],
                "additionalProperties": False,
            },
        },
    },
    "required": ["rows"],
    "additionalProperties": False,
}

_client = AsyncAnthropic()


class OcrServiceError(Exception):
    pass


async def transcribe_scoresheet(image_bytes: bytes, content_type: str) -> list[OcrMoveOut]:
    settings = get_settings()
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    try:
        response = await _client.messages.create(
            model=settings.claude_model,
            max_tokens=settings.max_tokens,
            thinking={"type": "adaptive"},
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": content_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": "Transcribe esta planilla de ajedrez."},
                    ],
                }
            ],
            output_config={"format": {"type": "json_schema", "schema": TRANSCRIPTION_SCHEMA}},
        )
    except APIStatusError as exc:
        raise OcrServiceError(f"El proveedor de OCR ha fallado: {exc}") from exc

    if response.stop_reason == "refusal":
        raise OcrServiceError("El modelo de OCR ha rechazado la peticion")
    if response.stop_reason == "max_tokens":
        raise OcrServiceError("La planilla es demasiado larga para transcribirla en una sola peticion")

    text = next(block.text for block in response.content if block.type == "text")
    data = json.loads(text)

    moves = _flatten_rows(data["rows"])
    return flag_implausible_moves(moves)


def _flatten_rows(rows: list[dict]) -> list[OcrMoveOut]:
    moves: list[OcrMoveOut] = []
    for row in rows:
        moves.append(OcrMoveOut(san=row["white_san"].strip(), confidence=_clamp(row["white_confidence"])))
        moves.append(OcrMoveOut(san=row["black_san"].strip(), confidence=_clamp(row["black_confidence"])))
    return moves


def _clamp(confidence: int) -> int:
    return max(0, min(100, confidence))
