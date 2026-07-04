import chess

from app.schemas import OcrMoveOut


def flag_implausible_moves(moves: list[OcrMoveOut]) -> list[OcrMoveOut]:
    """One-shot legality check against a fresh board.

    Caps the confidence of the first transcribed move that doesn't parse as
    legal — a signal that the model likely misread the handwriting. Does not
    attempt gap-inference or recovery past that point; that logic already
    lives in GameStateService on the frontend, which re-validates the full
    sequence anyway.
    """
    board = chess.Board()
    result: list[OcrMoveOut] = []
    stop_checking = False

    for move in moves:
        if stop_checking or not move.san:
            result.append(move)
            continue
        try:
            board.push_san(move.san)
            result.append(move)
        except ValueError:
            result.append(OcrMoveOut(san=move.san, confidence=min(move.confidence, 15)))
            stop_checking = True

    return result
